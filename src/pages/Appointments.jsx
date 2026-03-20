import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import scheduleBackground from '../assets/shedule.jpg';

const statusStyles = {
    Scheduled: { background: '#E0F2FE', color: '#0C4A6E' },
    Approved: { background: '#DCFCE7', color: '#166534' },
    Completed: { background: '#F3E8FF', color: '#6B21A8' },
    Cancelled: { background: '#FEE2E2', color: '#991B1B' }
};

const groupOrder = ['Scheduled', 'Approved', 'Completed', 'Cancelled'];
const groupLabels = {
    Scheduled: 'Requested',
    Approved: 'Approved',
    Completed: 'Finished',
    Cancelled: 'Cancelled'
};

const formatAppointmentDate = (value) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'Invalid date' : parsed.toLocaleString();
};

const Appointments = () => {
    const navigate = useNavigate();
    const { user, canApproveAppointments } = useAuth();
    const currentUserId = user?.id || user?.userId;
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);

    const fetchAppointments = () => {
        if (!canApproveAppointments && !currentUserId) {
            setAppointments([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const url = canApproveAppointments
            ? '/api/appointments'
            : `/api/appointments/donor/${currentUserId}`;
        api.get(url)
            .then(res => {
                setAppointments(res.data || []);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching appointments', err);
                setError(true);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchAppointments();
    }, [canApproveAppointments, currentUserId]);

    const handleCancel = async (id) => {
        setUpdatingId(id);
        try {
            await api.put(`/api/appointments/${id}/cancel`);
            fetchAppointments();
        } catch (err) {
            console.error(err);
            alert('Unable to cancel appointment.');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleStatusUpdate = async (id, status) => {
        setUpdatingId(id);
        try {
            await api.put(`/api/appointments/${id}/status`, {
                status,
                actingUserId: currentUserId
            });

            if (status === 'Completed' || status === 'Approved') {
                alert('Status updated. If donation is done, blood bag is now available in Lab Dashboard queue.');
            }
            fetchAppointments();
        } catch (err) {
            console.error(err);
            alert('Unable to update status.');
        } finally {
            setUpdatingId(null);
        }
    };

    const groupedAppointments = useMemo(() => {
        const normalized = appointments.map(appt => {
            const status = appt.status || 'Scheduled';
            const centerName = appt.centerName
                || (appt.centerType === 'CAMP' ? `Camp #${appt.hospitalId}` : `Hospital #${appt.hospitalId}`);
            const centerType = appt.centerType || (appt.hospitalId > 100 ? 'CAMP' : 'HOSPITAL');
            const parsedDate = new Date(appt.date);
            const ts = Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
            return { ...appt, status, centerName, centerType, ts, formattedDate: formatAppointmentDate(appt.date) };
        });

        const grouped = Object.fromEntries(groupOrder.map(status => [status, []]));
        normalized
            .sort((a, b) => b.ts - a.ts)
            .forEach(item => {
                if (!grouped[item.status]) grouped[item.status] = [];
                grouped[item.status].push(item);
            });

        return grouped;
    }, [appointments]);

    return (
        <div style={{ minHeight: '100vh', width: '100%', position: 'relative', backgroundColor: '#F0F4FF' }}>
            <div
                aria-hidden="true"
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundImage: `linear-gradient(rgba(240, 244, 255, 0.72), rgba(255, 228, 230, 0.72)), url(${scheduleBackground})`,
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
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Scheduled Bookings</h1>
                    <p style={{ color: 'var(--text-muted)' }}>
                        {canApproveAppointments ? 'Organized by request, approved, finished, and cancelled' : 'Manage your bookings'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {!canApproveAppointments && (
                        <button className="btn btn-primary" onClick={() => navigate('/appointments/book')}>
                            Book New
                        </button>
                    )}
                    <button className="btn" style={{ border: '1px solid #E2E8F0' }} onClick={() => navigate(-1)}>Back</button>
                </div>
            </header>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                {loading && <div style={{ color: 'var(--text-muted)' }}>Loading appointments...</div>}
                {!loading && error && <div style={{ color: 'var(--text-muted)' }}>Unable to load appointments.</div>}
                {!loading && !error && appointments.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No appointments found.</div>}

                {!loading && !error && appointments.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {groupOrder.map(statusKey => {
                            const list = groupedAppointments[statusKey] || [];
                            if (list.length === 0) return null;

                            return (
                                <section key={statusKey}>
                                    <h3 style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>{groupLabels[statusKey]} ({list.length})</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {list.map(appt => {
                                            const style = statusStyles[appt.status] || { background: '#E2E8F0', color: '#334155' };
                                            return (
                                                <div key={appt.id} className="glass-panel" style={{ padding: '1rem' }}>
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
                                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                                {appt.formattedDate}
                                                            </div>
                                                        </div>
                                                        <div style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700', ...style }}>
                                                            {appt.status.toUpperCase()}
                                                        </div>
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
