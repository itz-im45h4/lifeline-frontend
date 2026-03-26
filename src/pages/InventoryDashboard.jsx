import React, { useMemo, useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import inventoryBackground from '../assets/inventory.png';
import { AlertCircle, AlertTriangle, CheckCircle, Flame, Package, Activity, Clock } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import FeedbackState from '../components/FeedbackState';
import StatusBadge from '../components/StatusBadge';


const PAGE_SIZE = 10;

// ---- Search bar component (defined at module scope to keep a stable reference) ----
const SearchBar = ({ value, onChange, placeholder }) => (
    <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'Search\u2026'}
        style={{
            width: '100%',
            padding: '0.5rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid #CBD5E1',
            fontSize: '0.875rem',
            marginBottom: '0.75rem',
            outline: 'none',
            background: 'rgba(255,255,255,0.85)'
        }}
    />
);

const ShowMore = ({ shown, total, onMore, onReset }) => {
    if (total === 0) return null;
    return (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
            {shown < total && (
                <button className="btn" style={{ border: '1px solid #CBD5E1', fontSize: '0.8rem' }} onClick={onMore}>
                    Show More ({total - shown} remaining)
                </button>
            )}
            {shown > PAGE_SIZE && (
                <button className="btn" style={{ border: '1px solid #CBD5E1', fontSize: '0.8rem' }} onClick={onReset}>
                    Show Less
                </button>
            )}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Showing {Math.min(shown, total)} of {total}
            </span>
        </div>
    );
};

const INVENTORY_SECTIONS = [
    { id: 'emergency', label: 'Emergency Priority Queue', shortLabel: 'Emergency', color: '#991B1B' },
    { id: 'normal', label: 'Normal Hospital Requests', shortLabel: 'Normal', color: '#1D4ED8' },
    { id: 'fulfilled', label: 'Fulfilled Orders', shortLabel: 'Fulfilled', color: '#166534' },
    { id: 'inventory', label: 'All Inventory', shortLabel: 'Inventory', color: '#4338CA' },
];

// Returns red/yellow/green style based on unit count
const getAnalyticsColor = (units) => {
    if (units <= 5)  return { bg: '#FEE2E2', border: '#FCA5A5', text: '#991B1B', label: 'Critical', badge: true, Icon: AlertCircle };
    if (units <= 20) return { bg: '#FEF9C3', border: '#FDE68A', text: '#92400E', label: 'Medium',         badge: false, Icon: AlertTriangle };
    return              { bg: '#DCFCE7', border: '#6EE7B7', text: '#065F46', label: 'Sufficient',        badge: false, Icon: CheckCircle };
};

