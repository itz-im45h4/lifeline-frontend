import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import credentialBackground from '../assets/Credential.jpg';
import { useToast } from '../context/ToastContext';
import FeedbackState from '../components/FeedbackState';

const roles = ['DONOR', 'HOSPITAL', 'LAB', 'ADMIN'];
const PAGE_SIZE = 10;

const CredentialManagement = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();
    const [users, setUsers]       = useState([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState('');
    const [savingId, setSavingId] = useState(null);
    const [newUser, setNewUser]   = useState({ name: '', email: '', password: '', role: 'HOSPITAL' });

    const [searchText,   setSearchText]   = useState('');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    const fetchUsers = async () => {
        setLoading(true); setError('');
        try {
            const res = await api.get('/api/admin/users', { params: { actingUserId: user?.id } });
            setUsers(res.data || []);
        } catch (err) {
            console.error(err); setError('Failed to load users.'); setUsers([]);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, [user?.id]);

    const createUser = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/admin/users', { actingUserId: user?.id, ...newUser });
            setNewUser({ name: '', email: '', password: '', role: 'HOSPITAL' });
            fetchUsers();
        } catch (err) {
            console.error(err);
            showToast({ type: 'error', title: 'Create user failed', message: typeof err?.response?.data === 'string' ? err.response.data : 'Failed to create user.' });
        }
    };

    const updateRole = async (targetUserId, role) => {
        setSavingId(targetUserId);
        try {
            await api.put(`/api/admin/users/${targetUserId}/role`, { actingUserId: user?.id, role });
            fetchUsers();
        } catch (err) {
            console.error(err);
            showToast({ type: 'error', title: 'Role update failed', message: typeof err?.response?.data === 'string' ? err.response.data : 'Failed to update role.' });
        } finally { setSavingId(null); }
    };

    const filteredUsers = useMemo(() => {
        if (!searchText) return users;
        const s = searchText.toLowerCase();
        return users.filter(u =>
            (u.name  || '').toLowerCase().includes(s) ||
            (u.email || '').toLowerCase().includes(s) ||
            (u.role  || '').toLowerCase().includes(s)
        );
    }, [users, searchText]);

    const visibleUsers = filteredUsers.slice(0, visibleCount);

    return (
        <div className="app-shell">
            <div
                aria-hidden="true"
                className="app-backdrop"
                style={{
                    backgroundImage: `linear-gradient(rgba(240, 244, 255, 0.72), rgba(255, 228, 230, 0.72)), url(${credentialBackground})`,
                }}
            />
            <div className="container app-page">
                <header className="page-header" style={{ marginBottom: '1.5rem' }}>
                    <div>
                        <div className="page-kicker">Admin</div>
                        <h1 className="page-title">Credential Management</h1>
                        <p className="page-subtitle">Assign and control platform roles with a cleaner staff management flow.</p>
                    </div>
                    <div className="page-actions">
                        <button className="btn btn-primary" onClick={fetchUsers}>Refresh</button>
                        <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
                    </div>
                </header>

                <form className="glass-panel section-card" style={{ marginBottom: '1.25rem' }} onSubmit={createUser}>
                    <div className="section-header">
                        <div>
                            <h2 className="section-title">Create Staff Account</h2>
                            <p className="section-subtitle">Provision new admins, lab users, hospital accounts, and support staff.</p>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.7rem' }}>
                        <input className="input-field" placeholder="Name" value={newUser.name} onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))} required />
                        <input className="input-field" placeholder="Email" type="email" value={newUser.email} onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))} required />
                        <input className="input-field" placeholder="Password" type="password" value={newUser.password} onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))} required />
                        <select className="input-field" value={newUser.role} onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value }))}>
                            {roles.map(role => <option key={role} value={role}>{role}</option>)}
                        </select>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ marginTop: '0.75rem' }}>Create User</button>
                </form>

                <div className="glass-panel section-card">
                    {/* Search */}
                    <input
                        type="text"
                        value={searchText}
                        onChange={e => { setSearchText(e.target.value); setVisibleCount(PAGE_SIZE); }}
                        placeholder="Search by name, email, or role…"
                        style={{
                            width: '100%', padding: '0.5rem 0.85rem', borderRadius: '8px',
                            border: '1px solid #CBD5E1', fontSize: '0.875rem',
                            marginBottom: '0.75rem', outline: 'none',
                            background: 'rgba(255,255,255,0.85)'
                        }}
                    />
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
                    </div>

                    {loading && <FeedbackState variant="loading" title="Loading users" message="Fetching the latest staff directory." compact />}
                    {!loading && error && <FeedbackState variant="error" title="Unable to load users" message={error} compact />}
                    {!loading && !error && filteredUsers.length === 0 && <FeedbackState variant="empty" title="No users found" message="Try a different search or create a new staff account." compact />}
                    {!loading && !error && filteredUsers.length > 0 && (
                        <>
                            <div className="table-wrap">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleUsers.map(entry => (
                                        <tr key={entry.id}>
                                            <td>{entry.name}</td>
                                            <td>{entry.email}</td>
                                            <td>
                                                <select
                                                    className="input-field"
                                                    value={entry.role}
                                                    onChange={e => {
                                                        const role = e.target.value;
                                                        setUsers(prev => prev.map(u => (u.id === entry.id ? { ...u, role } : u)));
                                                    }}
                                                >
                                                    {roles.map(role => <option key={role} value={role}>{role}</option>)}
                                                </select>
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-primary"
                                                    disabled={savingId === entry.id}
                                                    onClick={() => updateRole(entry.id, entry.role)}
                                                >
                                                    {savingId === entry.id ? 'Saving...' : 'Save Role'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>

                            {/* Show More */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
                                {visibleCount < filteredUsers.length && (
                                    <button className="btn" style={{ border: '1px solid #CBD5E1', fontSize: '0.8rem' }} onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>
                                        Show More ({filteredUsers.length - visibleCount} remaining)
                                    </button>
                                )}
                                {visibleCount > PAGE_SIZE && (
                                    <button className="btn" style={{ border: '1px solid #CBD5E1', fontSize: '0.8rem' }} onClick={() => setVisibleCount(PAGE_SIZE)}>
                                        Show Less
                                    </button>
                                )}
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    Showing {Math.min(visibleCount, filteredUsers.length)} of {filteredUsers.length}
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CredentialManagement;
