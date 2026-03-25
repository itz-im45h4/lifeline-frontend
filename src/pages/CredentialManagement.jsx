import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import credentialBackground from '../assets/Credential.jpg';

const roles = ['DONOR', 'HOSPITAL', 'LAB', 'ADMIN'];
const PAGE_SIZE = 10;

const CredentialManagement = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
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
            alert(typeof err?.response?.data === 'string' ? err.response.data : 'Failed to create user.');
        }
    };

    const updateRole = async (targetUserId, role) => {
        setSavingId(targetUserId);
        try {
            await api.put(`/api/admin/users/${targetUserId}/role`, { actingUserId: user?.id, role });
            fetchUsers();
        } catch (err) {
            console.error(err);
            alert(typeof err?.response?.data === 'string' ? err.response.data : 'Failed to update role.');
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
        <div style={{ minHeight: '100vh', width: '100%', position: 'relative', backgroundColor: '#F0F4FF' }}>
            <div
                aria-hidden="true"
                style={{
                    position: 'fixed', inset: 0,
                    backgroundImage: `linear-gradient(rgba(240, 244, 255, 0.72), rgba(255, 228, 230, 0.72)), url(${credentialBackground})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat', pointerEvents: 'none', zIndex: 0
                }}
            />
            <div className="container" style={{ position: 'relative', zIndex: 1, padding: '2rem 1rem' }}>
                <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>Credential Management</h1>
                        <p style={{ color: 'var(--text-muted)' }}>Assign and control platform roles</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn btn-primary" onClick={fetchUsers}>Refresh</button>
                        <button className="btn" style={{ border: '1px solid #E2E8F0' }} onClick={() => navigate(-1)}>← Back</button>
                    </div>
                </header>

                <form className="glass-panel" style={{ padding: '1.2rem', marginBottom: '1.25rem' }} onSubmit={createUser}>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '0.8rem' }}>Create Staff Account</h2>
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

                <div className="glass-panel" style={{ padding: '1.2rem' }}>
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

                    {loading && <div style={{ color: 'var(--text-muted)' }}>Loading users...</div>}
                    {!loading && error && <div style={{ color: '#B91C1C' }}>{error}</div>}
                    {!loading && !error && filteredUsers.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No users found.</div>}
                    {!loading && !error && filteredUsers.length > 0 && (
                        <>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                                        <th style={{ textAlign: 'left', padding: '0.6rem' }}>Name</th>
                                        <th style={{ textAlign: 'left', padding: '0.6rem' }}>Email</th>
                                        <th style={{ textAlign: 'left', padding: '0.6rem' }}>Role</th>
                                        <th style={{ textAlign: 'left', padding: '0.6rem' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleUsers.map(entry => (
                                        <tr key={entry.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                            <td style={{ padding: '0.6rem' }}>{entry.name}</td>
                                            <td style={{ padding: '0.6rem' }}>{entry.email}</td>
                                            <td style={{ padding: '0.6rem' }}>
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
                                            <td style={{ padding: '0.6rem' }}>
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
