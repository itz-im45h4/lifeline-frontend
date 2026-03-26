import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import emergencyBackground from '../assets/emergency.jpg';
import { Ambulance, Hospital, Megaphone } from 'lucide-react';
import {
    PROVINCES,
    getDefaultLocationSelection,
    getDistrictsByProvince
} from '../constants/locationData';

const EmergencyRequests = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const defaults = getDefaultLocationSelection();

    const [hospitals, setHospitals] = useState([]);
    const [location, setLocation] = useState({
        province: defaults.province,
        district: defaults.district
    });
    const [request, setRequest] = useState({
        bloodType: 'A+',
        units: 1,
        hospital: '',
        urgency: 'NORMAL',
        reason: ''
    });
    const [status, setStatus] = useState('idle');
    const [responseMeta, setResponseMeta] = useState(null);
    const districts = getDistrictsByProvince(location.province);

    useEffect(() => {
        if (!location.province || !location.district) {
            setHospitals([]);
            setRequest(prev => ({ ...prev, hospital: '' }));
            return;
        }
        api.get('/api/hospitals', {
            params: {
                province: location.province,
                district: location.district
            }
        })
            .then(res => {
                const data = res.data || [];
                setHospitals(data);
                setRequest(prev => ({
                    ...prev,
                    hospital: data[0]?.name || ''
                }));
            })
            .catch(err => {
                console.error('Failed to load hospitals', err);
                setHospitals([]);
                setRequest(prev => ({ ...prev, hospital: '' }));
            });
    }, [location.province, location.district]);

    const isCriticalUrgency = useMemo(
        () => String(request.urgency || '').toUpperCase() === 'CRITICAL',
        [request.urgency]
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('sending');
        try {
            const res = await api.post('/api/emergency/request', {
                bloodType: request.bloodType,
                units: Number(request.units),
                hospital: request.hospital,
                urgency: request.urgency,
                reason: request.reason,
                hospitalUserId: user?.id
            });
            setResponseMeta(res?.data || null);
            setStatus('success');
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    if (status === 'success') {
        const broadcastTriggered = Boolean(responseMeta?.broadcastTriggered);
        return (
            <div className="app-shell">
                <div
                    aria-hidden="true"
                    className="app-backdrop"
                    style={{
                        backgroundImage: `linear-gradient(rgba(240, 244, 255, 0.72), rgba(255, 228, 230, 0.72)), url(${emergencyBackground})`,
                    }}
                />
                <div className="container flex-center app-page-centered">
                    <div className="glass-panel section-card" style={{ padding: '3rem', textAlign: 'center', maxWidth: '560px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                            {broadcastTriggered ? <Ambulance size={72} color="#BE123C" /> : <Hospital size={72} color="#BE123C" />}
                        </div>
                        <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>
                            {broadcastTriggered ? 'Emergency Broadcast Sent!' : 'Request Submitted'}
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                            {responseMeta?.message || (broadcastTriggered
                                ? `All nearby donors with blood type ${request.bloodType} were notified.`
                                : 'This request now appears in Inventory Management as a normal queue item.')}
                        </p>
                        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Return to Dashboard</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app-shell">
            <div
                aria-hidden="true"
                className="app-backdrop"
                style={{
                    backgroundImage: `linear-gradient(rgba(240, 244, 255, 0.72), rgba(255, 228, 230, 0.72)), url(${emergencyBackground})`,
                }}
            />
            <div className="container flex-center app-page-centered">
                <div className="glass-panel animate-fade-in section-card" style={{ padding: '2.5rem', width: '100%', maxWidth: '640px', borderLeft: '4px solid var(--primary)' }}>
                    <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: '1rem' }}>
                        Back
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FECDD3', color: '#BE123C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Megaphone size={24} />
                        </div>
                        <div>
                            <div className="page-kicker" style={{ marginBottom: '0.55rem', color: '#BE123C' }}>Hospital Requests</div>
                            <h2 style={{ fontSize: '1.7rem', color: '#BE123C' }}>Request Blood Units</h2>
                            <p style={{ color: 'var(--text-muted)' }}>Emergency and normal requests are handled in one operational flow.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="input-group">
                                <label className="input-label">Blood Type Needed</label>
                                <select
                                    className="input-field"
                                    value={request.bloodType}
                                    onChange={e => setRequest({ ...request, bloodType: e.target.value })}
                                >
                                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Units Required</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    className="input-field"
                                    value={request.units}
                                    onChange={e => setRequest({ ...request, units: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="input-group">
                                <label className="input-label">Province</label>
                                <select
                                    className="input-field"
                                    value={location.province}
                                    onChange={e => {
                                        const province = e.target.value;
                                        const nextDistricts = getDistrictsByProvince(province);
                                        const district = nextDistricts[0] || '';
                                        setLocation({ province, district });
                                    }}
                                >
                                    {PROVINCES.map(province => (
                                        <option key={province} value={province}>{province}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">District</label>
                                <select
                                    className="input-field"
                                    value={location.district}
                                    onChange={e => setLocation(prev => ({ ...prev, district: e.target.value }))}
                                >
                                    {districts.map(district => (
                                        <option key={district} value={district}>{district}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="input-group" style={{ marginBottom: '1rem' }}>
                            <label className="input-label">Urgency</label>
                            <select
                                className="input-field"
                                value={request.urgency}
                                onChange={e => setRequest({ ...request, urgency: e.target.value })}
                            >
                                <option value="NORMAL">Normal</option>
                                <option value="CRITICAL">Critical</option>
                            </select>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Hospital</label>
                            <select
                                className="input-field"
                                value={request.hospital}
                                onChange={e => setRequest({ ...request, hospital: e.target.value })}
                                required
                            >
                                {hospitals.length === 0 && <option value="">No hospitals available</option>}
                                {hospitals.map(hospital => (
                                    <option key={hospital.id} value={hospital.name}>
                                        {hospital.name} ({hospital.district})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Reason (Optional)</label>
                            <input
                                className="input-field"
                                value={request.reason}
                                onChange={e => setRequest({ ...request, reason: e.target.value })}
                                placeholder="Short reason for this request"
                            />
                        </div>

                        <div style={{ padding: '1rem', background: '#FFF1F2', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                            <p style={{ color: '#BE123C', fontSize: '0.875rem', fontWeight: '500' }}>
                                {isCriticalUrgency
                                    ? 'Critical urgency sends this request to the Emergency Priority Queue and triggers donor broadcast.'
                                    : 'Normal urgency sends this request to the normal queue without broadcast.'}
                            </p>
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem' }} disabled={status === 'sending'}>
                            {status === 'sending'
                                ? 'Submitting...'
                                : (isCriticalUrgency ? 'BROADCAST + SUBMIT' : 'SUBMIT REQUEST')}
                        </button>

                        {status === 'error' && (
                            <div style={{ marginTop: '0.75rem', color: '#B91C1C', fontSize: '0.875rem' }}>
                                Failed to submit request. Please try again.
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EmergencyRequests;
