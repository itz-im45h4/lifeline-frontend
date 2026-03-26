import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, Calendar, Clock, Hospital } from 'lucide-react';
import {
    PROVINCES,
    getDefaultLocationSelection,
    getDistrictsByProvince
} from '../constants/locationData';
import campsBackground from '../assets/camps.jpg';
import { useToast } from '../context/ToastContext';
import { useConfirmDialog } from '../context/ConfirmDialogContext';
import FeedbackState from '../components/FeedbackState';
import StatusBadge from '../components/StatusBadge';

const PAGE_SIZE = 10;

const CampMap = () => {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const { showToast } = useToast();
    const { confirm } = useConfirmDialog();
    const defaults = getDefaultLocationSelection();

    const [camps, setCamps]               = useState([]);
    const [loading, setLoading]           = useState(true);
    const [showModal, setShowModal]       = useState(false);
    const [newCamp, setNewCamp]           = useState({
        name: '', province: defaults.province, district: defaults.district,
        nearestHospital: '', location: '', date: '', startTime: '', endTime: '', googleMapLink: ''
    });
    const [hospitals, setHospitals]         = useState([]);
    const [selectedCamp, setSelectedCamp]   = useState(null);
    const [interestSubmitting, setInterestSubmitting] = useState(false);

    // Search + pagination
    const [searchText,   setSearchText]   = useState('');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    const provinces = PROVINCES;
    const districts = getDistrictsByProvince(newCamp.province);

    useEffect(() => {
        if (!newCamp.province || !newCamp.district) { setHospitals([]); return; }
        api.get('/api/hospitals', { params: { province: newCamp.province, district: newCamp.district } })
            .then(res => {
                const list = (res.data || []).map(item => item.name);
                setHospitals(list);
                setNewCamp(prev => ({
                    ...prev,
                    nearestHospital: list.includes(prev.nearestHospital) ? prev.nearestHospital : (list[0] || '')
                }));
            })
            .catch(err => { console.error('Error loading hospitals', err); setHospitals([]); setNewCamp(prev => ({ ...prev, nearestHospital: '' })); });
    }, [newCamp.province, newCamp.district]);

    const fetchCamps = () => {
        setLoading(true);
        api.get('/api/camps')
            .then(res => { setCamps(res.data || []); setLoading(false); })
            .catch(err => { console.error('Error fetching camps', err); setLoading(false); });
    };

    useEffect(() => { fetchCamps(); }, []);

    const handleCreateCamp = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/camps/create', newCamp);
            setShowModal(false);
            setNewCamp({ name: '', province: defaults.province, district: defaults.district, nearestHospital: '', location: '', date: '', startTime: '', endTime: '', googleMapLink: '' });
            fetchCamps();
            showToast({ type: 'success', title: 'Camp created', message: 'The donation camp is now live in the schedule.' });
        } catch (error) { console.error(error); showToast({ type: 'error', title: 'Create failed', message: 'Failed to create camp.' }); }
    };

    const handleDeleteCamp = async (campId) => {
        const confirmed = await confirm({
            title: 'Delete camp?',
            message: 'This donation camp event will be permanently removed.',
            confirmLabel: 'Delete'
        });
        if (!confirmed) return;
        try {
            await api.delete(`/api/camps/${campId}`);
            setSelectedCamp(null);
            fetchCamps();
            showToast({ type: 'success', title: 'Camp deleted', message: 'The donation camp was removed.' });
        } catch (error) { console.error(error); showToast({ type: 'error', title: 'Delete failed', message: 'Failed to delete camp.' }); }
    };

    const handleInterest = async (campId) => {
        if (interestSubmitting) return;
        setInterestSubmitting(true);
        try {
            const res = await api.post(`/api/camps/${campId}/interest`);
            setCamps(prev => prev.map(c => (c.id === campId ? res.data : c)));
            if (selectedCamp?.id === campId) setSelectedCamp(res.data);
            showToast({ type: 'success', title: 'Interest registered', message: 'You will be notified about this camp.' });
        } catch (error) { console.error(error); showToast({ type: 'error', title: 'Unable to register interest', message: 'Please try again in a moment.' }); }
        finally { setInterestSubmitting(false); }
    };

    const getStatusStyle = (status) => {
        if (status === 'ONGOING') return { background: '#DCFCE7', color: '#166534' };
        if (status === 'ENDED')   return { background: '#F3F4F6', color: '#374151' };
        return { background: '#FEE2E2', color: '#9F1239' };
    };

    const sortedCamps = useMemo(() => {
        return [...camps].sort((a, b) => {
            const aDate = new Date(`${a.date}T${a.startTime || a.time || '00:00'}`).getTime();
            const bDate = new Date(`${b.date}T${b.startTime || b.time || '00:00'}`).getTime();
            return aDate - bDate;
        });
    }, [camps]);

    const filteredCamps = useMemo(() => {
        if (!searchText) return sortedCamps;
        const s = searchText.toLowerCase();
        return sortedCamps.filter(c =>
            (c.name     || '').toLowerCase().includes(s) ||
            (c.location || '').toLowerCase().includes(s) ||
            (c.district || '').toLowerCase().includes(s) ||
            (c.province || '').toLowerCase().includes(s)
        );
    }, [sortedCamps, searchText]);

    const visibleCamps = filteredCamps.slice(0, visibleCount);

    return (
        <div style={{ minHeight: '100vh', width: '100%', position: 'relative', backgroundColor: '#F0F4FF' }}>
            <div
                aria-hidden="true"
                style={{
                    position: 'fixed', inset: 0,
                    backgroundImage: `linear-gradient(rgba(240, 244, 255, 0.72), rgba(255, 228, 230, 0.72)), url(${campsBackground})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat', pointerEvents: 'none', zIndex: 0
                }}
            />
            <div className="container" style={{ position: 'relative', zIndex: 1, padding: '2rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Donation Camps</h1>
                        <p style={{ color: 'var(--text-muted)' }}>Find a donation event near you</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {isAdmin && (
                            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add New Camp</button>
                        )}
                        <button className="btn" style={{ border: '1px solid #E2E8F0' }} onClick={() => navigate(-1)}>← Back</button>
                    </div>
                </div>

                {/* Search bar */}
                <input
                    type="text"
                    value={searchText}
                    onChange={e => { setSearchText(e.target.value); setVisibleCount(PAGE_SIZE); }}
                    placeholder="Search by camp name, location, district, province…"
                    style={{
                        width: '100%', padding: '0.55rem 1rem', borderRadius: '8px',
                        border: '1px solid #CBD5E1', fontSize: '0.875rem',
                        marginBottom: '0.5rem', outline: 'none',
                        background: 'rgba(255,255,255,0.85)'
                    }}
                />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    {filteredCamps.length} camp{filteredCamps.length !== 1 ? 's' : ''} found
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    {loading && (
                        <div style={{ gridColumn: '1/-1' }}>
                            <FeedbackState variant="loading" title="Loading camps" message="Fetching upcoming donation events." />
                        </div>
                    )}
                    {!loading && visibleCamps.map(camp => (
                        <div key={camp.id} className="glass-panel" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ height: '8px', width: '100%', background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)' }}></div>
                            <div style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                    <h3 style={{ fontSize: '1.25rem' }}>{camp.name}</h3>
                                    <StatusBadge status={camp.campStatus || 'UPCOMING'} style={getStatusStyle(camp.campStatus)}>
                                        {camp.campStatus || 'UPCOMING'}
                                    </StatusBadge>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
                                    <MapPin size={16} color="#64748B" /><span>{camp.location} ({camp.district}, {camp.province})</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
                                    <Calendar size={16} color="#64748B" /><span>{new Date(camp.date).toLocaleDateString()}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                                    <Clock size={16} color="#64748B" /><span>{camp.startTime || camp.time || 'TBD'} - {camp.endTime || 'TBD'}</span>
                                </div>
                                {isAdmin && (
                                    <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--secondary)' }}>
                                        Interested: {camp.interestCount || 0}
                                    </div>
                                )}
                                <div style={{ marginTop: 'auto' }}>
                                    <button className="btn" style={{ width: '100%', background: '#FFF1F2', color: 'var(--primary)', fontWeight: '600' }} onClick={() => setSelectedCamp(camp)}>
                                        View Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredCamps.length === 0 && !loading && (
                        <div style={{ gridColumn: '1/-1' }}>
                            <FeedbackState variant="empty" title="No camps found" message="Try changing the search or create a new camp." />
                        </div>
                    )}
                </div>

                {/* Show More */}
                {filteredCamps.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', alignItems: 'center' }}>
                        {visibleCount < filteredCamps.length && (
                            <button className="btn" style={{ border: '1px solid #CBD5E1', fontSize: '0.8rem' }} onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>
                                Show More ({filteredCamps.length - visibleCount} remaining)
                            </button>
                        )}
                        {visibleCount > PAGE_SIZE && (
                            <button className="btn" style={{ border: '1px solid #CBD5E1', fontSize: '0.8rem' }} onClick={() => setVisibleCount(PAGE_SIZE)}>
                                Show Less
                            </button>
                        )}
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Showing {Math.min(visibleCount, filteredCamps.length)} of {filteredCamps.length}
                        </span>
                    </div>
                )}
            </div>

            {/* Create Camp Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ background: 'white', padding: '2rem', width: '100%', maxWidth: '560px' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Add New Donation Camp</h2>
                        <form onSubmit={handleCreateCamp}>
                            <div className="input-group">
                                <label className="input-label">Camp Name</label>
                                <input className="input-field" required value={newCamp.name} onChange={e => setNewCamp({ ...newCamp, name: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Province</label>
                                <select className="input-field" value={newCamp.province} onChange={e => {
                                    const province = e.target.value;
                                    const firstDistrict = getDistrictsByProvince(province)[0];
                                    setNewCamp({ ...newCamp, province, district: firstDistrict, nearestHospital: '' });
                                }}>
                                    {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">District</label>
                                <select className="input-field" value={newCamp.district} onChange={e => {
                                    setNewCamp({ ...newCamp, district: e.target.value, nearestHospital: '' });
                                }}>
                                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Nearest Hospital</label>
                                <select className="input-field" value={newCamp.nearestHospital} onChange={e => setNewCamp({ ...newCamp, nearestHospital: e.target.value })}>
                                    {hospitals.length === 0 && <option value="">No hospitals available</option>}
                                    {hospitals.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Location</label>
                                <input className="input-field" required value={newCamp.location} onChange={e => setNewCamp({ ...newCamp, location: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Google Location Link</label>
                                <input className="input-field" placeholder="https://maps.google.com/..." value={newCamp.googleMapLink} onChange={e => setNewCamp({ ...newCamp, googleMapLink: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <div className="input-group">
                                    <label className="input-label">Date</label>
                                    <input type="date" className="input-field" required value={newCamp.date} min={new Date().toISOString().slice(0, 10)} onChange={e => setNewCamp({ ...newCamp, date: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Start Time</label>
                                    <input type="time" className="input-field" required value={newCamp.startTime} onChange={e => setNewCamp({ ...newCamp, startTime: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">End Time</label>
                                    <input type="time" className="input-field" required value={newCamp.endTime} onChange={e => setNewCamp({ ...newCamp, endTime: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ flex: 1, border: '1px solid #E2E8F0' }}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Camp</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Camp Detail Modal */}
            {selectedCamp && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ background: 'white', padding: '2rem', width: '100%', maxWidth: '560px' }}>
                        <h2 style={{ marginBottom: '1rem' }}>{selectedCamp.name}</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--secondary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={16} /> {selectedCamp.location} ({selectedCamp.district}, {selectedCamp.province})</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Hospital size={16} /> Nearest: {selectedCamp.nearestHospital || 'N/A'}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={16} /> {new Date(selectedCamp.date).toLocaleDateString()}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16} /> {selectedCamp.startTime || selectedCamp.time || 'TBD'} - {selectedCamp.endTime || 'TBD'}</div>
                            <a
                                href={selectedCamp.googleMapLink || (selectedCamp.lat && selectedCamp.lng
                                    ? `https://www.google.com/maps?q=${selectedCamp.lat},${selectedCamp.lng}`
                                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedCamp.location)}`)}
                                target="_blank" rel="noreferrer"
                                style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}
                            >
                                Open in Google Maps
                            </a>
                            {isAdmin && <div style={{ fontSize: '0.875rem' }}>Interested: {selectedCamp.interestCount || 0}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="button" className="btn" onClick={() => setSelectedCamp(null)} style={{ flex: 1, border: '1px solid #E2E8F0' }}>Close</button>
                            {isAdmin ? (
                                <button type="button" className="btn" style={{ flex: 1, background: '#FEE2E2', color: '#B91C1C' }} onClick={() => handleDeleteCamp(selectedCamp.id)}>
                                    Delete Camp
                                </button>
                            ) : (
                                <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleInterest(selectedCamp.id)} disabled={interestSubmitting}>
                                    {interestSubmitting ? 'Submitting...' : "I'm Interested"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CampMap;