const InventoryDashboard = () => {
    const navigate = useNavigate();
    const { isAdmin, canDispatchEmergency, canDispatchHospitalRequest } = useAuth();
    const { showToast } = useToast();

    const [inventory, setInventory]             = useState([]);
    const [loading, setLoading]                 = useState(true);
    const [emergencyRequests, setEmergencyRequests] = useState([]);
    const [hospitalRequests, setHospitalRequests]   = useState([]);
    const [emergencyLoadError, setEmergencyLoadError] = useState('');
    const [hospitalLoadError, setHospitalLoadError]   = useState('');
    const [sendingForRequest, setSendingForRequest]   = useState({});
    const [dispatchLoading, setDispatchLoading]       = useState(null);

    // Search state
    const [emergencySearch,  setEmergencySearch]  = useState('');
    const [normalSearch,     setNormalSearch]      = useState('');
    const [fulfilledSearch,  setFulfilledSearch]   = useState('');
    const [inventorySearch,  setInventorySearch]   = useState('');

    // Show-more page limits
    const [emergencyPage,  setEmergencyPage]  = useState(1);
    const [normalPage,     setNormalPage]     = useState(1);
    const [fulfilledPage,  setFulfilledPage]  = useState(1);
    const [inventoryPage,  setInventoryPage]  = useState(1);
    const [inventorySafeFilter, setInventorySafeFilter] = useState('ALL');
    const [inventoryBloodTypeFilter, setInventoryBloodTypeFilter] = useState('ALL');
    const [activeSection, setActiveSection] = useState('emergency');

    const fetchInventory = () => {
        setLoading(true);
        api.get('/api/inventory')
            .then(res => {
                const all = res.data || [];
                setInventory(all);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching inventory', err);
                setLoading(false);
                setInventory([]);
            });
    };

    const mapRequestDefaults = (...requestLists) => {
        setSendingForRequest(prev => {
            const next = { ...prev };
            requestLists.flat().forEach(r => {
                if ((r.status || '').toUpperCase() === 'FULFILLED') {
                    delete next[r.id];
                    return;
                }
                const remaining = Math.max(0, (r.unitsRequested || 0) - (r.unitsFulfilled || 0));
                next[r.id] = String(Math.max(1, remaining));
            });
            return next;
        });
    };

    const fetchEmergencyRequests = () => {
        setEmergencyLoadError('');
        api.get('/api/emergency/requests/all')
            .then(res => {
                const data = (res.data || []).map(request => ({ ...request, requestType: 'emergency' }));
                setEmergencyRequests(data);
                mapRequestDefaults(data);
            })
            .catch(err => {
                console.error('Error fetching emergency requests', err);
                setEmergencyRequests([]);
                setEmergencyLoadError('Unable to load emergency requests.');
            });
    };

    const fetchHospitalRequests = () => {
        setHospitalLoadError('');
        api.get('/api/hospital-requests')
            .then(res => {
                const data = (res.data || []).map(request => ({ ...request, requestType: 'hospital' }));
                setHospitalRequests(data);
                mapRequestDefaults(data);
            })
            .catch(err => {
                console.error('Error fetching hospital requests', err);
                setHospitalRequests([]);
                setHospitalLoadError('Unable to load hospital requests.');
            });
    };

    useEffect(() => {
        fetchInventory();
        fetchEmergencyRequests();
        fetchHospitalRequests();
    }, []);

    const getStatusStyle = (status, safetyFlag) => {
        if (safetyFlag === 'BIO-HAZARD' || status === 'DISCARD') {
            return { background: '#FECDD3', color: '#9F1239', border: '1px solid #FDA4AF' };
        }
        if (safetyFlag === 'SAFE' || status === 'AVAILABLE' || status === 'SAFE') {
            return { background: '#D1FAE5', color: '#065F46', border: '1px solid #6EE7B7' };
        }
        return { background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' };
    };

    const handleSendRequest = async (requestId, requestType) => {
        const units = parseInt(sendingForRequest[requestId] || '0', 10);
        if (!units || units <= 0) {
            showToast({ type: 'error', title: 'Invalid quantity', message: 'Enter the number of units to dispatch.' });
            return;
        }

        const endpoint = requestType === 'hospital'
            ? `/api/hospital-requests/${requestId}/fulfill`
            : `/api/emergency/requests/${requestId}/fulfill`;

        setDispatchLoading(requestId);
        try {
            await api.put(endpoint, { units });
            if (requestType === 'hospital') fetchHospitalRequests(); else fetchEmergencyRequests();
            fetchInventory();
        } catch (err) {
            console.error(err);
            showToast({
                type: 'error',
                title: 'Dispatch failed',
                message: typeof err?.response?.data === 'string'
                    ? err.response.data
                    : err?.response?.data?.message || 'Failed to dispatch blood.'
            });
        } finally {
            setDispatchLoading(null);
        }
    };

    // ---- Analytics ----
    const bloodAnalytics = useMemo(() => {
        const standardTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
        const data = standardTypes.reduce((acc, type) => ({ ...acc, [type]: 0 }), {});
        
        const expiryLimit = new Date();
        expiryLimit.setDate(expiryLimit.getDate() - 42);

        inventory.forEach(item => {
            const status = String(item.status || '').toUpperCase();
            const safety = String(item.safetyFlag || '').toUpperCase();
            const colDate = item.collectedAt ? new Date(item.collectedAt) : null;
            
            const isUsable = safety === 'SAFE' || status === 'SAFE' || status === 'AVAILABLE';
            const isNotExpired = !colDate || colDate >= expiryLimit;

            if (!isUsable || !isNotExpired) return;
            const type = item.bloodType || 'Unknown';
            if (data[type] !== undefined) {
                data[type] += Number(item.quantity || 0);
            }
        });
        return Object.entries(data)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([bloodType, units]) => ({ bloodType, units }));
    }, [inventory]);

    // ---- Request buckets ----
    const emergencyActive = emergencyRequests.filter(
        r => (r.urgency || '').toUpperCase() === 'CRITICAL' && (r.status || '').toUpperCase() !== 'FULFILLED'
    );
    const regularActive = [...hospitalRequests, ...emergencyRequests]
        .filter(r => (r.urgency || '').toUpperCase() !== 'CRITICAL' && (r.status || '').toUpperCase() !== 'FULFILLED');
    const fulfilledRequests = [...hospitalRequests, ...emergencyRequests]
        .filter(r => (r.status || '').toUpperCase() === 'FULFILLED');

    // ---- Search helpers ----
    const matchesRequest = (req, q) => {
        if (!q) return true;
        const s = q.toLowerCase();
        return (
            String(req.id).includes(s) ||
            (req.hospital || '').toLowerCase().includes(s) ||
            (req.bloodType || '').toLowerCase().includes(s) ||
            (req.status || '').toLowerCase().includes(s)
        );
    };

    const filteredEmergency = emergencyActive.filter(r => matchesRequest(r, emergencySearch));
    const filteredNormal    = regularActive.filter(r => matchesRequest(r, normalSearch));
    const filteredFulfilled = fulfilledRequests.filter(r => matchesRequest(r, fulfilledSearch));
    const filteredInventory = inventory.filter(item => {
        // Safe Filter
        if (inventorySafeFilter !== 'ALL' && (item.safetyFlag || '').toUpperCase() !== inventorySafeFilter) return false;
        
        // Blood Type Filter
        if (inventoryBloodTypeFilter !== 'ALL' && (item.bloodType || '').toUpperCase() !== inventoryBloodTypeFilter) return false;

        // Search by ID or Donor Name ONLY
        if (inventorySearch) {
            const s = inventorySearch.toLowerCase();
            const matchesId = String(item.id).includes(s);
            const matchesDonor = (item.donorName || '').toLowerCase().includes(s);
            if (!matchesId && !matchesDonor) return false;
        }

        return true;
    });

    const canSendRegular   = canDispatchHospitalRequest;
    const canSendEmergency = canDispatchEmergency;

    useEffect(() => {
        if (emergencyActive.length > 0) {
            setActiveSection('emergency');
            return;
        }
        if (regularActive.length > 0) {
            setActiveSection('normal');
            return;
        }
        if (fulfilledRequests.length > 0) {
            setActiveSection('fulfilled');
            return;
        }
        setActiveSection('inventory');
    }, [emergencyActive.length, regularActive.length, fulfilledRequests.length]);

    const sectionCounts = {
        emergency: filteredEmergency.length,
        normal: filteredNormal.length,
        fulfilled: filteredFulfilled.length,
        inventory: filteredInventory.length
    };

    const renderRequestCard = (req, canSend, requestType) => {
        const remaining    = Math.max(0, (req.unitsRequested || 0) - (req.unitsFulfilled || 0));
        const priorityLabel = String(req.urgency || req.priority || 'NORMAL').toUpperCase();
        const isEmergency   = priorityLabel === 'CRITICAL';

        return (
            <div key={req.id} className="glass-panel" style={{ padding: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>#{req.id}</span> • {req.hospital} • <span style={{ color: '#E11D48' }}>{req.bloodType}</span> • 
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: isEmergency ? '#DC2626' : '#2563EB', background: isEmergency ? '#FEE2E2' : '#EFF6FF', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                            {isEmergency ? <Flame size={14} /> : <Activity size={14} />} {priorityLabel}
                        </span>
                    </div>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        background: (req.status || '').toUpperCase() === 'PARTIAL' ? '#FEF3C7' : '#FEE2E2',
                        color: (req.status || '').toUpperCase() === 'PARTIAL' ? '#92400E' : '#991B1B'
                    }}>
                        <Clock size={12} strokeWidth={3} /> {(req.status || 'OPEN').toUpperCase()}
                    </div>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0.25rem 0 0.6rem' }}>
                    Requested: {req.unitsRequested} • Fulfilled: {req.unitsFulfilled} • Remaining: {remaining}
                    {req.reason && ` • Reason: ${req.reason}`}
                </div>
                {!canSend && (
                    <div style={{ fontSize: '0.8rem', color: '#92400E', marginBottom: '0.5rem' }}>
                        {isEmergency ? 'Only admins can dispatch emergency-priority requests.' : 'You can view this request but cannot dispatch it.'}
                    </div>
                )}
                {canSend && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                            type="number" min="1" max={Math.max(1, remaining)} className="input-field"
                            style={{ maxWidth: '120px' }}
                            value={sendingForRequest[req.id] || ''}
                            onChange={e => setSendingForRequest(prev => ({ ...prev, [req.id]: e.target.value }))}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={() => handleSendRequest(req.id, requestType)}
                            disabled={dispatchLoading === req.id}
                        >
                            {dispatchLoading === req.id ? 'Sending...' : 'Dispatch Units'}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="app-shell">
            <div
                aria-hidden="true"
                className="app-backdrop"
                style={{
                    backgroundImage: `linear-gradient(rgba(240, 244, 255, 0.72), rgba(255, 228, 230, 0.72)), url(${inventoryBackground})`,
                }}
            />
            <div className="container app-page">
                <div className="page-header">
                    <div>
                        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: '0.9rem' }}>
                            ← Back
                        </button>
                        <div className="page-kicker">Operations</div>
                        <h1 className="page-title">Inventory Management</h1>
                        <p className="page-subtitle">Real-time blood stock monitoring, queue handling, and dispatch control.</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => { fetchInventory(); fetchEmergencyRequests(); fetchHospitalRequests(); }}>
                        Refresh Data
                    </button>
                </div>

                <div
                    className="glass-panel"
                    style={{
                        position: 'sticky',
                        top: '1rem',
                        zIndex: 5,
                        padding: '0.85rem',
                        marginBottom: '1.5rem',
                        background: 'rgba(255, 255, 255, 0.92)',
                        borderRadius: '18px'
                    }}
                >
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {INVENTORY_SECTIONS.map(section => {
                            const isActive = activeSection === section.id;
                            return (
                                <button
                                    key={section.id}
                                    className="btn"
                                    onClick={() => setActiveSection(section.id)}
                                    style={{
                                        flex: '1 1 180px',
                                        justifyContent: 'space-between',
                                        padding: '0.9rem 1rem',
                                        borderRadius: '14px',
                                        border: isActive ? `1px solid ${section.color}` : '1px solid rgba(148, 163, 184, 0.25)',
                                        background: isActive ? `${section.color}14` : 'rgba(255, 255, 255, 0.55)',
                                        color: isActive ? section.color : 'var(--secondary)',
                                        boxShadow: isActive ? '0 10px 20px rgba(15, 23, 42, 0.08)' : 'none'
                                    }}
                                >
                                    <span style={{ fontWeight: '700', fontSize: '0.92rem', textAlign: 'left' }}>{section.label}</span>
                                    <span
                                        style={{
                                            minWidth: '2rem',
                                            padding: '0.22rem 0.55rem',
                                            borderRadius: '9999px',
                                            background: isActive ? section.color : 'rgba(148, 163, 184, 0.18)',
                                            color: isActive ? '#FFFFFF' : 'var(--secondary)',
                                            fontSize: '0.78rem',
                                            fontWeight: '700'
                                        }}
                                    >
                                        {sectionCounts[section.id]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Inventory Analytics (Admin) ── */}
                {isAdmin && (
                    <div className="glass-panel section-card" style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Inventory Analytics (Admin)</h2>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.78rem', marginBottom: '1rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#FEE2E2', color: '#991B1B', padding: '0.3rem 0.8rem', borderRadius: '9999px', fontWeight: 600 }}><AlertCircle size={14}/> ≤5 units — Critical</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#FEF9C3', color: '#92400E', padding: '0.3rem 0.8rem', borderRadius: '9999px', fontWeight: 600 }}><AlertTriangle size={14}/> 6–20 units — Medium</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#DCFCE7', color: '#065F46', padding: '0.3rem 0.8rem', borderRadius: '9999px', fontWeight: 600 }}><CheckCircle size={14}/> &gt;20 units — Sufficient</span>
                        </div>
                        {bloodAnalytics.length === 0 ? (
                            <FeedbackState variant="empty" title="No usable blood units available" message="Safe inventory analytics will appear once tested bags are available." compact />
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                                {bloodAnalytics.map(item => {
                                    const color = getAnalyticsColor(item.units);
                                    return (
                                        <div
                                            key={item.bloodType}
                                            style={{
                                                padding: '0.85rem',
                                                borderRadius: '12px',
                                                background: color.bg,
                                                border: `1.5px solid ${color.border}`,
                                                position: 'relative',
                                                transition: 'transform 0.15s'
                                            }}
                                        >
                                            <div style={{ fontWeight: '800', fontSize: '1.25rem', color: color.text }}>{item.bloodType}</div>
                                            <div style={{ fontWeight: '600', fontSize: '1rem', color: color.text }}>{item.units} units</div>
                                            <div style={{ fontSize: '0.72rem', color: color.text, marginTop: '0.5rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                                                <color.Icon size={14} />
                                                {color.label}
                                            </div>
                                            {color.badge && (
                                                <div style={{
                                                    position: 'absolute', top: '0.5rem', right: '0.5rem',
                                                    background: '#991B1B', color: 'white',
                                                    fontSize: '0.62rem', fontWeight: '700',
                                                    padding: '0.1rem 0.35rem', borderRadius: '4px'
                                                }}>
                                                    Emergency Only
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeSection === 'emergency' && (
                    <div
                        className="glass-panel"
                        style={{
                            padding: '1.25rem',
                            border: '1px solid #FCA5A5',
                            background: 'linear-gradient(135deg, rgba(254,242,242,0.95) 0%, rgba(254,226,226,0.95) 100%)',
                            boxShadow: '0 10px 30px rgba(185, 28, 28, 0.12)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.1rem', marginBottom: '0.2rem', color: '#991B1B' }}>Emergency Priority Queue</h2>
                                <p style={{ color: '#991B1B', opacity: 0.82, fontSize: '0.88rem' }}>Critical requests stay isolated so dispatching is faster and safer.</p>
                            </div>
                            <div style={{ background: '#991B1B', color: '#FFFFFF', padding: '0.35rem 0.7rem', borderRadius: '9999px', fontSize: '0.82rem', fontWeight: '700' }}>
                                {filteredEmergency.length} active
                            </div>
                        </div>
                        <SearchBar value={emergencySearch} onChange={v => { setEmergencySearch(v); setEmergencyPage(1); }} placeholder="Search by ID, hospital, blood type…" />
                        {emergencyLoadError && <div style={{ color: '#B91C1C', marginBottom: '0.75rem' }}>{emergencyLoadError}</div>}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {filteredEmergency.slice(0, emergencyPage * PAGE_SIZE).map(req => renderRequestCard(req, canSendEmergency, 'emergency'))}
                            {filteredEmergency.length === 0 && <FeedbackState variant="empty" title="No active emergency-priority requests" message="Critical requests will appear here immediately." compact />}
                        </div>
                        <ShowMore
                            shown={emergencyPage * PAGE_SIZE}
                            total={filteredEmergency.length}
                            onMore={() => setEmergencyPage(p => p + 1)}
                            onReset={() => setEmergencyPage(1)}
                        />
                    </div>
                )}

                {activeSection === 'normal' && (
                    <div className="glass-panel section-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>Normal Hospital Request Queue</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Routine requests stay separate from emergencies, so triage is clearer.</p>
                            </div>
                            <div style={{ background: '#DBEAFE', color: '#1D4ED8', padding: '0.35rem 0.7rem', borderRadius: '9999px', fontSize: '0.82rem', fontWeight: '700' }}>
                                {filteredNormal.length} active
                            </div>
                        </div>
                        <SearchBar value={normalSearch} onChange={v => { setNormalSearch(v); setNormalPage(1); }} placeholder="Search by ID, hospital, blood type…" />
                        {hospitalLoadError && <div style={{ color: '#B91C1C', marginBottom: '0.75rem' }}>{hospitalLoadError}</div>}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {filteredNormal.slice(0, normalPage * PAGE_SIZE).map(req => renderRequestCard(req, canSendRegular, req.requestType || 'hospital'))}
                            {filteredNormal.length === 0 && <FeedbackState variant="empty" title="No active normal requests" message="Routine hospital requests will appear here." compact />}
                        </div>
                        <ShowMore
                            shown={normalPage * PAGE_SIZE}
                            total={filteredNormal.length}
                            onMore={() => setNormalPage(p => p + 1)}
                            onReset={() => setNormalPage(1)}
                        />
                    </div>
                )}

                {activeSection === 'fulfilled' && (
                    <div className="glass-panel section-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>Fulfilled Orders</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Completed dispatches stay accessible without cluttering the live queues.</p>
                            </div>
                            <div style={{ background: '#DCFCE7', color: '#166534', padding: '0.35rem 0.7rem', borderRadius: '9999px', fontSize: '0.82rem', fontWeight: '700' }}>
                                {filteredFulfilled.length} fulfilled
                            </div>
                        </div>
                        <SearchBar value={fulfilledSearch} onChange={v => { setFulfilledSearch(v); setFulfilledPage(1); }} placeholder="Search by ID, hospital, blood type…" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {filteredFulfilled.slice(0, fulfilledPage * PAGE_SIZE).map(req => (
                                <div key={req.id} className="glass-panel" style={{ padding: '0.9rem', background: '#F0FDF4' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>#{req.id}</span> • {req.hospital} • <span style={{ color: '#E11D48' }}>{req.bloodType}</span> •
                                            <span style={{ color: 'var(--text-muted)' }}>{String(req.urgency || req.priority || 'NORMAL').toUpperCase()}</span>
                                        </div>
                                        <StatusBadge status="FULFILLED" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <CheckCircle size={14} strokeWidth={2.5} /> FULFILLED
                                        </StatusBadge>
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                        Requested: {req.unitsRequested} • Fulfilled: {req.unitsFulfilled}
                                    </div>
                                </div>
                            ))}
                            {filteredFulfilled.length === 0 && <FeedbackState variant="empty" title="No fulfilled orders yet" message="Completed dispatches will appear here." compact />}
                        </div>
                        <ShowMore
                            shown={fulfilledPage * PAGE_SIZE}
                            total={filteredFulfilled.length}
                            onMore={() => setFulfilledPage(p => p + 1)}
                            onReset={() => setFulfilledPage(1)}
                        />
                    </div>
                )}

                {activeSection === 'inventory' && (
                    <div className="glass-panel section-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>All Inventory</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Search and filter the stock table without scrolling through other queues first.</p>
                            </div>
                            <div style={{ background: '#E0E7FF', color: '#4338CA', padding: '0.35rem 0.7rem', borderRadius: '9999px', fontSize: '0.82rem', fontWeight: '700' }}>
                                {filteredInventory.length} items
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 2, minWidth: '200px' }}>
                                <SearchBar value={inventorySearch} onChange={v => { setInventorySearch(v); setInventoryPage(1); }} placeholder="Search by ID or donor name…" />
                            </div>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                                <select
                                    className="input-field"
                                    value={inventorySafeFilter}
                                    onChange={e => { setInventorySafeFilter(e.target.value); setInventoryPage(1); }}
                                    style={{
                                        width: '100%', padding: '0.5rem 0.85rem', borderRadius: '8px',
                                        border: '1px solid #CBD5E1', fontSize: '0.875rem', outline: 'none',
                                        background: 'rgba(255,255,255,0.85)', height: '39px'
                                    }}
                                >
                                    <option value="ALL">All Safe Tags</option>
                                    <option value="SAFE">SAFE</option>
                                    <option value="PENDING">PENDING</option>
                                    <option value="BIO-HAZARD">BIO-HAZARD</option>
                                </select>
                            </div>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                                <select
                                    className="input-field"
                                    value={inventoryBloodTypeFilter}
                                    onChange={e => { setInventoryBloodTypeFilter(e.target.value); setInventoryPage(1); }}
                                    style={{
                                        width: '100%', padding: '0.5rem 0.85rem', borderRadius: '8px',
                                        border: '1px solid #CBD5E1', fontSize: '0.875rem', outline: 'none',
                                        background: 'rgba(255,255,255,0.85)', height: '39px'
                                    }}
                                >
                                    <option value="ALL">All Blood Types</option>
                                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bt => (
                                        <option key={bt} value={bt}>{bt}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto', borderRadius: '8px' }}>
                            <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                        {['ID', 'Blood Type', 'Quantity', 'Expiry Date', 'Safety Status', 'Current State'].map(h => (
                                            <th key={h} style={{ padding: '1.25rem 1.5rem', fontWeight: '600', color: 'var(--secondary)' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInventory.slice(0, inventoryPage * PAGE_SIZE).map(item => {
                                        const statusStyle = getStatusStyle(item.status, item.safetyFlag);

                                        let expiryStr = 'Unknown';
                                        if (item.collectedAt) {
                                            const colDate = new Date(item.collectedAt);
                                            const expDate = new Date(colDate.setDate(colDate.getDate() + 42));
                                            expiryStr = expDate.toLocaleDateString();

                                            if (expDate < new Date() && item.status === 'AVAILABLE') {
                                                expiryStr = <span style={{ color: '#DC2626', fontWeight: 'bold' }}>{expiryStr} (EXPIRED)</span>;
                                            }
                                        }

                                        return (
                                            <tr key={item.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                                <td style={{ padding: '1.25rem 1.5rem', fontFamily: 'monospace' }}>
                                                    <div>#{item.id}</div>
                                                    {item.donorName && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Donor: {item.donorName}</div>}
                                                </td>
                                                <td style={{ padding: '1.25rem 1.5rem', fontWeight: '700', fontSize: '1.1rem' }}>{item.bloodType}</td>
                                                <td style={{ padding: '1.25rem 1.5rem' }}>{item.quantity ?? 0}</td>
                                                <td style={{ padding: '1.25rem 1.5rem' }}>{expiryStr}</td>
                                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                                    <span style={{ ...statusStyle, padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                                                        {item.safetyFlag || 'Pending'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1.25rem 1.5rem', fontWeight: '500' }}>{item.status}</td>
                                            </tr>
                                        );
                                    })}
                                    {filteredInventory.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                <FeedbackState variant="empty" title="No inventory items found" message="Try changing the search or filter selections." compact />
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <ShowMore
                            shown={inventoryPage * PAGE_SIZE}
                            total={filteredInventory.length}
                            onMore={() => setInventoryPage(p => p + 1)}
                            onReset={() => setInventoryPage(1)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default InventoryDashboard;
