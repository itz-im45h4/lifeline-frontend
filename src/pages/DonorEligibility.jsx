import React, { useState } from 'react';

const DonorEligibility = ({ onComplete }) => {
    const [answers, setAnswers] = useState({
        age: '',
        weight: '',
        bloodType: '',
        diseases: false,
        medications: false,
        surgery: false,
        travel: false,
        tattoo: false
    });

    const [isEligible, setIsEligible] = useState(null);

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setAnswers({
            ...answers,
            [e.target.name]: value
        });
    };

    const checkEligibility = (e) => {
        e.preventDefault();

        let valid = true;
        // Basic Logic
        if (answers.age < 18 || answers.age > 65) valid = false;
        if (answers.weight < 50) valid = false;
        if (answers.diseases || answers.surgery || answers.travel) valid = false;

        setIsEligible(valid);
        onComplete(valid, answers);
    };

    return (
        <div style={{ maxWidth: '600px', width: '100%' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Health Eligibility Check</h2>

            <form onSubmit={checkEligibility} style={{ display: 'grid', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="input-label">Age</label>
                        <input type="number" name="age" className="input-field" value={answers.age} onChange={handleChange} required />
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="input-label">Weight (kg)</label>
                        <input type="number" name="weight" className="input-field" value={answers.weight} onChange={handleChange} required />
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="input-label">Blood Type</label>
                        <select name="bloodType" className="input-field" value={answers.bloodType} onChange={handleChange} required>
                            <option value="">Select</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                        </select>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', background: 'white' }}>
                    <p style={{ fontWeight: '600', marginBottom: '1rem' }}>Please answer 'Yes' if any apply to you:</p>

                    {[
                        { key: 'diseases', label: 'Diagnosed with HIV, Hepatitis, or other blood-borne diseases?' },
                        { key: 'medications', label: 'Currently taking any prescribed medications?' },
                        { key: 'surgery', label: 'Had surgery in the last 6 months?' },
                        { key: 'travel', label: 'Traveled to malaria-risk zones recently?' },
                        { key: 'tattoo', label: 'Got a tattoo or piercing in the last 6 months?' }
                    ].map(q => (
                        <div key={q.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #F1F5F9' }}>
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-main)', paddingRight: '1rem' }}>{q.label}</label>
                            <input
                                type="checkbox"
                                name={q.key}
                                checked={answers[q.key]}
                                onChange={handleChange}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                            />
                        </div>
                    ))}
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Check Eligibility</button>
            </form>

            {isEligible !== null && (
                <div className="animate-fade-in" style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: 'var(--radius-md)', background: isEligible ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${isEligible ? '#BBF7D0' : '#FECACA'}`, textAlign: 'center' }}>
                    <h3 style={{ color: isEligible ? '#166534' : '#991B1B', marginBottom: '0.5rem' }}>
                        {isEligible ? 'You are Eligible to Donate!' : 'You are currently not eligible'}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: isEligible ? '#166534' : '#991B1B' }}>
                        {isEligible ? 'Proceed to registration to save lives.' : 'Please consult a doctor or try again later.'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default DonorEligibility;
