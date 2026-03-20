import React, { useMemo, useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import inventoryBackground from '../assets/inventory.png';

const InventoryDashboard = () => {
    const navigate = useNavigate();
    const { isAdmin, canDispatchEmergency, canDispatchHospitalRequest } = useAuth();

    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);

    const [emergencyRequests, setEmergencyRequests] = useState([]);
    const [hospitalRequests, setHospitalRequests] = useState([]);
    const [emergencyLoadError, setEmergencyLoadError] = useState('');
    const [hospitalLoadError, setHospitalLoadError] = useState('');
    const [sendingForRequest, setSendingForRequest] = useState({});
    const [dispatchLoading, setDispatchLoading] = useState(null);

    const fetchInventory = () => {
        setLoading(true);
        api.get('/api/inventory')
            .then(res => {
                const all = res.data || [];
                setInventory(all.filter(item => (item.testStatus || '').toUpperCase() !== 'PENDING'));
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
                const data = res.data || [];
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
                const data = res.data || [];
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
            alert('Enter units to send.');
            return;
        }

        const endpoint = requestType === 'hospital'
            ? `/api/hospital-requests/${requestId}/fulfill`
            : `/api/emergency/requests/${requestId}/fulfill`;

        setDispatchLoading(requestId);
        try {
            await api.put(endpoint, { units });
            if (requestType === 'hospital') {
                fetchHospitalRequests();
            } else {
                fetchEmergencyRequests();
            }
            fetchInventory();
        } catch (err) {
            console.error(err);
            alert(typeof err?.response?.data === 'string' ? err.response.data : 'Failed to dispatch blood.');
        } finally {
            setDispatchLoading(null);
        }
    };

    const bloodAnalytics = useMemo(() => {
        const data = {};
        inventory.forEach(item => {
            const status = String(item.status || '').toUpperCase();
            const safety = String(item.safetyFlag || '').toUpperCase();
            const isUsable = safety === 'SAFE' || status === 'SAFE' || status === 'AVAILABLE';
            if (!isUsable) return;
            const type = item.bloodType || 'Unknown';
            const qty = Number(item.quantity || 0);
            data[type] = (data[type] || 0) + qty;
        });
        return Object.entries(data)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([bloodType, units]) => ({ bloodType, units }));
    }, [inventory]);

    const emergencyActive = emergencyRequests.filter(
        r => (r.urgency || '').toUpperCase() === 'CRITICAL' && (r.status || '').toUpperCase() !== 'FULFILLED'
    );
    const regularActive = hospitalRequests.filter(r => (r.status || '').toUpperCase() !== 'FULFILLED');
    const fulfilledRequests = [...hospitalRequests, ...emergencyRequests]
        .filter(r => (r.status || '').toUpperCase() === 'FULFILLED');

    const canSendRegular = canDispatchHospitalRequest;
    const canSendEmergency = canDispatchEmergency;

    const renderRequestCard = (req, canSend, requestType) => {
        const remaining = Math.max(0, (req.unitsRequested || 0) - (req.unitsFulfilled || 0));
        const priorityLabel = String(req.urgency || req.priority || 'NORMAL').toUpperCase();
        const isEmergency = priorityLabel === 'CRITICAL';

        return (
            <div key={req.id} className="glass-panel" style={{ padding: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: '600' }}>
                        #{req.id} • {req.hospital} • {req.bloodType} • {priorityLabel}
                    </div>
                    <div style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        background: (req.status || '').toUpperCase() === 'PARTIAL' ? '#FEF3C7' : '#FEE2E2',
                        color: (req.status || '').toUpperCase() === 'PARTIAL' ? '#92400E' : '#991B1B'
                    }}>
                        {(req.status || 'OPEN').toUpperCase()}
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
                            type="number"
                            min="1"
                            max={Math.max(1, remaining)}
                            className="input-field"
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
        <div style={{ minHeight: '100vh', width: '100%', position: 'relative', backgroundColor: '#F0F4FF' }}>
            <div
                aria-hidden="true"
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundImage: `linear-gradient(rgba(240, 244, 255, 0.72), rgba(255, 228, 230, 0.72)), url(${inventoryBackground})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    pointerEvents: 'none',
                    zIndex: 0
                }}
            />
            <div className="container" style={{ position: 'relative', zIndex: 1, padding: '2rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <button
                            className="btn"
                            onClick={() => navigate(-1)}
                            style={{ marginBottom: '0.75rem', border: '1px solid var(--primary)', color: 'var(--primary)' }}
                        >
                            Back
                        </button>
                        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Inventory Management</h1>
                        <p style={{ color: 'var(--text-muted)' }}>Real-time blood stock monitoring</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => { fetchInventory(); fetchEmergencyRequests(); fetchHospitalRequests(); }}>
                        Refresh Data
                    </button>
                </div>

                {isAdmin && (
                    <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Inventory Analytics (Admin)</h2>
                        {bloodAnalytics.length === 0 ? (
                            <div style={{ color: 'var(--text-muted)' }}>No usable blood units available.</div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
                                {bloodAnalytics.map(item => (
                                    <div key={item.bloodType} className="glass-panel" style={{ padding: '0.75rem' }}>
                                        <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{item.bloodType}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{item.units} units</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div
                    className="glass-panel"
                    style={{
                        padding: '1.25rem',
                        marginBottom: '1.5rem',
                        border: '1px solid #FCA5A5',
                        background: 'linear-gradient(135deg, rgba(254,242,242,0.95) 0%, rgba(254,226,226,0.95) 100%)',
                        boxShadow: '0 10px 30px rgba(185, 28, 28, 0.12)'
                    }}
                >
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#991B1B' }}>
                        Emergency Priority Queue
                    </h2>
                    {emergencyLoadError && <div style={{ color: '#B91C1C', marginBottom: '0.75rem' }}>{emergencyLoadError}</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {emergencyActive.map(req => renderRequestCard(req, canSendEmergency, 'emergency'))}
                        {emergencyActive.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No active emergency-priority requests.</div>}
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Normal Hospital Request Queue</h2>
                    {hospitalLoadError && <div style={{ color: '#B91C1C', marginBottom: '0.75rem' }}>{hospitalLoadError}</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {regularActive.map(req => renderRequestCard(req, canSendRegular, 'hospital'))}
                        {regularActive.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No active normal requests.</div>}
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Fulfilled Orders</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {fulfilledRequests.map(req => (
                            <div key={req.id} className="glass-panel" style={{ padding: '0.9rem', background: '#F0FDF4' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                    <div style={{ fontWeight: '600' }}>
                                        #{req.id} • {req.hospital} • {req.bloodType} • {String(req.urgency || req.priority || 'NORMAL').toUpperCase()}
                                    </div>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '9999px',
                                        background: '#DCFCE7',
                                        color: '#166534'
                                    }}>
                                        FULFILLED
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    Requested: {req.unitsRequested} • Fulfilled: {req.unitsFulfilled}
                                </div>
                            </div>
                        ))}
                        {fulfilledRequests.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No fulfilled orders yet.</div>}
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                <th style={{ padding: '1.25rem 1.5rem', fontWeight: '600', color: 'var(--secondary)' }}>ID</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontWeight: '600', color: 'var(--secondary)' }}>Blood Type</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontWeight: '600', color: 'var(--secondary)' }}>Quantity</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontWeight: '600', color: 'var(--secondary)' }}>Expiry Date</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontWeight: '600', color: 'var(--secondary)' }}>Safety Status</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontWeight: '600', color: 'var(--secondary)' }}>Current State</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inventory.map(item => {
                                const statusStyle = getStatusStyle(item.status, item.safetyFlag);
                                return (
                                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                        <td style={{ padding: '1.25rem 1.5rem', fontFamily: 'monospace' }}>#{item.id}</td>
                                        <td style={{ padding: '1.25rem 1.5rem', fontWeight: '700', fontSize: '1.1rem' }}>{item.bloodType}</td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>{item.quantity ?? 0}</td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>{item.expiryDate}</td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <span style={{
                                                ...statusStyle,
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                textTransform: 'uppercase'
                                            }}>
                                                {item.safetyFlag || 'Pending'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem', fontWeight: '500' }}>{item.status}</td>
                                    </tr>
                                );
                            })}
                            {inventory.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No inventory items found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InventoryDashboard;
