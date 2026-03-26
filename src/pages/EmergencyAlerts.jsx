import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, AlertCircle, Droplet, CheckCircle2, Activity } from 'lucide-react';
import FeedbackState from '../components/FeedbackState';

const EmergencyAlerts = () => {
    const navigate = useNavigate();
    const [activity, setActivity] = useState([]);
    const [lowStock, setLowStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        Promise.all([
            api.get('/api/activity/recent').then(r => r.data || []).catch(() => []),
            api.get('/api/inventory/low-stock').then(r => r.data || []).catch(() => [])
        ]).then(([actData, stockData]) => {
            setActivity(actData);
            setLowStock(stockData);
            setLoading(false);
        }).catch(() => {
            setError(true);
            setLoading(false);
        });
    }, []);

    const emergencyAlerts = useMemo(() => {
        return activity.filter(item => {
            const type = (item.activityType || '').toUpperCase();
            const desc = (item.description || '').toLowerCase();
            return type.includes('EMERGENCY') || desc.includes('emergency alert');
        });
    }, [activity]);

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Critical Alerts</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Low blood stock warnings &amp; emergency requests</p>
                </div>
                <button className="btn" style={{ border: '1px solid #E2E8F0' }} onClick={() => navigate(-1)}>Back</button>
            </header>

            {loading && <FeedbackState variant="loading" title="Loading alerts" message="Checking emergency activity and blood stock levels." />}
            {!loading && error && <FeedbackState variant="error" title="Unable to load alerts" message="Please refresh to try again." />}

            {/* ── Low Blood Stock Alerts ── */}
            {!loading && !error && lowStock.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.15rem', marginBottom: '0.75rem', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Droplet size={24} /> Low Blood Stock Alerts
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {lowStock.map(item => {
                            const isCritical = item.level === 'CRITICAL';
                            return (
                                <div
                                    key={item.bloodType}
                                    className="glass-panel"
                                    style={{
                                        padding: '1rem 1.25rem',
                                        border: isCritical ? '1.5px solid #FCA5A5' : '1.5px solid #FDE68A',
                                        background: isCritical
                                            ? 'linear-gradient(135deg, #FFF5F5 0%, #FEE2E2 100%)'
                                            : 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        flexWrap: 'wrap'
                                    }}
                                >
                                    <div style={{
                                        width: '44px', height: '44px', borderRadius: '50%',
                                        background: isCritical ? '#FEE2E2' : '#FEF9C3',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        {isCritical ? <AlertTriangle size={24} color="#DC2626" /> : <AlertCircle size={24} color="#D97706" />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '700', fontSize: '1rem', color: isCritical ? '#991B1B' : '#92400E' }}>
                                            {item.bloodType} blood running {isCritical ? 'critically' : ''} low
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: isCritical ? '#B91C1C' : '#A16207', marginTop: '0.15rem' }}>
                                            Only <strong>{item.units}</strong> unit{item.units !== 1 ? 's' : ''} remaining
                                            {isCritical ? ' — Emergency dispatches only' : ' — Restock recommended'}
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: '0.25rem 0.7rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700',
                                        background: isCritical ? '#991B1B' : '#92400E',
                                        color: 'white', textTransform: 'uppercase', flexShrink: 0
                                    }}>
                                        {isCritical ? 'Critical' : 'Low'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {!loading && !error && lowStock.length === 0 && (
                    <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', color: '#065F46', background: '#F0FDF4', border: '1px solid #6EE7B7', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={20} color="#059669" /> All blood types are at sufficient levels.
                </div>
            )}

            {/* ── Emergency Activity Feed ── */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={20} color="#DC2626" /> Emergency Request Activity
                </h2>
                {!loading && !error && emergencyAlerts.length === 0 && (
                    <FeedbackState variant="empty" title="No emergency request alerts" message="There are no current emergency activities requiring attention." compact />
                )}
                {!loading && !error && emergencyAlerts.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {emergencyAlerts.map(alert => (
                            <div key={alert.id} className="glass-panel" style={{ padding: '1rem', border: '1px solid #FEE2E2', background: '#FFF5F5' }}>
                                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{alert.description}</div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Type: {alert.activityType || 'EMERGENCY'}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmergencyAlerts;
