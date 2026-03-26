import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import hospitalsBackground from '../assets/hospitals.jpg';
import { Edit2, Trash2 } from 'lucide-react';
import { PROVINCES, getDefaultLocationSelection, getDistrictsByProvince } from '../constants/locationData';
import { useToast } from '../context/ToastContext';
import { useConfirmDialog } from '../context/ConfirmDialogContext';
import FeedbackState from '../components/FeedbackState';

const PAGE_SIZE = 10;

const Hospitals = () => {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const { showToast } = useToast();
    const { confirm } = useConfirmDialog();
    const defaults = getDefaultLocationSelection();

    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingHospitalId, setEditingHospitalId] = useState(null);
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

    const handleSubmitHospital = async (e) => {
        e.preventDefault();
        try {
            if (editingHospitalId) {
                await api.put(`/api/hospitals/${editingHospitalId}`, newHospital);
                showToast({ type: 'success', title: 'Hospital updated', message: 'The hospital record was updated successfully.' });
            } else {
                await api.post('/api/hospitals', newHospital);
                showToast({ type: 'success', title: 'Hospital added', message: 'The new hospital is now available in the system.' });
            }
            closeModal();
            fetchHospitals();
        } catch (error) {
            console.error(error);
            showToast({ type: 'error', title: 'Save failed', message: error?.response?.data?.message || 'Failed to save hospital.' });
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingHospitalId(null);
        setNewHospital({ name: '', province: defaults.province, district: defaults.district, address: '', contactNumber: '' });
    };

    const openEditModal = (hospital) => {
        setEditingHospitalId(hospital.id);
        const province = hospital.province || defaults.province;
        const district = hospital.district || defaults.district;
        setNewHospital({
            name: hospital.name || '',
            province,
            district,
            address: hospital.address || '',
            contactNumber: hospital.contactNumber || ''
        });
        setShowModal(true);
    };

    const handleDeleteHospital = async (hospitalId) => {
        const confirmed = await confirm({
            title: 'Delete hospital?',
            message: 'This hospital will be removed from requests and booking selections.',
            confirmLabel: 'Delete'
        });
        if (!confirmed) return;
        try {
            await api.delete(`/api/hospitals/${hospitalId}`);
            fetchHospitals();
            showToast({ type: 'success', title: 'Hospital deleted', message: 'The hospital was removed successfully.' });
        } catch (error) {
            console.error(error);
            showToast({ type: 'error', title: 'Delete failed', message: 'Failed to delete hospital.' });
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
                            <button className="btn btn-primary" onClick={() => { setEditingHospitalId(null); setNewHospital({ name: '', province: defaults.province, district: defaults.district, address: '', contactNumber: '' }); setShowModal(true); }}>+ Add New Hospital</button>
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

                    {loading && <FeedbackState variant="loading" title="Loading hospitals" message="Fetching hospital records and locations." compact />}
                    {!loading && filteredHospitals.length === 0 && <FeedbackState variant="empty" title="No hospitals found" message="Try a broader search or add a new hospital." compact />}

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
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    title="Edit Hospital"
                                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#2563EB', padding: '0.4rem', borderRadius: '8px', transition: 'background 0.2s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.1)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                    onClick={() => openEditModal(hospital)}
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    title="Delete Hospital"
                                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#DC2626', padding: '0.4rem', borderRadius: '8px', transition: 'background 0.2s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.1)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                    onClick={() => handleDeleteHospital(hospital.id)}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
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
                        <h2 style={{ marginBottom: '1.5rem' }}>{editingHospitalId ? 'Edit Hospital' : 'Add New Hospital'}</h2>
                        <form onSubmit={handleSubmitHospital}>
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
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                                <button type="button" className="btn" onClick={closeModal}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingHospitalId ? 'Save Changes' : 'Add Hospital'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Hospitals;
