import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import loginBackground from '../assets/loginpage.png';

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
    const [activityLoading, setActivityLoading] = useState(true);
    const [inventoryLoading, setInventoryLoading] = useState(true);
    const [activityError, setActivityError] = useState(false);
    const [inventoryError, setInventoryError] = useState(false);

    const modules = [
        ...(canViewInventory ? [{ title: 'Inventory', desc: 'Manage blood stock & safety', path: '/inventory', color: 'var(--primary)', icon: '📦' }] : []),
        ...(canViewLab ? [{ title: 'Lab', desc: 'Test completed donations', path: '/lab', color: '#0EA5E9', icon: '🧪' }] : []),
        ...(canCreateHospitalRequest ? [{ title: 'Request', desc: 'Create normal or emergency hospital requests', path: '/emergency', color: '#2563EB', icon: '🏥' }] : []),
        ...(canManageCredentials ? [{ title: 'Credentials', desc: 'Assign roles and manage users', path: '/credentials', color: '#7C3AED', icon: '🔐' }] : []),
        ...(canManageCredentials ? [{ title: 'Hospitals', desc: 'Manage hospital master data', path: '/hospitals', color: '#0F766E', icon: '🩺' }] : []),
        { title: 'Donors', desc: 'Register & track donors', path: '/donors', color: '#10B981', icon: '❤️' },
        { title: 'Appointments', desc: 'Schedule and manage bookings', path: '/appointments', color: '#0EA5E9', icon: '🗓️' },
        { title: 'Camps', desc: 'Find donation events', path: '/camps', color: '#F59E0B', icon: '📅' },
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

    const criticalAlerts = useMemo(() => {
        const alerts = [];
        inventory.forEach(item => {
            const status = (item.status || '').toUpperCase();
            const safety = (item.safetyFlag || '').toUpperCase();
            const qty = typeof item.quantity === 'number' ? item.quantity : null;
            const lowByQty = qty !== null && qty <= 2;
            const lowByStatus = status.includes('LOW') || status.includes('CRITICAL');
            const unsafe = safety.includes('BIO') || status.includes('DISCARD');
            if (lowByQty || lowByStatus || unsafe) {
                alerts.push(item);
            }
        });
        return alerts;
    }, [inventory]);

    const emergencyAlerts = useMemo(() => {
        return recentActivity.filter(item => {
            const type = (item.activityType || '').toUpperCase();
            const desc = (item.description || '').toLowerCase();
            return type.includes('EMERGENCY') || desc.includes('emergency alert');
        });
    }, [recentActivity]);

    return (
        <div style={{ minHeight: '100vh', width: '100%', position: 'relative', backgroundColor: '#F0F4FF' }}>
            <div
                aria-hidden="true"
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundImage: `linear-gradient(rgba(240, 244, 255, 0.72), rgba(255, 228, 230, 0.72)), url(${loginBackground})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    pointerEvents: 'none',
                    zIndex: 0
                }}
            />
        <div className="container" style={{ position: 'relative', zIndex: 1, padding: '2rem 1rem' }}>
            <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Dashboard</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Welcome to LifeLine Control Center</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: 'var(--radius-full)' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></div>
                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>System Operational</span>
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

            {/* Quick Stats Row */}
            <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Recent Activity</h3>
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
                            <div key={item.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.875rem' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)' }}></div>
                                <span style={{ color: 'var(--text-muted)' }}>{formatTimeAgo(item.timestamp)}</span>
                                <span>{item.description}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '2rem', background: 'linear-gradient(135deg, var(--primary) 0%, #E11D48 100%)', color: 'white' }}>
                    <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Critical Alerts</h3>
                    <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>
                        {canViewInventory
                            ? (inventoryLoading ? '...' : criticalAlerts.length)
                            : emergencyAlerts.length}
                    </div>
                    <p style={{ opacity: 0.9 }}>
                        {canViewInventory && inventoryLoading && 'Checking stock levels...'}
                        {canViewInventory && !inventoryLoading && criticalAlerts.length === 0 && 'No critical inventory alerts.'}
                        {canViewInventory && !inventoryLoading && criticalAlerts.length > 0 && `Inventory alerts: ${criticalAlerts.length} item(s)`}
                        {!canViewInventory && (emergencyAlerts.length > 0 ? `Emergency alerts: ${emergencyAlerts.length}` : 'No emergency alerts.')}
                        {emergencyAlerts.length > 0 && canViewInventory && ` • Emergency alerts: ${emergencyAlerts.length}`}
                    </p>
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
