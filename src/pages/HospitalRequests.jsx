import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import hospitalsBackground from '../assets/hospitals.jpg';

const HospitalRequests = () => {
    const navigate = useNavigate();
    const { user, canCreateHospitalRequest } = useAuth();
    const [formData, setFormData] = useState({
        bloodType: 'O+',
        unitsRequested: 1,
        priority: 'NORMAL',
        reason: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const createRequest = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/api/hospital-requests', {
                hospitalUserId: user?.id,
                bloodType: formData.bloodType,
                unitsRequested: Number(formData.unitsRequested),
                priority: formData.priority,
                reason: formData.reason
            });
            setFormData({
                bloodType: 'O+',
                unitsRequested: 1,
                priority: 'NORMAL',
                reason: ''
            });
            alert('Request submitted. It is now available in Inventory Management for processing.');
        } catch (err) {
            console.error(err);
            alert(typeof err?.response?.data === 'string' ? err.response.data : 'Failed to create request.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', width: '100%', position: 'relative', backgroundColor: '#F0F4FF' }}>
            <div
                aria-hidden="true"
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundImage: `linear-gradient(rgba(240, 244, 255, 0.72), rgba(255, 228, 230, 0.72)), url(${hospitalsBackground})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    pointerEvents: 'none',
                    zIndex: 0
                }}
            />
        <div className="container" style={{ position: 'relative', zIndex: 1, padding: '2rem 1rem' }}>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>Hospital Blood Requests</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Submit non-emergency blood requests</p>
                </div>
                <button className="btn" style={{ border: '1px solid #E2E8F0' }} onClick={() => navigate(-1)}>Back</button>
            </header>

            {!canCreateHospitalRequest && (
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <div style={{ color: 'var(--text-muted)' }}>You do not have permission to create hospital requests.</div>
                </div>
            )}

            {canCreateHospitalRequest && (
                <form className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1rem' }} onSubmit={createRequest}>
                    <h2 style={{ marginBottom: '0.9rem', fontSize: '1.1rem' }}>Create Hospital Request</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
                        <select className="input-field" value={formData.bloodType} onChange={(e) => setFormData(prev => ({ ...prev, bloodType: e.target.value }))}>
                            {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bt) => <option key={bt} value={bt}>{bt}</option>)}
                        </select>
                        <input
                            type="number"
                            min="1"
                            className="input-field"
                            value={formData.unitsRequested}
                            onChange={(e) => setFormData(prev => ({ ...prev, unitsRequested: e.target.value }))}
                            required
                        />
                        <select className="input-field" value={formData.priority} onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}>
                            <option value="NORMAL">Normal</option>
                            <option value="HIGH">High</option>
                        </select>
                        <input
                            className="input-field"
                            placeholder="Reason"
                            value={formData.reason}
                            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ marginTop: '0.75rem' }} disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                </form>
            )}

            <div className="glass-panel" style={{ padding: '1rem' }}>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                    Submitted requests are handled from `Inventory Management` by authorized staff.
                </p>
            </div>
        </div>
        </div>
    );
};

export default HospitalRequests;
