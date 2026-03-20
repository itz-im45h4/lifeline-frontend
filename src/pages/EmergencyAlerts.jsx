import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const EmergencyAlerts = () => {
    const navigate = useNavigate();
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        setLoading(true);
        api.get('/api/activity/recent')
            .then(res => {
                setActivity(res.data || []);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching emergency alerts', err);
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
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Emergency Alerts</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Latest critical requests from hospitals</p>
                </div>
                <button className="btn" style={{ border: '1px solid #E2E8F0' }} onClick={() => navigate(-1)}>Back</button>
            </header>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                {loading && <div style={{ color: 'var(--text-muted)' }}>Loading alerts...</div>}
                {!loading && error && <div style={{ color: 'var(--text-muted)' }}>Unable to load alerts.</div>}
                {!loading && !error && emergencyAlerts.length === 0 && (
                    <div style={{ color: 'var(--text-muted)' }}>No emergency alerts right now.</div>
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
