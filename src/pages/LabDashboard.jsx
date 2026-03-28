import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import labBackground from '../assets/lab.png';
import { Clock, ShieldCheck, Biohazard, FlaskConical, History, Save, Printer, Search, Activity, CheckSquare, Layers } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirmDialog } from '../context/ConfirmDialogContext';

const PAGE_SIZE = 10;
const FILTER_OPTIONS = ['ALL', 'PENDING', 'SAFE', 'BIO-HAZARD'];

const printBagLabel = (bag, showToast) => {
    const printWindow = window.open('', '_blank', 'width=420,height=500');
    if (!printWindow) {
        showToast({ type: 'error', title: 'Popup blocked', message: 'Please allow popups to print labels.' });
        return;
    }

    const expiryDate = bag.collectedAt 
        ? new Date(new Date(bag.collectedAt).getTime() + 42 * 24 * 60 * 60 * 1000).toLocaleDateString() 
        : 'Unknown';
    const collectedDate = bag.collectedAt 
        ? new Date(bag.collectedAt).toLocaleDateString() 
        : 'Unknown';

    const html = `
        <html>
            <head>
                <title>Print Label - Bag #${bag.id}</title>
                <style>
                    html, body {
                        width: 100%; height: 100%; margin: 0; padding: 0;
                    }
                    body {
                        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                        display: flex; justify-content: center; align-items: center; color: #000;
                        background: #f0f0f0;
                    }
                    .label-container {
                        border: 2px solid #000; width: 340px; height: 320px; padding: 15px;
                        border-radius: 8px; background: #fff; box-sizing: border-box;
                        display: flex; flex-direction: column; justify-content: space-between;
                    }
                    .header {
                        text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; 
                        font-weight: bold; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 1px;
                    }
                    .blood-type {
                        font-size: 3.5rem; font-weight: 900; text-align: center; margin: 0;
                        border: 3px solid #000; border-radius: 8px; padding: 2px;
                    }
                    .details-grid {
                        display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem;
                    }
                    .detail-box {
                        border: 1px solid #000; padding: 4px 6px; border-radius: 4px;
                    }
                    .detail-label {
                        font-size: 0.6rem; color: #444; text-transform: uppercase; font-weight: 600;
                    }
                    .detail-value {
                        font-weight: bold; margin-top: 2px; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                    }
                    .detail-value.compact {
                        font-size: 0.72rem;
                        line-height: 1.2;
                    }
                    .status-value {
                        font-size: 0.74rem;
                        line-height: 1.2;
                        word-break: break-word;
                    }
                    .barcode-placeholder {
                        text-align: center; border-top: 2px dashed #000; padding-top: 8px;
                    }
                    .barcode-bars {
                        font-family: monospace; font-size: 1.35rem; letter-spacing: 2px; font-weight: bold;
                        line-height: 1;
                    }
                    .barcode-id {
                        font-size: 0.72rem; margin-top: 6px; font-weight: 600;
                    }
                    @page {
                        size: 4in 4.5in;
                        margin: 0;
                    }
                    @media print {
                        body { background: #fff; align-items: flex-start; padding: 0.1in; box-sizing: border-box; }
                        .label-container { width: 100%; height: 100%; }
                    }
                </style>
            </head>
            <body>
                <div class="label-container">
                    <div class="header">LIFELINE BLOOD BANK</div>
                    <div class="blood-type">${bag.bloodType}</div>
                    
                    <div class="details-grid">
                        <div class="detail-box">
                            <div class="detail-label">Bag ID</div>
                            <div class="detail-value compact">#${bag.id}</div>
                        </div>
                        <div class="detail-box">
                            <div class="detail-label">Status</div>
                            <div class="detail-value status-value">${bag.testStatus}</div>
                        </div>
                        <div class="detail-box">
                            <div class="detail-label">Collected</div>
                            <div class="detail-value">${collectedDate}</div>
                        </div>
                        <div class="detail-box">
                            <div class="detail-label">Expires</div>
                            <div class="detail-value">${expiryDate}</div>
                        </div>
                    </div>

                    <div class="detail-box">
                        <div class="detail-label">Donor Name</div>
                        <div class="detail-value">${bag.donorName || 'Unknown Donor'}</div>
                    </div>
                    
                    <div class="barcode-placeholder">
                        <div class="barcode-bars">|| | ||| | || | |||</div>
                        <div class="barcode-id">*${bag.id}*</div>
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function(){ window.close(); }, 500);
                    };
                </script>
            </body>
        </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
};

const LabDashboard = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { confirm } = useConfirmDialog();
    const [pendingBags, setPendingBags]         = useState([]);
    const [loading, setLoading]                 = useState(true);
    const [processingId, setProcessingId]       = useState(null);
    const [batchProcessing, setBatchProcessing] = useState(false);
    
    // Batch processing
    const [selectedBags, setSelectedBags]       = useState([]);

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
            if (activeFilter !== 'ALL') {
                const ts  = (bag.testStatus  || '').toUpperCase();
                const sf  = (bag.safetyFlag  || '').toUpperCase();
                if (activeFilter === 'PENDING'    && ts  !== 'PENDING')     return false;
                if (activeFilter === 'SAFE'        && ts  !== 'TESTED_SAFE') return false;
                if (activeFilter === 'BIO-HAZARD'  && sf  !== 'BIO-HAZARD')  return false;
            }
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

    // Analytics computation
    const analytics = useMemo(() => {
        let pending = 0;
        let safeToday = 0;
        let discarded = 0;

        pendingBags.forEach(bag => {
            const status = (bag.testStatus || '').toUpperCase();
            if (status === 'PENDING') pending++;
            else if (status === 'TESTED_SAFE') safeToday++; 
            
            if ((bag.safetyFlag || '').toUpperCase() === 'BIO-HAZARD') discarded++;
        });
        return { pending, safeToday, discarded };
    }, [pendingBags]);

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
        if (hasPositive && !trimmedReason) {
            showToast({ type: 'error', title: 'Reason required', message: 'Please provide a reason for a positive result.' });
            return;
        }
        setProcessingId(bagId);
        try {
            await api.put(`/api/inventory/${bagId}/test`, {
                hiv: testForm.hiv, hep: testForm.hep, malaria: testForm.malaria, reason: trimmedReason || 'Routine Safe'
            });
            closeTestPanel();
            fetchPendingBags();
            fetchLabHistory(bagId);
            showToast({ type: 'success', title: 'Lab result saved', message: `Blood bag #${bagId} was updated successfully.` });
        } catch (err) { console.error(err); showToast({ type: 'error', title: 'Update failed', message: 'Failed to update lab result.' }); }
        finally { setProcessingId(null); }
    };

    const handleBatchMarkSafe = async () => {
        if (selectedBags.length === 0) return;
        const confirmed = await confirm({
            title: 'Mark bags as safe?',
            message: `Are you sure you want to mark ${selectedBags.length} bag(s) as TESTED_SAFE?`,
            confirmLabel: 'Mark as Safe'
        });
        if (!confirmed) return;

        setBatchProcessing(true);
        try {
            // Run tests concurrently
            await Promise.all(selectedBags.map(bagId => 
                api.put(`/api/inventory/${bagId}/test`, {
                    hiv: false, hep: false, malaria: false, reason: 'Batch marked as SAFE'
                })
            ));
            showToast({ type: 'success', title: 'Batch update complete', message: `Successfully marked ${selectedBags.length} bag(s) as safe.` });
            setSelectedBags([]);
            fetchPendingBags();
        } catch (err) {
            console.error(err);
            showToast({ type: 'error', title: 'Batch update failed', message: 'Some bags may not have been updated.' });
        } finally {
            setBatchProcessing(false);
        }
    };

    const handleToggleSelectBag = (bagId) => {
        setSelectedBags(prev => 
            prev.includes(bagId) ? prev.filter(id => id !== bagId) : [...prev, bagId]
        );
    };

    const toggleSelectAllPending = () => {
        if (selectedBags.length === pendingInView) {
            setSelectedBags([]);
        } else {
            setSelectedBags(filteredBags.filter(b => b.testStatus === 'PENDING').map(b => b.id));
        }
    };

    const visibleBags = filteredBags.slice(0, visibleCount);
    const pendingInView = filteredBags.filter(b => b.testStatus === 'PENDING').length;

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
                <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <FlaskConical size={32} color="#2563EB" /> Lab Dashboard
                        </h1>
                        <p style={{ color: 'var(--text-muted)' }}>
                            Completed donations arrive here first for lab screening before entering inventory.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn btn-primary" onClick={fetchPendingBags}>Refresh Data</button>
                        <button className="btn" style={{ border: '1px solid #E2E8F0', background: 'white' }} onClick={() => navigate(-1)}>← Back</button>
                    </div>
                </header>

                {/* ── Analytics Widget ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #3B82F6' }}>
                        <div style={{ background: '#EFF6FF', padding: '0.75rem', borderRadius: '50%', color: '#3B82F6' }}><Clock size={24} /></div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1E3A8A' }}>{analytics.pending}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pending Tests</div>
                        </div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #10B981' }}>
                        <div style={{ background: '#ECFDF5', padding: '0.75rem', borderRadius: '50%', color: '#10B981' }}><ShieldCheck size={24} /></div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#065F46' }}>{analytics.safeToday}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Safe Blood</div>
                        </div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #EF4444' }}>
                        <div style={{ background: '#FEF2F2', padding: '0.75rem', borderRadius: '50%', color: '#EF4444' }}><Biohazard size={24} /></div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#991B1B' }}>{analytics.discarded}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Bio-Hazard Discards</div>
                        </div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    {/* Search & Action Bar */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        <div style={{ position: 'relative', flex: '1 1 300px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                value={searchText}
                                onChange={e => { setSearchText(e.target.value); setVisibleCount(PAGE_SIZE); }}
                                placeholder="Search Bag ID, blood type, donor name…"
                                style={{
                                    width: '100%', padding: '0.65rem 1rem 0.65rem 2.75rem', borderRadius: '12px',
                                    border: '1px solid #CBD5E1', fontSize: '0.9rem', outline: 'none',
                                    background: 'rgba(255,255,255,0.9)', transition: 'border-color 0.2s'
                                }}
                                onFocus={e => e.target.style.borderColor = '#3B82F6'}
                                onBlur={e => e.target.style.borderColor = '#CBD5E1'}
                            />
                        </div>
                        {activeFilter === 'PENDING' && pendingInView > 0 && (
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <button className="btn" style={{ border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={toggleSelectAllPending}>
                                    <CheckSquare size={16} /> {selectedBags.length === pendingInView ? 'Deselect All' : 'Select All'}
                                </button>
                                {selectedBags.length > 0 && (
                                    <button 
                                        className="btn btn-primary" 
                                        onClick={handleBatchMarkSafe} 
                                        disabled={batchProcessing}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#10B981', borderColor: '#10B981' }}
                                    >
                                        <ShieldCheck size={16} /> {batchProcessing ? 'Processing...' : `Mark ${selectedBags.length} Safe`}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Filter Tabs */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem' }}>
                        {FILTER_OPTIONS.map(f => {
                            const active = activeFilter === f;
                            return (
                                <button
                                    key={f}
                                    onClick={() => { setActiveFilter(f); setVisibleCount(PAGE_SIZE); setSelectedBags([]); }}
                                    style={{
                                        padding: '0.5rem 1rem', borderRadius: '8px 8px 0 0',
                                        border: 'none',
                                        borderBottom: active ? '3px solid #2563EB' : '3px solid transparent',
                                        background: active ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                                        color: active ? '#1E3A8A' : 'var(--text-muted)',
                                        fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {f === 'ALL' && <Layers size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />}
                                    {f === 'PENDING' && <Clock size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />}
                                    {f === 'SAFE' && <ShieldCheck size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />}
                                    {f === 'BIO-HAZARD' && <Biohazard size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />}
                                    {f}
                                </button>
                            );
                        })}
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 'auto' }}>
                            {filteredBags.length} bag{filteredBags.length !== 1 ? 's' : ''} found
                        </span>
                    </div>

                    {loading && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}><Activity size={24} style={{ margin: '0 auto', marginBottom: '1rem', color: '#3B82F6' }} /> Loading lab queue...</div>}
                    {!loading && filteredBags.length === 0 && (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.5)', borderRadius: '12px' }}>
                            <FlaskConical size={48} color="#CBD5E1" style={{ margin: '0 auto', marginBottom: '1rem' }} />
                            No blood bags match your current filters.
                        </div>
                    )}

                    {!loading && filteredBags.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {visibleBags.map((bag) => {
                                const isPending = bag.testStatus === 'PENDING';
                                const isSafe = bag.testStatus === 'TESTED_SAFE';
                                const isSelected = selectedBags.includes(bag.id);
                                
                                return (
                                <div key={bag.id} className="glass-panel" style={{
                                    padding: '1.25rem',
                                    transition: 'all 0.2s',
                                    border: isSelected ? '2px solid #3B82F6' : '1px solid rgba(255,255,255,0.8)',
                                    borderLeft: isPending ? '4px solid #3B82F6' : (isSafe ? '4px solid #10B981' : '4px solid #EF4444'),
                                    background: isSelected ? 'rgba(239, 246, 255, 0.8)' : undefined
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            {activeFilter === 'PENDING' && isPending && (
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected}
                                                    onChange={() => handleToggleSelectBag(bag.id)}
                                                    style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                                                />
                                            )}
                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    Bag #{bag.id} <span style={{ color: '#E11D48' }}>• {bag.bloodType}</span>
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                                        marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: '700',
                                                        padding: '0.2rem 0.5rem', borderRadius: '6px',
                                                        background: isPending ? '#DBEAFE' : (isSafe ? '#D1FAE5' : '#FEE2E2'),
                                                        color: isPending ? '#1E40AF' : (isSafe ? '#065F46' : '#991B1B')
                                                    }}>
                                                        {isPending ? <Clock size={12}/> : (isSafe ? <ShieldCheck size={12}/> : <Biohazard size={12}/>)}
                                                        {bag.testStatus}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                                                    <span style={{ fontWeight: '500' }}>Donor:</span> {bag.donorName || 'Unknown'} <span style={{ margin: '0 0.5rem' }}>|</span> 
                                                    <span style={{ fontWeight: '500' }}>Collected:</span> {bag.collectedAt ? new Date(bag.collectedAt).toLocaleString() : 'Unknown'}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            {!isPending && (
                                                <button
                                                    className="btn"
                                                    style={{
                                                        border: `1px solid ${isSafe ? '#10B981' : '#EF4444'}`,
                                                        color: isSafe ? '#065F46' : '#991B1B',
                                                        background: isSafe ? '#ECFDF5' : '#FEF2F2',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.4rem'
                                                    }}
                                                    onClick={() => printBagLabel(bag, showToast)}
                                                >
                                                    <Printer size={16} /> Print Label
                                                </button>
                                            )}
                                            {isPending && (
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                                    disabled={processingId === bag.id}
                                                    onClick={() => activeTestBagId === bag.id ? closeTestPanel() : openTestPanel(bag.id)}
                                                >
                                                    <FlaskConical size={16} /> {processingId === bag.id ? 'Processing...' : 'Run Test'}
                                                </button>
                                            )}
                                            <button
                                                className="btn"
                                                style={{ border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '0.4rem', background: expandedHistory[bag.id] ? '#F3F4F6' : 'white' }}
                                                onClick={() => toggleHistory(bag.id)}
                                            >
                                                <History size={16} /> {expandedHistory[bag.id] ? 'Hide History' : 'View History'}
                                            </button>
                                        </div>
                                    </div>

                                    {activeTestBagId === bag.id && (
                                        <div style={{ marginTop: '1.25rem', borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem', animation: 'fadeIn 0.3s ease' }}>
                                            <div style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', color: '#1E293B' }}>Record Lab Markers</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                                                {[['hiv', 'HIV Positive'], ['hep', 'Hepatitis Positive'], ['malaria', 'Malaria Positive']].map(([key, label]) => (
                                                    <label key={key} style={{ 
                                                        display: 'flex', gap: '0.6rem', alignItems: 'center', 
                                                        background: testForm[key] ? '#FEE2E2' : '#F8FAFC', 
                                                        border: testForm[key] ? '1px solid #FCA5A5' : '1px solid #E2E8F0',
                                                        padding: '0.75rem', borderRadius: '8px', cursor: 'pointer',
                                                        transition: 'all 0.2s', fontWeight: testForm[key] ? '600' : '400',
                                                        color: testForm[key] ? '#991B1B' : '#334155'
                                                    }}>
                                                        <input type="checkbox" checked={testForm[key]} onChange={e => setTestForm(prev => ({ ...prev, [key]: e.target.checked }))} style={{ width: '1.1rem', height: '1.1rem' }} />
                                                        {label}
                                                    </label>
                                                ))}
                                            </div>
                                            <textarea
                                                rows={2}
                                                placeholder="Remarks (required if marking any positive marker)"
                                                value={testForm.reason}
                                                onChange={e => setTestForm(prev => ({ ...prev, reason: e.target.value }))}
                                                style={{ width: '100%', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0.75rem', resize: 'vertical', marginBottom: '1rem', outline: 'none', background: 'white' }}
                                                onFocus={e => e.target.style.borderColor = '#3B82F6'}
                                                onBlur={e => e.target.style.borderColor = '#CBD5E1'}
                                            />
                                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                                <button className="btn" style={{ border: '1px solid #E2E8F0' }} onClick={closeTestPanel}>Cancel</button>
                                                <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} disabled={processingId === bag.id} onClick={() => handleSubmitTestResult(bag.id)}>
                                                    <Save size={16} /> {processingId === bag.id ? 'Saving...' : 'Save Result'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {expandedHistory[bag.id] && (
                                        <div style={{ marginTop: '1.25rem', borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem', background: '#F8FAFC', padding: '1rem', borderRadius: '8px' }}>
                                            {historyLoadingBagId === bag.id && <div style={{ color: 'var(--text-muted)' }}><Activity size={16} /> Loading history...</div>}
                                            {historyLoadingBagId !== bag.id && (!labResultsByBag[bag.id] || labResultsByBag[bag.id].length === 0) && (
                                                <div style={{ color: 'var(--text-muted)' }}>No lab test history found.</div>
                                            )}
                                            {historyLoadingBagId !== bag.id && labResultsByBag[bag.id]?.length > 0 && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                    {labResultsByBag[bag.id].map((row, i) => (
                                                        <div key={row.id || i} style={{ fontSize: '0.86rem', color: '#334155', borderLeft: '3px solid #CBD5E1', paddingLeft: '0.75rem' }}>
                                                            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <Clock size={12} /> {row.testedAt ? new Date(row.testedAt).toLocaleString() : 'Unknown time'}
                                                            </div>
                                                            <div style={{ marginTop: '0.2rem' }}>
                                                                Result: <span style={{ fontWeight: 600, color: row.overallResult === 'TESTED_SAFE' ? '#065F46' : '#991B1B' }}>{row.overallResult}</span>
                                                            </div>
                                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                                                                HIV: {row.hivPositive ? 'POS' : 'NEG'} • HEP: {row.hepPositive ? 'POS' : 'NEG'} • MAL: {row.malariaPositive ? 'POS' : 'NEG'}
                                                            </div>
                                                            {row.positiveMarkers?.length > 0 && (
                                                                <div style={{ marginTop: '0.2rem', fontSize: '0.8rem', color: '#991B1B', fontWeight: 600 }}>
                                                                    Positive findings: {row.positiveMarkers.join(', ')}
                                                                </div>
                                                            )}
                                                            {row.reason && <div style={{ marginTop: '0.25rem', fontStyle: 'italic', color: '#475569' }}>Note: {row.reason}</div>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )})}
                        </div>
                    )}

                    {/* Show More / Show Less */}
                    {filteredBags.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', alignItems: 'center', justifyContent: 'center' }}>
                            {visibleCount < filteredBags.length && (
                                <button className="btn" style={{ border: '1px solid #CBD5E1', fontSize: '0.85rem' }} onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>
                                    Load More Results ({filteredBags.length - visibleCount} remaining)
                                </button>
                            )}
                            {visibleCount > PAGE_SIZE && (
                                <button className="btn" style={{ border: '1px solid #CBD5E1', fontSize: '0.85rem' }} onClick={() => setVisibleCount(PAGE_SIZE)}>
                                    Collapse View
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LabDashboard;
