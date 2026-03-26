import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { XCircle } from 'lucide-react';
import DonorEligibility from './DonorEligibility';
import { useToast } from '../context/ToastContext';
import FeedbackState from '../components/FeedbackState';
import {
    PROVINCES,
    getDistrictsByProvince,
    getDefaultLocationSelection
} from '../constants/locationData';

const BookAppointment = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();
    const currentUserId = user?.id || user?.userId;
    const defaults = getDefaultLocationSelection();
    const [step, setStep] = useState(1);
    const [eligibilityInfo, setEligibilityInfo] = useState({ checking: true, eligible: true });
    const [questionnaireEligible, setQuestionnaireEligible] = useState(null);
    const [questionnaireAnswers, setQuestionnaireAnswers] = useState(null);
    const [camps, setCamps] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [loadingCenters, setLoadingCenters] = useState(true);
    const [location, setLocation] = useState({
        province: user?.province || defaults.province,
        district: user?.district || defaults.district
    });
    const [formData, setFormData] = useState({
        centerKey: '',
        date: '',
        time: '',
        bloodType: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const isSubmittingRef = React.useRef(false);
    
    const formatEligibilityMessage = (details = {}) => {
        if (details?.type === 'SAFETY') {
            return details.reason || 'You are not eligible to donate because your latest test result is positive.';
        }
        if (details?.type === 'RECENT_DONATION') {
            const dayText = typeof details.daysRemaining === 'number'
                ? ` Please wait ${details.daysRemaining} more day(s).`
                : '';
            const nextDateText = details.nextEligibleDate
                ? ` Next eligible date: ${new Date(details.nextEligibleDate).toLocaleDateString()}.`
                : '';
            return `${details.reason || 'You donated recently and must wait at least 60 days before booking again.'}${dayText}${nextDateText}`;
        }
        return details.reason || 'You are not eligible to donate right now.';
    };

    useEffect(() => {
        if (!currentUserId) {
            setEligibilityInfo({ checking: false, eligible: false, reason: 'Unable to verify account. Please sign in again.' });
            return;
        }

        const checkEligibility = async () => {
            try {
                const res = await api.get(`/api/donors/${currentUserId}/eligibility`);
                setEligibilityInfo({
                    checking: false,
                    eligible: res.data.eligible,
                    reason: res.data.reason,
                    type: res.data.type,
                    daysRemaining: res.data.daysRemaining,
                    nextEligibleDate: res.data.nextEligibleDate
                });
            } catch (err) {
                console.error("Failed to check eligibility", err);
                setEligibilityInfo({ checking: false, eligible: true });
            }
        };
        checkEligibility();
    }, [currentUserId]);

    useEffect(() => {
        const loadCenters = async () => {
            setLoadingCenters(true);
            try {
                const [campRes, hospitalRes] = await Promise.all([
                    api.get('/api/camps'),
                    api.get('/api/hospitals', {
                        params: {
                            province: location.province,
                            district: location.district
                        }
                    })
                ]);
                setCamps(campRes.data || []);
                setHospitals(hospitalRes.data || []);
            } catch (err) {
                console.error('Failed to load centers', err);
                setHospitals([]);
            } finally {
                setLoadingCenters(false);
            }
        };
        loadCenters();
    }, [location.province, location.district]);

    const centers = useMemo(() => {
        const hospitalList = (hospitals || []).map((hospital) => ({
            id: String(hospital.id),
            label: hospital.name,
            type: 'HOSPITAL',
            province: location.province,
            district: location.district
        }));

        const campCenters = (camps || [])
            .filter(camp => (camp.campStatus || '').toUpperCase() !== 'ENDED')
            .filter(camp => String(camp.province) === location.province && String(camp.district) === location.district)
            .map((camp) => ({
                id: String(camp.id),
                label: camp.name,
                type: 'CAMP',
                date: camp.date,
                startTime: camp.startTime || camp.time,
                endTime: camp.endTime,
                campStatus: camp.campStatus,
                province: camp.province,
                district: camp.district
            }));
        
        return [...hospitalList, ...campCenters];
    }, [camps, hospitals, location]);

    useEffect(() => {
        if (centers.length > 0 && !formData.centerKey) {
            setFormData(prev => ({ ...prev, centerKey: `${centers[0].type}:${centers[0].id}` }));
        } else if (centers.length === 0) {
            setFormData(prev => ({ ...prev, centerKey: '' }));
        }
    }, [centers]);

    const selectedCenter = centers.find((c) => `${c.type}:${c.id}` === formData.centerKey);

    const handleEligibilityComplete = (isEligible, answers) => {
        setQuestionnaireEligible(isEligible);
        setQuestionnaireAnswers({
            hasDiagnosedDiseases: Boolean(answers?.diseases),
            takingMedications: Boolean(answers?.medications),
            recentSurgery: Boolean(answers?.surgery),
            recentTravel: Boolean(answers?.travel)
        });
        if (isEligible) {
            setFormData(prev => ({ ...prev, bloodType: answers?.bloodType || '' }));
            setStep(2);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setSubmitting(true);

        const donorId = currentUserId;

        try {
            if (!donorId) {
                showToast({ type: 'error', title: 'Account required', message: 'Unable to identify your account. Please sign in again.' });
                setSubmitting(false);
                isSubmittingRef.current = false;
                return;
            }

            if (!questionnaireEligible) {
                showToast({ type: 'error', title: 'Eligibility required', message: 'Please complete eligibility questions before booking.' });
                setSubmitting(false);
                isSubmittingRef.current = false;
                return;
            }
            if (!questionnaireAnswers) {
                showToast({ type: 'error', title: 'Answers missing', message: 'Please complete eligibility questions again.' });
                setSubmitting(false);
                isSubmittingRef.current = false;
                return;
            }

            if (!selectedCenter) {
                showToast({ type: 'error', title: 'Center required', message: 'Please select a donation center.' });
                setSubmitting(false);
                isSubmittingRef.current = false;
                return;
            }

            if (selectedCenter.type === 'CAMP') {
                if (formData.date !== selectedCenter.date) {
                    showToast({ type: 'error', title: 'Invalid camp date', message: `This camp only accepts bookings on ${selectedCenter.date}.` });
                    setSubmitting(false);
                    isSubmittingRef.current = false;
                    return;
                }
                if (selectedCenter.startTime && formData.time < selectedCenter.startTime) {
                    showToast({ type: 'error', title: 'Invalid time', message: `Booking must be after camp start time ${selectedCenter.startTime}.` });
                    setSubmitting(false);
                    isSubmittingRef.current = false;
                    return;
                }
                if (selectedCenter.endTime && formData.time > selectedCenter.endTime) {
                    showToast({ type: 'error', title: 'Invalid time', message: `Booking must be before camp end time ${selectedCenter.endTime}.` });
                    setSubmitting(false);
                    isSubmittingRef.current = false;
                    return;
                }
            }

            const localDateTime = `${formData.date}T${formData.time}`;

            const eligibilityResponse = await api.get(`/api/donors/${donorId}/eligibility`);
            const isEligible = Boolean(eligibilityResponse.data?.eligible);
            if (!isEligible) {
                showToast({ type: 'error', title: 'Booking restricted', message: formatEligibilityMessage(eligibilityResponse.data) });
                setSubmitting(false);
                isSubmittingRef.current = false;
                return;
            }

            await api.post('/api/appointments/book', {
                donorId,
                donorUserId: donorId,
                donorName: user?.name || 'Unknown User',
                hospitalId: parseInt(selectedCenter.id, 10),
                centerType: selectedCenter.type,
                centerName: selectedCenter.label,
                date: localDateTime,
                bloodType: formData.bloodType,
                hasDiagnosedDiseases: questionnaireAnswers.hasDiagnosedDiseases,
                takingMedications: questionnaireAnswers.takingMedications,
                recentSurgery: questionnaireAnswers.recentSurgery,
                recentTravel: questionnaireAnswers.recentTravel
            });

            showToast({ type: 'success', title: 'Appointment scheduled', message: 'Your donation appointment was scheduled successfully.' });
            navigate('/donors', { replace: true });
        } catch (error) {
            console.error(error);
            const msg = error?.response?.data;
            showToast({ type: 'error', title: 'Booking failed', message: typeof msg === 'string' ? msg : 'Failed to book appointment. Please try another time.' });
        } finally {
            setSubmitting(false);
            isSubmittingRef.current = false;
        }
    };

    if (eligibilityInfo.checking) {
        return (
            <div className="container flex-center" style={{ minHeight: '80vh' }}>
                <FeedbackState variant="loading" title="Verifying eligibility" message="Checking your donor record and recent donation history." />
            </div>
        );
    }

    if (!eligibilityInfo.eligible) {
        return (
            <div className="container flex-center" style={{ minHeight: '80vh' }}>
                <div className="glass-panel animate-fade-in" style={{ padding: '3rem', textAlign: 'center', maxWidth: '500px', borderTop: '4px solid #EF4444' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                        <XCircle size={64} color="#B91C1C" />
                    </div>
                    <h2 style={{ color: '#991B1B', marginBottom: '1rem' }}>Booking Restricted</h2>
                    <p style={{ color: 'var(--text-main)', marginBottom: '1.5rem', fontWeight: '500' }}>
                        {formatEligibilityMessage(eligibilityInfo)}
                    </p>
                    {eligibilityInfo.nextEligibleDate && (
                        <div style={{ background: '#FEF2F2', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
                            <p style={{ color: '#991B1B', fontSize: '0.875rem' }}>
                                You will be eligible to donate again on: <br />
                                <strong style={{ fontSize: '1.1rem' }}>{new Date(eligibilityInfo.nextEligibleDate).toLocaleDateString()}</strong>
                            </p>
                        </div>
                    )}
                    <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Return to Main Menu</button>
                    <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        If you believe this is an error, please contact the blood bank support.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container flex-center" style={{ minHeight: '80vh' }}>
            <div className="glass-panel animate-fade-in" style={{ padding: '2.5rem', width: '100%', maxWidth: '560px' }}>
                <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    {step === 1 ? 'Step 1: Eligibility Questions' : 'Step 2: Schedule Donation'}
                </h2>

                {step === 1 ? (
                    <div>
                        <DonorEligibility onComplete={handleEligibilityComplete} />
                        {questionnaireEligible === false && (
                            <div style={{ marginTop: '1rem', color: '#B91C1C', textAlign: 'center' }}>
                                You are currently not eligible based on your responses.
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="input-group">
                                <label className="input-label">Province</label>
                                <select
                                    className="input-field"
                                    value={location.province}
                                    onChange={e => {
                                        const prov = e.target.value;
                                        const dists = getDistrictsByProvince(prov);
                                        setLocation({ province: prov, district: dists[0] });
                                        setFormData(prev => ({ ...prev, centerKey: '' }));
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
                                    onChange={e => {
                                        setLocation(prev => ({ ...prev, district: e.target.value }));
                                        setFormData(prev => ({ ...prev, centerKey: '' }));
                                    }}
                                >
                                    {getDistrictsByProvince(location.province).map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Select Center (Hospital or Donation Camp)</label>
                            <select
                                className="input-field"
                                value={formData.centerKey}
                                onChange={e => setFormData({ ...formData, centerKey: e.target.value })}
                                disabled={loadingCenters || centers.length === 0}
                                required
                            >
                                {centers.length === 0 && <option value="">No centers available in this area</option>}
                                <optgroup label="Hospitals">
                                    {centers.filter(c => c.type === 'HOSPITAL').map(center => (
                                        <option key={`HOSPITAL:${center.id}`} value={`HOSPITAL:${center.id}`}>{center.label}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Donation Camps">
                                    {centers.filter(c => c.type === 'CAMP').map(camp => (
                                        <option key={`CAMP:${camp.id}`} value={`CAMP:${camp.id}`}>
                                            {camp.label} ({camp.campStatus || 'UPCOMING'})
                                        </option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>

                        {selectedCenter?.type === 'CAMP' && (
                            <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                Camp window: {selectedCenter.date} {selectedCenter.startTime || '--:--'} - {selectedCenter.endTime || '--:--'}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="input-group">
                                <label className="input-label">Date</label>
                                <input
                                    type="date"
                                    className="input-field"
                                    required
                                    value={formData.date}
                                    min={new Date().toISOString().slice(0, 10)}
                                    max={selectedCenter?.type === 'CAMP' ? selectedCenter.date : undefined}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Time</label>
                                <input
                                    type="time"
                                    className="input-field"
                                    required
                                    value={formData.time}
                                    min={selectedCenter?.type === 'CAMP' ? selectedCenter.startTime : undefined}
                                    max={selectedCenter?.type === 'CAMP' ? selectedCenter.endTime : undefined}
                                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                            <button
                                type="button"
                                className="btn"
                                style={{ flex: 1, border: '1px solid #E2E8F0' }}
                                onClick={() => setStep(1)}
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ flex: 1 }}
                                disabled={submitting}
                            >
                                {submitting ? 'Confirming...' : 'Confirm Booking'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default BookAppointment;
