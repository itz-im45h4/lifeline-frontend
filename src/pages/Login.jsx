import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import loginBackground from '../assets/loginpage.png';

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await login(formData.email, formData.password);
            navigate('/dashboard');
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to log in. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="auth-shell"
            style={{
                backgroundImage: `linear-gradient(rgba(240, 244, 255, 0.72), rgba(255, 228, 230, 0.72)), url(${loginBackground})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            {/* Background Decorations */}
            <div style={{
                position: 'absolute',
                top: '-10%',
                right: '-5%',
                width: '300px',
                height: '300px',
                borderRadius: '50%',
                background: 'rgba(225, 29, 72, 0.1)',
                filter: 'blur(50px)'
            }} />
            <div style={{
                position: 'absolute',
                bottom: '-10%',
                left: '-5%',
                width: '400px',
                height: '400px',
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.1)',
                filter: 'blur(60px)'
            }} />

            <div className="glass-panel animate-fade-in auth-card">
                <div className="auth-header">
                    <h1 className="auth-title">Welcome Back</h1>
                    <p className="auth-subtitle">Sign in to access LifeLine</p>
                </div>

                {error && (
                    <div style={{
                        background: '#FEF2F2',
                        color: '#DC2626',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '1rem',
                        fontSize: '0.875rem'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            className="input-field"
                            placeholder="doctor@lifeline.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                            Password
                            <a href="#" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.75rem' }}>Forgot?</a>
                        </label>
                        <input
                            type="password"
                            name="password"
                            className="input-field"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '0.5rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="auth-footer">
                    Don't have an account? <Link to="/register" className="auth-link">Register Now</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
