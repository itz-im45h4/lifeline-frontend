import React, { useState } from 'react';
import api from '../services/api';

const HealthQuestionnaire = () => {
    const [answers, setAnswers] = useState({
        hasDiagnosedDiseases: false,
        takingMedications: false,
        recentSurgery: false,
        recentTravel: false
    });
    const [result, setResult] = useState(null);

    const handleChange = (e) => {
        const { name, checked } = e.target;
        setAnswers(prev => ({ ...prev, [name]: checked }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/api/donors/health-check', answers);
            if (response.data?.eligible) {
                setResult("You are ELIGIBLE to donate. Proceed to booking.");
            } else {
                setResult("You are currently INELIGIBLE to donate based on health criteria.");
            }
        } catch (error) {
            console.error("Error submitting form", error);
            setResult("Error processing request.");
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Donor Health Questionnaire</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                    <label>
                        <input
                            type="checkbox"
                            name="hasDiagnosedDiseases"
                            checked={answers.hasDiagnosedDiseases}
                            onChange={handleChange}
                        />
                        Do you have any diagnosed blood-borne diseases (HIV, Hepatitis, etc.)?
                    </label>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label>
                        <input
                            type="checkbox"
                            name="takingMedications"
                            checked={answers.takingMedications}
                            onChange={handleChange}
                        />
                        Are you currently taking any prescribed medications?
                    </label>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label>
                        <input
                            type="checkbox"
                            name="recentSurgery"
                            checked={answers.recentSurgery}
                            onChange={handleChange}
                        />
                        Have you had surgery in the last 6 months?
                    </label>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label>
                        <input
                            type="checkbox"
                            name="recentTravel"
                            checked={answers.recentTravel}
                            onChange={handleChange}
                        />
                        Have you traveled to malaria-risk zones recently?
                    </label>
                </div>
                <button type="submit" style={{ padding: '0.5rem 1rem', background: '#e63946', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Check Eligibility
                </button>
            </form>
            {result && (
                <div style={{ marginTop: '1.5rem', fontWeight: 'bold', color: result.includes('ELIGIBLE') ? 'green' : 'red' }}>
                    {result}
                </div>
            )}
        </div>
    );
};

export default HealthQuestionnaire;
