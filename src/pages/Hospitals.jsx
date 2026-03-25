import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import hospitalsBackground from '../assets/hospitals.jpg';
import { PROVINCES, getDefaultLocationSelection, getDistrictsByProvince } from '../constants/locationData';

const PAGE_SIZE = 10;

const Hospitals = () => {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const defaults = getDefaultLocationSelection();

    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newHospital, setNewHospital] = useState({
        name: '', province: defaults.province, district: defaults.district, address: '', contactNumber: ''
    });

    const [searchText,    setSearchText]    = useState('');
    const [visibleCount,  setVisibleCount]  = useState(PAGE_SIZE);

    const districts = useMemo(() => getDistrictsByProvince(newHospital.province), [newHospital.province]);

    const fetchHospitals = () => {
        setLoading(true);
        api.get('/api/hospitals')
            .then(res => { setHospitals(res.data || []); setLoading(false); })
            .catch(err => { console.error('Error loading hospitals', err); setHospitals([]); setLoading(false); });
    };

    useEffect(() => { fetchHospitals(); }, []);

    const handleCreateHospital = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/hospitals', newHospital);
            setShowModal(false);
            setNewHospital({ name: '', province: defaults.province, district: defaults.district, address: '', contactNumber: '' });
            fetchHospitals();
            alert('Hospital added successfully.');
        } catch (error) {
            console.error(error);
            alert(error?.response?.data?.message || 'Failed to create hospital.');
        }
    };

    const handleDeleteHospital = async (hospitalId) => {
        if (!window.confirm('Delete this hospital?')) return;
        try {
            await api.delete(`/api/hospitals/${hospitalId}`);
            fetchHospitals();
        } catch (error) {
            console.error(error);
            alert('Failed to delete hospital.');
        }
    };

    const filteredHospitals = useMemo(() => {
        if (!searchText) return hospitals;
        const s = searchText.toLowerCase();
        return hospitals.filter(h =>
            (h.name || '').toLowerCase().includes(s) ||
            (h.district || '').toLowerCase().includes(s) ||
            (h.province || '').toLowerCase().includes(s) ||
            (h.address || '').toLowerCase().includes(s)
        );
    }, [hospitals, searchText]);

    const visibleHospitals = filteredHospitals.slice(0, visibleCount);

    return (
        <div style={{ minHeight: '100vh', width: '100%', position: 'relative', backgroundColor: '#F0F4FF' }}>
            <div
                aria-hidden="true"
                style={{
                    position: 'fixed', inset: 0,
                    backgroundImage: `linear-gradient(rgba(240, 244, 255, 0.72), rgba(255, 228, 230, 0.72)), url(${hospitalsBackground})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat', pointerEvents: 'none', zIndex: 0
                }}
            />
            <div className="container" style={{ position: 'relative', zIndex: 1, padding: '2rem 1rem' }}>
                <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>Hospitals</h1>
                        <p style={{ color: 'var(--text-muted)' }}>Manage hospitals used in requests and bookings</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {isAdmin && (
                            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add New Hospital</button>
                        )}
                        <button className="btn" style={{ border: '1px solid #E2E8F0' }} onClick={() => navigate(-1)}>← Back</button>
                    </div>
                </header>

                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    {/* Search */}
                    <input
                        type="text"
                        value={searchText}
                        onChange={e => { setSearchText(e.target.value); setVisibleCount(PAGE_SIZE); }}
                        placeholder="Search by name, district, province…"
                        style={{
                            width: '100%', padding: '0.5rem 0.85rem', borderRadius: '8px',
                            border: '1px solid #CBD5E1', fontSize: '0.875rem',
                            marginBottom: '0.75rem', outline: 'none',
                            background: 'rgba(255,255,255,0.85)'
                        }}
                    />
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        {filteredHospitals.length} hospital{filteredHospitals.length !== 1 ? 's' : ''} found
                    </div>

                    {loading && <div style={{ color: 'var(--text-muted)' }}>Loading hospitals...</div>}
                    {!loading && filteredHospitals.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No hospitals found.</div>}

                    {!loading && filteredHospitals.length > 0 && (
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {visibleHospitals.map(hospital => (
                                <div key={hospital.id} className="glass-panel" style={{ padding: '0.9rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                        <div>
                                            <div style={{ fontWeight: '600' }}>{hospital.name}</div>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                {hospital.district}, {hospital.province}
                                            </div>
                                            {hospital.address && (
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{hospital.address}</div>
                                            )}
                                            {hospital.contactNumber && (
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Contact: {hospital.contactNumber}</div>
                                            )}
                                        </div>
                                        {isAdmin && (
                                            <button
                                                className="btn"
                                                style={{ border: '1px solid #FCA5A5', color: '#B91C1C' }}
                                                onClick={() => handleDeleteHospital(hospital.id)}
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Show More */}
                    {filteredHospitals.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
                            {visibleCount < filteredHospitals.length && (
                                <button className="btn" style={{ border: '1px solid #CBD5E1', fontSize: '0.8rem' }} onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>
                                    Show More ({filteredHospitals.length - visibleCount} remaining)
                                </button>
                            )}
                            {visibleCount > PAGE_SIZE && (
                                <button className="btn" style={{ border: '1px solid #CBD5E1', fontSize: '0.8rem' }} onClick={() => setVisibleCount(PAGE_SIZE)}>
                                    Show Less
                                </button>
                            )}
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Showing {Math.min(visibleCount, filteredHospitals.length)} of {filteredHospitals.length}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ background: 'white', padding: '2rem', width: '100%', maxWidth: '560px' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Add New Hospital</h2>
                        <form onSubmit={handleCreateHospital}>
                            <div className="input-group">
                                <label className="input-label">Hospital Name</label>
                                <input className="input-field" required value={newHospital.name} onChange={e => setNewHospital({ ...newHospital, name: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Province</label>
                                <select className="input-field" value={newHospital.province} onChange={e => {
                                    const province = e.target.value;
                                    const firstDistrict = getDistrictsByProvince(province)[0] || '';
                                    setNewHospital({ ...newHospital, province, district: firstDistrict });
                                }}>
                                    {PROVINCES.map(province => <option key={province} value={province}>{province}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">District</label>
                                <select className="input-field" value={newHospital.district} onChange={e => setNewHospital({ ...newHospital, district: e.target.value })}>
                                    {districts.map(district => <option key={district} value={district}>{district}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Address</label>
                                <input className="input-field" value={newHospital.address} onChange={e => setNewHospital({ ...newHospital, address: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Contact Number</label>
                                <input className="input-field" value={newHospital.contactNumber} onChange={e => setNewHospital({ ...newHospital, contactNumber: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Add Hospital</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Hospitals;
