import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, AlertTriangle, Droplet } from 'lucide-react';
import donorBackground from '../assets/donorportal.jpg';
import { useToast } from '../context/ToastContext';

const DonorDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();
    const donorId = user?.id || user?.userId;
    const [donorData, setDonorData] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [nextNearbyCamp, setNextNearbyCamp] = useState(null);
    const [eligibility, setEligibility] = useState({ eligible: true });
    
    const formatEligibilityMessage = (details = {}) => {
        if (details?.type === 'SAFETY') {
            return details.reason || 'Not eligible because latest test result is positive.';
        }
        if (details?.type === 'RECENT_DONATION') {
            const waitText = typeof details.daysRemaining === 'number'
                ? ` Wait ${details.daysRemaining} more day(s).`
                : '';
            return `${details.reason || 'You donated recently and must wait at least 60 days.'}${waitText}`;
        }
        return details.reason || 'You are not eligible to donate right now.';
    };

    useEffect(() => {
        if (!donorId) {
            setAppointments([]);
            setDonorData(null);
            setEligibility({ eligible: true });
            return;
        }

        api.get(`/api/donors/user/${donorId}`)
            .then(res => {
                setDonorData(res.data);
                if (res.data?.safetyStatus === 'POSITIVE') {
                    showToast({
                        type: 'error',
                        title: 'Urgent medical notice',
                        message: `Positive test result recorded: ${res.data.positiveReason}. Please contact a doctor immediately.`
                    });
                }
            })
            .catch(err => console.error("Error fetching donor data", err));

        api.get(`/api/donors/${donorId}/eligibility`)
            .then(res => setEligibility(res.data))
            .catch(err => console.error("Error fetching eligibility", err));

        api.get(`/api/appointments/donor/${donorId}`)
            .then(res => setAppointments(res.data || []))
            .catch(err => {
                console.error("Error fetching appointments", err);
                setAppointments([]);
            });
    }, [donorId]);

    useEffect(() => {
        api.get('/api/camps')
            .then(res => {
                const all = res.data || [];
                const district = (user?.district || '').toLowerCase();
                const province = (user?.province || '').toLowerCase();
                const matched = all.filter(c => {
                    const cDistrict = String(c.district || '').toLowerCase();
                    const cProvince = String(c.province || '').toLowerCase();
                    return (district && cDistrict === district) || (province && cProvince === province);
                });
                const pool = matched.length > 0 ? matched : all;
                const upcoming = pool
                    .filter(c => (c.campStatus || '').toUpperCase() !== 'ENDED')
                    .sort((a, b) => new Date(`${a.date}T${a.startTime || a.time || '00:00'}`) - new Date(`${b.date}T${b.startTime || b.time || '00:00'}`));
                setNextNearbyCamp(upcoming[0] || null);
            })
            .catch(err => {
                console.error('Error fetching camps', err);
                setNextNearbyCamp(null);
            });
    }, [user]);

    const completedCount = appointments.filter(a => (a.status || '').toLowerCase() === 'completed').length;
    const totalVolume = completedCount * 0.5;

    return (
        <div className="app-shell">
            <div
                aria-hidden="true"
                className="app-backdrop"
                style={{
                    backgroundImage: `linear-gradient(rgba(240, 244, 255, 0.72), rgba(255, 228, 230, 0.72)), url(${donorBackground})`,
                }}
            />
        <div className="container app-page">
            <header className="page-header" style={{ marginBottom: '3rem' }}>
                <div>
                    <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: '0.9rem' }}>
                        Back
                    </button>
                    <div className="page-kicker">Donor</div>
                    <h1 className="page-title">Donor Portal</h1>
                    <p className="page-subtitle">Track your impact, eligibility, and upcoming opportunities.</p>
                </div>
                {donorData?.safetyStatus === 'POSITIVE' && (
                    <div style={{ 
                        marginTop: '1.5rem', 
                        padding: '1.5rem', 
                        background: '#FEF2F2', 
                        border: '1px solid #FCA5A5', 
                        borderRadius: 'var(--radius-md)',
                        color: '#991B1B'
                    }}>
                        <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertTriangle size={24} /> Safety Status: POSITIVE
                        </h3>
                        <p><strong>Reason:</strong> {donorData.positiveReason}</p>
                        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                            You are permanently blocked from further donations. Please consult a medical professional.
                        </p>
                    </div>
                )}
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>

                {/* Eligibility Status Card */}
                <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Droplet size={20} color="#BE123C" /> Eligibility Check
                    </h2>

                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        gap: '1rem'
                    }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: '#EFF6FF',
                            color: '#1D4ED8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2rem'
                        }}>
                            i
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.5rem', color: '#1D4ED8', marginBottom: '0.5rem' }}>
                                Eligibility Checked at Booking
                            </h3>
                            <p style={{ color: 'var(--text-muted)' }}>
                                We verify your eligibility each time you book an appointment.
                            </p>
                        </div>
                        <button
                            className="btn btn-primary"
                            style={{ marginTop: '1rem', width: '100%' }}
                            onClick={() => navigate('/appointments/book')}
                            disabled={donorData?.safetyStatus === 'POSITIVE' || !eligibility.eligible}
                        >
                            {donorData?.safetyStatus === 'POSITIVE' 
                                ? 'Permanently Blocked' 
                                : (!eligibility.eligible ? 'Booking Restricted' : 'Book Appointment Now')}
                        </button>
                        {!eligibility.eligible && eligibility.reason && (
                            <p style={{ fontSize: '0.75rem', color: '#991B1B', marginTop: '0.5rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center' }}>
                                <AlertCircle size={14} />
                                <span>
                                    {formatEligibilityMessage(eligibility)}
                                    {eligibility.nextEligibleDate && ` (Available from ${new Date(eligibility.nextEligibleDate).toLocaleDateString()})`}
                                </span>
                            </p>
                        )}
                    </div>
                </div>

                {/* History / Quick Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Your Impact</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ background: 'rgba(255,255,255,0.5)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)' }}>{completedCount}</div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Lives Saved</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.5)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--accent)' }}>{totalVolume.toFixed(1)}L</div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Volume Donated</div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Next Camp Nearby</h2>
                        {nextNearbyCamp ? (
                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ fontWeight: '600' }}>{nextNearbyCamp.name}</div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                    {new Date(nextNearbyCamp.date).toLocaleDateString()} • {nextNearbyCamp.startTime || nextNearbyCamp.time || 'TBD'}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    {nextNearbyCamp.district}, {nextNearbyCamp.province}
                                </div>
                            </div>
                        ) : (
                            <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                Add your province and district in profile to personalize nearby camps.
                            </div>
                        )}
                        <button
                            className="btn"
                            style={{ width: '100%', border: '1px solid var(--primary)', color: 'var(--primary)' }}
                            onClick={() => navigate('/camps')}
                        >
                            View All Camps
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </div>
    );
};

export default DonorDashboard;
