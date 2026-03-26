import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import scheduleBackground from '../assets/shedule.jpg';
import { useToast } from '../context/ToastContext';
import FeedbackState from '../components/FeedbackState';
import StatusBadge from '../components/StatusBadge';

const PAGE_SIZE = 10;

const statusStyles = {
    Scheduled: { background: '#E0F2FE', color: '#0C4A6E' },
    Approved:  { background: '#DCFCE7', color: '#166534' },
    Completed: { background: '#F3E8FF', color: '#6B21A8' },
    Cancelled: { background: '#FEE2E2', color: '#991B1B' }
};

const groupOrder  = ['Scheduled', 'Approved', 'Completed', 'Cancelled'];
const groupLabels = { Scheduled: 'Requested', Approved: 'Approved', Completed: 'Finished', Cancelled: 'Cancelled' };

const formatAppointmentDate = (value) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'Invalid date' : parsed.toLocaleString();
};

const Appointments = () => {
    const navigate = useNavigate();
    const { user, canApproveAppointments } = useAuth();
    const { showToast } = useToast();
    const currentUserId = user?.id || user?.userId;

    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState(false);
    const [updatingId, setUpdatingId]     = useState(null);

    // Search + per-group Show More pages
    const [searchText,  setSearchText]  = useState('');
    const [groupPages,  setGroupPages]  = useState({});

    const fetchAppointments = () => {
        if (!canApproveAppointments && !currentUserId) { setAppointments([]); setLoading(false); return; }
        setLoading(true);
        const url = canApproveAppointments ? '/api/appointments' : `/api/appointments/donor/${currentUserId}`;
        api.get(url)
            .then(res  => { setAppointments(res.data || []); setLoading(false); })
            .catch(err => { console.error('Error fetching appointments', err); setError(true); setLoading(false); });
    };

    useEffect(() => { fetchAppointments(); }, [canApproveAppointments, currentUserId]);

    const handleCancel = async (id) => {
        setUpdatingId(id);
        try { await api.put(`/api/appointments/${id}/cancel`); fetchAppointments(); }
        catch (err) { console.error(err); showToast({ type: 'error', title: 'Cancel failed', message: 'Unable to cancel appointment.' }); }
        finally { setUpdatingId(null); }
    };

    const handleStatusUpdate = async (id, status) => {
        setUpdatingId(id);
        try {
            await api.put(`/api/appointments/${id}/status`, { status, actingUserId: currentUserId });
            if (status === 'Completed' || status === 'Approved') {
                showToast({ type: 'success', title: 'Status updated', message: 'If donation is done, the blood bag is now available in the Lab Dashboard queue.' });
            }
            fetchAppointments();
        } catch (err) { console.error(err); showToast({ type: 'error', title: 'Update failed', message: 'Unable to update status.' }); }
        finally { setUpdatingId(null); }
    };

    const groupedAppointments = useMemo(() => {
        const normalized = appointments.map(appt => {
            const status     = appt.status || 'Scheduled';
            const centerName = appt.centerName || (appt.centerType === 'CAMP' ? `Camp #${appt.hospitalId}` : `Hospital #${appt.hospitalId}`);
            const centerType = appt.centerType || (appt.hospitalId > 100 ? 'CAMP' : 'HOSPITAL');
            const parsedDate = new Date(appt.date);
            const ts         = Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
            return { ...appt, status, centerName, centerType, ts, formattedDate: formatAppointmentDate(appt.date) };
        });

        const grouped = Object.fromEntries(groupOrder.map(status => [status, []]));
        normalized.sort((a, b) => b.ts - a.ts).forEach(item => {
            if (!grouped[item.status]) grouped[item.status] = [];
            grouped[item.status].push(item);
        });
        return grouped;
    }, [appointments]);

    // Apply search across all groups
    const matchesSearch = (appt) => {
        if (!searchText) return true;
        const s = searchText.toLowerCase();
        return (
            String(appt.id).includes(s) ||
            (appt.centerName  || '').toLowerCase().includes(s) ||
            (appt.donorName   || '').toLowerCase().includes(s) ||
            (appt.status      || '').toLowerCase().includes(s)
        );
    };

    const getPage = (statusKey) => groupPages[statusKey] || 1;
    const setPage = (statusKey, p) => setGroupPages(prev => ({ ...prev, [statusKey]: p }));

    return (
        <div className="app-shell">
            <div
                aria-hidden="true"
                className="app-backdrop"
                style={{
                    backgroundImage: `linear-gradient(rgba(240, 244, 255, 0.72), rgba(255, 228, 230, 0.72)), url(${scheduleBackground})`,
                }}
            />
            <div className="container app-page">
                <header className="page-header">
                    <div>
                        <div className="page-kicker">Scheduling</div>
                        <h1 className="page-title">Scheduled Bookings</h1>
                        <p className="page-subtitle">
                            {canApproveAppointments ? 'Organized by request, approved, finished, and cancelled' : 'Manage your bookings'}
                        </p>
                    </div>
                    <div className="page-actions">
                        {!canApproveAppointments && (
                            <button className="btn btn-primary" onClick={() => navigate('/appointments/book')}>Book New</button>
                        )}
                        <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
                    </div>
                </header>

                <div className="glass-panel section-card">
                    {/* Search bar */}
                    <input
                        type="text"
                        value={searchText}
                        onChange={e => { setSearchText(e.target.value); setGroupPages({}); }}
                        placeholder="Search by ID, donor, center name…"
                        style={{
                            width: '100%', padding: '0.5rem 0.85rem', borderRadius: '8px',
                            border: '1px solid #CBD5E1', fontSize: '0.875rem',
                            marginBottom: '1rem', outline: 'none',
                            background: 'rgba(255,255,255,0.85)'
                        }}
                    />

                    {loading && <FeedbackState variant="loading" title="Loading appointments" message="Fetching the latest booking records." compact />}
                    {!loading && error && <FeedbackState variant="error" title="Unable to load appointments" message="Please try refreshing this page." compact />}
                    {!loading && !error && appointments.length === 0 && <FeedbackState variant="empty" title="No appointments found" message="Bookings will appear here once they are created." compact />}

                    {!loading && !error && appointments.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {groupOrder.map(statusKey => {
                                const all      = (groupedAppointments[statusKey] || []).filter(matchesSearch);
                                const page     = getPage(statusKey);
                                const visible  = all.slice(0, page * PAGE_SIZE);
                                if (all.length === 0) return null;

                                return (
                                    <section key={statusKey}>
                                        <h3 style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>
                                            {groupLabels[statusKey]} ({all.length})
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {visible.map(appt => {
                                                const style = statusStyles[appt.status] || { background: '#E2E8F0', color: '#334155' };
                                                return (
                                                    <div key={appt.id} className="glass-panel section-card">
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                                                            <div>
                                                                <div style={{ fontWeight: '600' }}>
                                                                    Appointment #{appt.id} • {appt.centerType === 'CAMP' ? 'Camp' : 'Hospital'}: {appt.centerName}
                                                                </div>
                                                                {canApproveAppointments && (
                                                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                                        Donor: {appt.donorName || 'Unknown'} • ID {appt.donorUserId || appt.donor?.id || 'N/A'}
                                                                    </div>
                                                                )}
                                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{appt.formattedDate}</div>
                                                            </div>
                                                            <StatusBadge status={appt.status} style={style}>{appt.status.toUpperCase()}</StatusBadge>
                                                        </div>

                                                        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                            {!canApproveAppointments && appt.status !== 'Cancelled' && appt.status !== 'Completed' && (
                                                                <button
                                                                    className="btn"
                                                                    style={{ border: '1px solid #FCA5A5', color: '#B91C1C' }}
                                                                    onClick={() => handleCancel(appt.id)}
                                                                    disabled={updatingId === appt.id}
                                                                >
                                                                    {updatingId === appt.id ? 'Cancelling...' : 'Cancel Booking'}
                                                                </button>
                                                            )}
                                                            {canApproveAppointments && appt.status !== 'Completed' && appt.status !== 'Cancelled' && (
                                                                <>
                                                                    <button
                                                                        className="btn"
                                                                        style={{ border: '1px solid #A7F3D0', color: '#065F46' }}
                                                                        onClick={() => handleStatusUpdate(appt.id, 'Approved')}
                                                                        disabled={updatingId === appt.id}
                                                                    >
                                                                        Approve
                                                                    </button>
                                                                    <button
                                                                        className="btn"
                                                                        style={{ border: '1px solid #C4B5FD', color: '#5B21B6' }}
                                                                        onClick={() => handleStatusUpdate(appt.id, 'Completed')}
                                                                        disabled={updatingId === appt.id}
                                                                    >
                                                                        Mark Finished
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Per-group Show More */}
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
                                            {page * PAGE_SIZE < all.length && (
                                                <button className="btn" style={{ border: '1px solid #CBD5E1', fontSize: '0.8rem' }} onClick={() => setPage(statusKey, page + 1)}>
                                                    Show More ({all.length - page * PAGE_SIZE} remaining)
                                                </button>
                                            )}
                                            {page > 1 && (
                                                <button className="btn" style={{ border: '1px solid #CBD5E1', fontSize: '0.8rem' }} onClick={() => setPage(statusKey, 1)}>
                                                    Show Less
                                                </button>
                                            )}
                                            {all.length > PAGE_SIZE && (
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    Showing {Math.min(page * PAGE_SIZE, all.length)} of {all.length}
                                                </span>
                                            )}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Appointments;
