import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import loginBackground from '../assets/loginpage.png';
import { Package, FlaskConical, Hospital, ShieldCheck, Stethoscope, Heart, CalendarDays, MapPin, Activity, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

const ALERT_REFRESH_INTERVAL_MS = 15000;

const Dashboard = () => {
    const navigate = useNavigate();
    const {
        canViewInventory,
        canViewLab,
        canCreateHospitalRequest,
        canManageCredentials
    } = useAuth();
    const [recentActivity, setRecentActivity] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [lowStock, setLowStock] = useState([]);
    const [activityLoading, setActivityLoading] = useState(true);
    const [inventoryLoading, setInventoryLoading] = useState(true);
    const [activityError, setActivityError] = useState(false);
    const [inventoryError, setInventoryError] = useState(false);

    const modules = [
        ...(canViewInventory ? [{ title: 'Inventory', desc: 'Manage blood stock & safety', path: '/inventory', color: 'var(--primary)', icon: <Package size={28} /> }] : []),
        ...(canViewLab ? [{ title: 'Lab', desc: 'Test completed donations', path: '/lab', color: '#0EA5E9', icon: <FlaskConical size={28} /> }] : []),
        ...(canCreateHospitalRequest ? [{ title: 'Request', desc: 'Create normal or emergency hospital requests', path: '/emergency', color: '#2563EB', icon: <Hospital size={28} /> }] : []),
        ...(canManageCredentials ? [{ title: 'Credentials', desc: 'Assign roles and manage users', path: '/credentials', color: '#7C3AED', icon: <ShieldCheck size={28} /> }] : []),
        ...(canManageCredentials ? [{ title: 'Hospitals', desc: 'Manage hospital master data', path: '/hospitals', color: '#0F766E', icon: <Stethoscope size={28} /> }] : []),
        { title: 'Donors', desc: 'Register & track donors', path: '/donors', color: '#10B981', icon: <Heart size={28} /> },
        { title: 'Appointments', desc: 'Schedule and manage bookings', path: '/appointments', color: '#0EA5E9', icon: <CalendarDays size={28} /> },
        { title: 'Camps', desc: 'Find donation events', path: '/camps', color: '#F59E0B', icon: <MapPin size={28} /> },
    ];

    useEffect(() => {
        setActivityLoading(true);
        api.get('/api/activity/recent')
            .then(res => {
                setRecentActivity(res.data || []);
                setActivityLoading(false);
            })
            .catch(err => {
                console.error('Error fetching recent activity', err);
                setActivityError(true);
                setActivityLoading(false);
            });

        // Fetch low stock alerts for all users
        api.get('/api/inventory/low-stock')
            .then(res => setLowStock(res.data || []))
            .catch(() => setLowStock([]));
    }, []);

    useEffect(() => {
        if (!canViewInventory) {
            setInventoryLoading(false);
            return;
        }
        setInventoryLoading(true);
        api.get('/api/inventory')
            .then(res => {
                setInventory(res.data || []);
                setInventoryLoading(false);
            })
            .catch(err => {
                console.error('Error fetching inventory', err);
                setInventoryError(true);
                setInventoryLoading(false);
            });
    }, [canViewInventory]);

    useEffect(() => {
        const refreshActivity = () => {
            api.get('/api/activity/recent')
                .then(res => {
                    setRecentActivity(res.data || []);
                    setActivityError(false);
                })
                .catch(err => {
                    console.error('Error refreshing recent activity', err);
                    setActivityError(true);
                });
        };

        const refreshLowStock = () => {
            api.get('/api/inventory/low-stock')
                .then(res => setLowStock(res.data || []))
                .catch(() => setLowStock([]));
        };

        const refreshInventory = () => {
            if (!canViewInventory) {
                setInventory([]);
                setInventoryError(false);
                return;
            }

            api.get('/api/inventory')
                .then(res => {
                    setInventory(res.data || []);
                    setInventoryError(false);
                })
                .catch(err => {
                    console.error('Error refreshing inventory', err);
                    setInventoryError(true);
                });
        };

        const refreshSignals = () => {
            refreshActivity();
            refreshLowStock();
            refreshInventory();
        };

        const intervalId = window.setInterval(refreshSignals, ALERT_REFRESH_INTERVAL_MS);
        const handleFocus = () => refreshSignals();
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refreshSignals();
            }
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [canViewInventory]);

    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return 'Just now';
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) return 'Just now';
        const diffMs = Date.now() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} mins ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hrs ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} days ago`;
    };


    const emergencyAlerts = useMemo(() => {
        return recentActivity.filter(item => {
            const type = (item.activityType || '').toUpperCase();
            const desc = (item.description || '').toLowerCase();
            return type.includes('EMERGENCY') || desc.includes('emergency alert');
        });
    }, [recentActivity]);

    return (
        <div className="app-shell">
            <div
                aria-hidden="true"
                className="app-backdrop"
                style={{
                    backgroundImage: `linear-gradient(rgba(240, 244, 255, 0.72), rgba(255, 228, 230, 0.72)), url(${loginBackground})`,
                }}
            />
        <div className="container app-page">
            <header className="page-header" style={{ marginBottom: '3rem' }}>
                <div>
                    <div className="page-kicker">Overview</div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Welcome to LifeLine Control Center</p>
                </div>
                <div className="page-actions">
                    <div className="glass-panel" style={{ padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: 'var(--radius-full)', background: 'rgba(255, 255, 255, 0.9)' }}>
                        <CheckCircle2 size={18} color="#10B981" strokeWidth={2.5} />
                        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#064E3B' }}>System Operational</span>
                    </div>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                {modules.map((mod, idx) => (
                    <div
                        key={idx}
                        onClick={() => navigate(mod.path)}
                        className="glass-panel"
                        style={{
                            padding: '2rem',
                            cursor: 'pointer',
                            transition: 'var(--transition)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.borderColor = mod.color;
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                        }}
                    >
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: `${mod.color}20`,
                            color: mod.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem'
                        }}>
                            {mod.icon}
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{mod.title}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{mod.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="glass-panel section-card" style={{ marginTop: '2rem' }}>
                <div className="section-header">
                    <div>
                        <h2 className="section-title">Quick Actions</h2>
                        <p className="section-subtitle">Jump directly into the most common tasks for this account.</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={() => navigate('/appointments/book')}>Book Donation</button>
                    <button className="btn btn-secondary" onClick={() => navigate('/emergency/alerts')}>Open Alerts</button>
                    <button className="btn btn-secondary" onClick={() => navigate('/camps')}>Browse Camps</button>
                    {canCreateHospitalRequest && <button className="btn btn-secondary" onClick={() => navigate('/emergency')}>Create Request</button>}
                </div>
            </div>

            {/* Quick Stats Row */}
            <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div className="glass-panel section-card">
                    <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={22} color="#2563EB" /> Recent Activity</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {activityLoading && (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading activity...</div>
                        )}
                        {!activityLoading && activityError && (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Unable to load activity.</div>
                        )}
                        {!activityLoading && !activityError && recentActivity.length === 0 && (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No recent activity.</div>
                        )}
                        {!activityLoading && !activityError && recentActivity.slice(0, 10).map(item => (
                            <div key={item.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', fontSize: '0.875rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                <Clock size={16} color="var(--text-muted)" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                    <span style={{ fontWeight: '500', color: '#1E293B' }}>{item.description}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '500' }}>{formatTimeAgo(item.timestamp)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="glass-panel section-card" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #E11D48 100%)', color: 'white' }}>
                    <h3 style={{ color: 'white', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={22} color="white" /> Critical Alerts</h3>
                    <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>
                        {canViewInventory
                            ? (inventoryLoading ? '...' : lowStock.length)
                            : emergencyAlerts.length}
                    </div>
                    <p style={{ opacity: 0.9 }}>
                        {canViewInventory && inventoryLoading && 'Checking stock levels...'}
                        {canViewInventory && !inventoryLoading && lowStock.length === 0 && 'No critical inventory alerts.'}
                        {canViewInventory && !inventoryLoading && lowStock.length > 0 && `Critical stock for ${lowStock.length} blood type${lowStock.length !== 1 ? 's' : ''}.`}
                        {!canViewInventory && (emergencyAlerts.length > 0 ? `Emergency alerts: ${emergencyAlerts.length}` : 'No emergency alerts.')}
                        {emergencyAlerts.length > 0 && canViewInventory && ` • Emergency alerts: ${emergencyAlerts.length}`}
                    </p>
                    {lowStock.length > 0 && (
                        <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {lowStock.map(item => (
                                <div key={item.bloodType} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.875rem' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.units <= 2 ? '#FDA4AF' : '#FDE68A', flexShrink: 0 }}></div>
                                    <span style={{ color: 'rgba(255,255,255,0.9)' }}>
                                        <strong>{item.bloodType}</strong> blood running {item.units <= 2 ? 'critically ' : ''}low ({item.units} unit{item.units !== 1 ? 's' : ''} left)
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    <button style={{
                        marginTop: '1.5rem',
                        background: 'white',
                        color: 'var(--primary)',
                        padding: '0.5rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: '600',
                        fontSize: '0.875rem'
                    }} onClick={() => navigate(canViewInventory ? '/inventory' : '/emergency/alerts')}>
                        {canViewInventory ? 'View Inventory' : 'View Alerts'}
                    </button>
                </div>
            </div>
        </div>
        </div>
    );
};

export default Dashboard;
