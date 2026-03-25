import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import labBackground from '../assets/lab.png';

const PAGE_SIZE = 10;

const FILTER_OPTIONS = ['ALL', 'PENDING', 'SAFE', 'BIO-HAZARD'];

const LabDashboard = () => {
    const navigate = useNavigate();
    const [pendingBags, setPendingBags]         = useState([]);
    const [loading, setLoading]                 = useState(true);
    const [processingId, setProcessingId]       = useState(null);
    const [activeTestBagId, setActiveTestBagId] = useState(null);
    const [testForm, setTestForm]               = useState({ hiv: false, hep: false, malaria: false, reason: '' });
    const [labResultsByBag, setLabResultsByBag] = useState({});
    const [historyLoadingBagId, setHistoryLoadingBagId] = useState(null);
    const [expandedHistory, setExpandedHistory] = useState({});

    // Search & filter
    const [searchText,    setSearchText]    = useState('');
    const [activeFilter,  setActiveFilter]  = useState('ALL');
    const [visibleCount,  setVisibleCount]  = useState(PAGE_SIZE);

    const fetchPendingBags = () => {
        setLoading(true);
        api.get('/api/inventory')
            .then(res => { setPendingBags(res.data || []); setLoading(false); })
            .catch(err => { console.error('Error fetching inventory', err); setPendingBags([]); setLoading(false); });
    };

    useEffect(() => { fetchPendingBags(); }, []);

    const sortedBags = useMemo(() => {
        return [...pendingBags].sort((a, b) => {
            const ta = a.collectedAt ? new Date(a.collectedAt).getTime() : 0;
            const tb = b.collectedAt ? new Date(b.collectedAt).getTime() : 0;
            return tb - ta;
        });
    }, [pendingBags]);

    // Apply filter + search
    const filteredBags = useMemo(() => {
        return sortedBags.filter(bag => {
            // Safety filter
            if (activeFilter !== 'ALL') {
                const ts  = (bag.testStatus  || '').toUpperCase();
                const sf  = (bag.safetyFlag  || '').toUpperCase();
                if (activeFilter === 'PENDING'    && ts  !== 'PENDING')     return false;
                if (activeFilter === 'SAFE'        && ts  !== 'TESTED_SAFE') return false;
                if (activeFilter === 'BIO-HAZARD'  && sf  !== 'BIO-HAZARD')  return false;
            }
            // Search
            if (searchText) {
                const s = searchText.toLowerCase();
                const matches =
                    String(bag.id).includes(s) ||
                    (bag.bloodType   || '').toLowerCase().includes(s) ||
                    (bag.donorName   || '').toLowerCase().includes(s) ||
                    (bag.testStatus  || '').toLowerCase().includes(s) ||
                    (bag.safetyFlag  || '').toLowerCase().includes(s);
                if (!matches) return false;
            }
            return true;
        });
    }, [sortedBags, activeFilter, searchText]);

    const resetTestForm = () => setTestForm({ hiv: false, hep: false, malaria: false, reason: '' });
    const openTestPanel  = (bagId) => { setActiveTestBagId(bagId); resetTestForm(); };
    const closeTestPanel = ()      => { setActiveTestBagId(null);  resetTestForm(); };

    const fetchLabHistory = async (bagId) => {
        setHistoryLoadingBagId(bagId);
        try {
            const res = await api.get(`/api/inventory/${bagId}/lab-results`);
            setLabResultsByBag(prev => ({ ...prev, [bagId]: res.data || [] }));
        } catch (err) {
            console.error('Failed to fetch lab history', err);
            setLabResultsByBag(prev => ({ ...prev, [bagId]: [] }));
        } finally {
            setHistoryLoadingBagId(null);
        }
    };

    const toggleHistory = async (bagId) => {
        const nextExpanded = !expandedHistory[bagId];
        setExpandedHistory(prev => ({ ...prev, [bagId]: nextExpanded }));
        if (nextExpanded && !labResultsByBag[bagId]) await fetchLabHistory(bagId);
    };

    const handleSubmitTestResult = async (bagId) => {
        const hasPositive   = testForm.hiv || testForm.hep || testForm.malaria;
        const trimmedReason = (testForm.reason || '').trim();
        if (hasPositive && !trimmedReason) { alert('Please provide a reason for a positive result.'); return; }
        setProcessingId(bagId);
        try {
            await api.put(`/api/inventory/${bagId}/test`, {
                hiv: testForm.hiv, hep: testForm.hep, malaria: testForm.malaria, reason: trimmedReason
            });
            closeTestPanel();
            fetchPendingBags();
            fetchLabHistory(bagId);
        } catch (err) { console.error(err); alert('Failed to update lab result.'); }
        finally { setProcessingId(null); }
    };

    const visibleBags = filteredBags.slice(0, visibleCount);

    return (
        <div style={{ minHeight: '100vh', width: '100%', backgroundColor: '#F0F4FF', position: 'relative' }}>
            <div
                aria-hidden="true"
                style={{
                    position: 'fixed', inset: 0,
                    backgroundImage: `linear-gradient(rgba(240, 244, 255, 0.72), rgba(255, 228, 230, 0.72)), url(${labBackground})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat', pointerEvents: 'none', zIndex: 0
                }}
            />
            <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: '2rem', paddingBottom: '2rem' }}>
                <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Lab Dashboard</h1>
                        <p style={{ color: 'var(--text-muted)' }}>
                            Completed donations arrive here first for lab screening before entering inventory.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn btn-primary" onClick={fetchPendingBags}>Refresh</button>
                        <button className="btn" style={{ border: '1px solid #E2E8F0' }} onClick={() => navigate(-1)}>← Back</button>
                    </div>
                </header>

                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    {/* Search bar */}
                    <input
                        type="text"
                        value={searchText}
                        onChange={e => { setSearchText(e.target.value); setVisibleCount(PAGE_SIZE); }}
                        placeholder="Search by Bag ID, blood type, donor name…"
                        style={{
                            width: '100%', padding: '0.5rem 0.85rem', borderRadius: '8px',
                            border: '1px solid #CBD5E1', fontSize: '0.875rem',
                            marginBottom: '0.75rem', outline: 'none',
                            background: 'rgba(255,255,255,0.85)'
                        }}
                    />

                    {/* Filter buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        {FILTER_OPTIONS.map(f => {
                            const active = activeFilter === f;
                            const colors = {
                                ALL:         { bg: active ? '#1D4ED8' : '#EFF6FF', text: active ? 'white' : '#1D4ED8', border: '#BFDBFE' },
                                PENDING:     { bg: active ? '#1E40AF' : '#DBEAFE', text: active ? 'white' : '#1E40AF', border: '#93C5FD' },
                                SAFE:        { bg: active ? '#065F46' : '#D1FAE5', text: active ? 'white' : '#065F46', border: '#6EE7B7' },
                                'BIO-HAZARD':{ bg: active ? '#991B1B' : '#FEE2E2', text: active ? 'white' : '#991B1B', border: '#FCA5A5' },
                            }[f] || {};
                            return (
                                <button
                                    key={f}
                                    onClick={() => { setActiveFilter(f); setVisibleCount(PAGE_SIZE); }}
                                    style={{
                                        padding: '0.3rem 0.9rem', borderRadius: '9999px',
                                        border: `1.5px solid ${colors.border}`,
                                        background: colors.bg, color: colors.text,
                                        fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer'
                                    }}
                                >
                                    {f}
                                </button>
                            );
                        })}
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: '0.5rem' }}>
                            {filteredBags.length} result{filteredBags.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {loading && <div style={{ color: 'var(--text-muted)' }}>Loading lab queue...</div>}
                    {!loading && filteredBags.length === 0 && (
                        <div style={{ color: 'var(--text-muted)' }}>No blood bags match your search/filter.</div>
                    )}

                    {!loading && filteredBags.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {visibleBags.map((bag) => (
                                <div key={bag.id} className="glass-panel" style={{
                                    padding: '1rem',
                                    borderLeft: bag.testStatus === 'PENDING'
                                        ? '4px solid #3B82F6'
                                        : (bag.testStatus === 'TESTED_SAFE' ? '4px solid #10B981' : '4px solid #EF4444')
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div>
                                            <div style={{ fontWeight: '600' }}>
                                                Bag #{bag.id} • {bag.bloodType}
                                                <span style={{
                                                    marginLeft: '0.5rem', fontSize: '0.75rem',
                                                    padding: '0.1rem 0.4rem', borderRadius: '4px',
                                                    background: bag.testStatus === 'PENDING' ? '#DBEAFE' : (bag.testStatus === 'TESTED_SAFE' ? '#D1FAE5' : '#FEE2E2'),
                                                    color: bag.testStatus === 'PENDING' ? '#1E40AF' : (bag.testStatus === 'TESTED_SAFE' ? '#065F46' : '#991B1B')
                                                }}>
                                                    {bag.testStatus}
                                                </span>
                                                {bag.safetyFlag === 'BIO-HAZARD' && (
                                                    <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: '#FEE2E2', color: '#991B1B' }}>
                                                        ☣ BIO-HAZARD
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                Donor: {bag.donorName || 'Unknown'} • Collected: {bag.collectedAt ? new Date(bag.collectedAt).toLocaleString() : 'Unknown'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            {bag.testStatus === 'PENDING' && (
                                                <button
                                                    className="btn"
                                                    style={{ border: '1px solid #BFDBFE', color: '#1D4ED8' }}
                                                    disabled={processingId === bag.id}
                                                    onClick={() => openTestPanel(bag.id)}
                                                >
                                                    {processingId === bag.id ? 'Processing...' : 'Run Test'}
                                                </button>
                                            )}
                                            <button
                                                className="btn"
                                                style={{ border: '1px solid #E2E8F0' }}
                                                onClick={() => toggleHistory(bag.id)}
                                            >
                                                {expandedHistory[bag.id] ? 'Hide History' : 'View History'}
                                            </button>
                                        </div>
                                    </div>

                                    {activeTestBagId === bag.id && (
                                        <div style={{ marginTop: '0.9rem', borderTop: '1px solid #E5E7EB', paddingTop: '0.9rem' }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.6rem' }}>Record Lab Markers</div>
                                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                                                {[['hiv', 'HIV Positive'], ['hep', 'Hepatitis Positive'], ['malaria', 'Malaria Positive']].map(([key, label]) => (
                                                    <label key={key} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                                        <input type="checkbox" checked={testForm[key]} onChange={e => setTestForm(prev => ({ ...prev, [key]: e.target.checked }))} />
                                                        {label}
                                                    </label>
                                                ))}
                                            </div>
                                            <textarea
                                                rows={2}
                                                placeholder="Reason (required if any marker is positive)"
                                                value={testForm.reason}
                                                onChange={e => setTestForm(prev => ({ ...prev, reason: e.target.value }))}
                                                style={{ width: '100%', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0.6rem', resize: 'vertical', marginBottom: '0.6rem' }}
                                            />
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className="btn btn-primary" disabled={processingId === bag.id} onClick={() => handleSubmitTestResult(bag.id)}>
                                                    {processingId === bag.id ? 'Saving...' : 'Save Result'}
                                                </button>
                                                <button className="btn" style={{ border: '1px solid #E2E8F0' }} onClick={closeTestPanel}>Cancel</button>
                                            </div>
                                        </div>
                                    )}

                                    {expandedHistory[bag.id] && (
                                        <div style={{ marginTop: '0.9rem', borderTop: '1px solid #E5E7EB', paddingTop: '0.9rem' }}>
                                            {historyLoadingBagId === bag.id && <div style={{ color: 'var(--text-muted)' }}>Loading history...</div>}
                                            {historyLoadingBagId !== bag.id && (!labResultsByBag[bag.id] || labResultsByBag[bag.id].length === 0) && (
                                                <div style={{ color: 'var(--text-muted)' }}>No lab test history for this bag.</div>
                                            )}
                                            {historyLoadingBagId !== bag.id && labResultsByBag[bag.id]?.length > 0 && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                                    {labResultsByBag[bag.id].map(row => (
                                                        <div key={row.id} style={{ fontSize: '0.86rem', color: '#334155', background: '#F8FAFC', borderRadius: '8px', padding: '0.55rem 0.65rem' }}>
                                                            <div style={{ fontWeight: 600 }}>{row.overallResult} • {row.testedAt ? new Date(row.testedAt).toLocaleString() : 'Unknown time'}</div>
                                                            <div>HIV: {row.hivPositive ? 'Positive' : 'Negative'} | HEP: {row.hepPositive ? 'Positive' : 'Negative'} | MAL: {row.malariaPositive ? 'Positive' : 'Negative'}</div>
                                                            {row.reason && <div>Reason: {row.reason}</div>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Show More / Show Less */}
                    {filteredBags.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
                            {visibleCount < filteredBags.length && (
                                <button className="btn" style={{ border: '1px solid #CBD5E1', fontSize: '0.8rem' }} onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>
                                    Show More ({filteredBags.length - visibleCount} remaining)
                                </button>
                            )}
                            {visibleCount > PAGE_SIZE && (
                                <button className="btn" style={{ border: '1px solid #CBD5E1', fontSize: '0.8rem' }} onClick={() => setVisibleCount(PAGE_SIZE)}>
                                    Show Less
                                </button>
                            )}
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Showing {Math.min(visibleCount, filteredBags.length)} of {filteredBags.length}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LabDashboard;
