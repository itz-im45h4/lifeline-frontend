import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import hospitalsBackground from '../assets/hospitals.jpg';
import {
    PROVINCES,
    getDefaultLocationSelection,
    getDistrictsByProvince
} from '../constants/locationData';
import { useToast } from '../context/ToastContext';

const HospitalRequests = () => {
    const navigate = useNavigate();
    const { user, canCreateHospitalRequest } = useAuth();
    const { showToast } = useToast();
    const defaults = getDefaultLocationSelection();

    const [hospitals, setHospitals] = useState([]);
    const [location, setLocation] = useState({
        province: defaults.province,
        district: defaults.district
    });
    const [formData, setFormData] = useState({
        bloodType: 'O+',
        unitsRequested: 1,
        hospital: '',
        priority: 'NORMAL',
        reason: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const districts = getDistrictsByProvince(location.province);

    // Reload hospital list when province/district changes
    useEffect(() => {
        if (!location.province || !location.district) {
            setHospitals([]);
            setFormData(prev => ({ ...prev, hospital: '' }));
            return;
        }
        api.get('/api/hospitals', {
            params: { province: location.province, district: location.district }
        })
            .then(res => {
                const data = res.data || [];
                setHospitals(data);
                // Always reset to the first hospital in the new list
                setFormData(prev => ({ ...prev, hospital: data[0]?.name || '' }));
            })
            .catch(err => {
                console.error('Failed to load hospitals', err);
                setHospitals([]);
                setFormData(prev => ({ ...prev, hospital: '' }));
            });
    }, [location.province, location.district]);

    const createRequest = async (e) => {
        e.preventDefault();
        if (!formData.hospital) {
            showToast({ type: 'error', title: 'Hospital required', message: 'Please select a hospital.' });
            return;
        }
        setSubmitting(true);
        try {
            await api.post('/api/hospital-requests', {
                hospitalUserId: user?.id,
                hospital: formData.hospital,
                bloodType: formData.bloodType,
                unitsRequested: Number(formData.unitsRequested),
                priority: formData.priority,
                reason: formData.reason
            });
            setFormData(prev => ({
                ...prev,
                bloodType: 'O+',
                unitsRequested: 1,
                priority: 'NORMAL',
                reason: ''
            }));
            showToast({ type: 'success', title: 'Request submitted', message: 'It is now available in Inventory Management for processing.' });
        } catch (err) {
            console.error(err);
            showToast({ type: 'error', title: 'Submit failed', message: typeof err?.response?.data === 'string' ? err.response.data : 'Failed to create request.' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="app-shell">
            <div
                aria-hidden="true"
                className="app-backdrop"
                style={{
                    backgroundImage: `linear-gradient(rgba(240, 244, 255, 0.72), rgba(255, 228, 230, 0.72)), url(${hospitalsBackground})`,
                }}
            />
            <div className="container app-page">
                <header className="page-header">
                    <div>
                        <div className="page-kicker">Hospital Desk</div>
                        <h1 className="page-title">Hospital Blood Requests</h1>
                        <p className="page-subtitle">Submit non-emergency blood requests for inventory processing.</p>
                    </div>
                    <button className="btn btn-secondary" onClick={() => navigate(-1)}>Back</button>
                </header>

                {!canCreateHospitalRequest && (
                    <div className="glass-panel section-card">
                        <div style={{ color: 'var(--text-muted)' }}>You do not have permission to create hospital requests.</div>
                    </div>
                )}

                {canCreateHospitalRequest && (
                    <form className="glass-panel section-card" style={{ marginBottom: '1rem' }} onSubmit={createRequest}>
                        <div className="section-header">
                            <div>
                                <h2 className="section-title">Create Hospital Request</h2>
                                <p className="section-subtitle">Choose the location, hospital, units, and priority level.</p>
                            </div>
                        </div>

                        {/* Province & District */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div className="input-group">
                                <label className="input-label">Province</label>
                                <select
                                    className="input-field"
                                    value={location.province}
                                    onChange={e => {
                                        const province = e.target.value;
                                        const nextDistricts = getDistrictsByProvince(province);
                                        setLocation({ province, district: nextDistricts[0] || '' });
                                    }}
                                >
                                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">District</label>
                                <select
                                    className="input-field"
                                    value={location.district}
                                    onChange={e => setLocation(prev => ({ ...prev, district: e.target.value }))}
                                >
                                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Hospital */}
                        <div className="input-group" style={{ marginBottom: '0.75rem' }}>
                            <label className="input-label">Hospital</label>
                            <select
                                className="input-field"
                                value={formData.hospital}
                                onChange={e => setFormData(prev => ({ ...prev, hospital: e.target.value }))}
                                required
                            >
                                {hospitals.length === 0 && <option value="">No hospitals available</option>}
                                {hospitals.map(h => (
                                    <option key={h.id} value={h.name}>{h.name} ({h.district})</option>
                                ))}
                            </select>
                        </div>

                        {/* Blood Type, Units, Priority, Reason */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div className="input-group">
                                <label className="input-label">Blood Type</label>
                                <select className="input-field" value={formData.bloodType} onChange={e => setFormData(prev => ({ ...prev, bloodType: e.target.value }))}>
                                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bt => <option key={bt} value={bt}>{bt}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Units Required</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="input-field"
                                    value={formData.unitsRequested}
                                    onChange={e => setFormData(prev => ({ ...prev, unitsRequested: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Priority</label>
                                <select className="input-field" value={formData.priority} onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value }))}>
                                    <option value="NORMAL">Normal</option>
                                    <option value="HIGH">High</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Reason (Optional)</label>
                                <input
                                    className="input-field"
                                    placeholder="Short reason"
                                    value={formData.reason}
                                    onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </form>
                )}

                <div className="glass-panel section-card">
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                        Submitted requests are handled from `Inventory Management` by authorized staff.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default HospitalRequests;
