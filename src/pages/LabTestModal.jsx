import React, { useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const LabTestModal = ({ bagId, onClose, onSubmit }) => {
    const { showToast } = useToast();
    const [hiv, setHiv] = useState(false);
    const [hep, setHep] = useState(false);
    const [malaria, setMalaria] = useState(false);
    const [reason, setReason] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        api.put(`/api/inventory/${bagId}/test`, {
            hiv,
            hep,
            malaria,
            reason: (hiv || hep || malaria) ? reason : ""
        })
            .then(() => {
                showToast({ type: 'success', title: 'Lab results updated', message: `Blood bag #${bagId} was updated successfully.` });
                onSubmit();
            })
            .catch(err => {
                console.error("Error updating test results", err);
                showToast({ type: 'error', title: 'Update failed', message: 'Failed to update results.' });
            });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl max-w-sm w-full animate-fade-in-up">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Enter Lab Results</h2>
                <p className="text-gray-600 mb-6">Blood Bag ID: <span className="font-mono font-bold">{bagId}</span></p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 border rounded hover:bg-gray-50 cursor-pointer" onClick={() => setHiv(!hiv)}>
                        <input
                            type="checkbox"
                            checked={hiv}
                            onChange={(e) => setHiv(e.target.checked)}
                            className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <label className="text-gray-700 font-medium cursor-pointer">HIV Positive?</label>
                    </div>

                    <div className="flex items-center space-x-3 p-3 border rounded hover:bg-gray-50 cursor-pointer" onClick={() => setHep(!hep)}>
                        <input
                            type="checkbox"
                            checked={hep}
                            onChange={(e) => setHep(e.target.checked)}
                            className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <label className="text-gray-700 font-medium cursor-pointer">Hepatitis Positive?</label>
                    </div>

                    <div className="flex items-center space-x-3 p-3 border rounded hover:bg-gray-50 cursor-pointer" onClick={() => setMalaria(!malaria)}>
                        <input
                            type="checkbox"
                            checked={malaria}
                            onChange={(e) => setMalaria(e.target.checked)}
                            className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <label className="text-gray-700 font-medium cursor-pointer">Malaria Positive?</label>
                    </div>

                    {(hiv || hep || malaria) && (
                        <div className="space-y-2">
                            <label className="text-gray-700 font-medium">Reason for Positive Result:</label>
                            <input 
                                type="text" 
                                className="w-full border rounded p-2" 
                                value={reason} 
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g. HIV found"
                                required
                            />
                        </div>
                    )}

                    <div className="flex gap-4 pt-4">
                        <button type="submit" className="flex-1 bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700 shadow-md">
                            Submit Results
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded font-semibold hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LabTestModal;
