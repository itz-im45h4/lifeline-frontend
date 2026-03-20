import React, { useEffect, useState } from 'react';
import { getInventory, updateBloodStatus } from '../services/api';
import './Inventory.css';

function Inventory() {
    const [bags, setBags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadInventory = async () => {
        try {
            setError('');
            const response = await getInventory();
            setBags(response?.data || []);
        } catch (err) {
            setError('Failed to load inventory.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInventory();
    }, []);

    const handleTest = async (id) => {
        try {
            await updateBloodStatus(id, { hivPos: false, hepPos: false });
            setBags((prev) =>
                prev.map((bag) =>
                    bag.id === id
                        ? { ...bag, status: 'SAFE', safetyFlag: 'SAFE', testStatus: 'TESTED_SAFE' }
                        : bag
                )
            );
        } catch (err) {
            setError('Failed to update blood test result.');
        }
    };

    return (
        <div className="inventory-page">
            <div className="inventory-card">
                <h1>Inventory (Admin)</h1>

                {error && <div className="inventory-error">{error}</div>}
                {loading ? (
                    <p>Loading blood bags...</p>
                ) : (
                    <table className="inventory-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Blood Type</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bags.map((bag) => {
                                const status = String(bag.status || '').toUpperCase();
                                const rowClass =
                                    status === 'BIO-HAZARD'
                                        ? 'row-hazard'
                                        : status === 'SAFE'
                                            ? 'row-safe'
                                            : '';

                                const untested = status === 'UNTESTED' || !bag.testStatus || bag.testStatus === 'PENDING';

                                return (
                                    <tr key={bag.id} className={rowClass}>
                                        <td>{bag.id}</td>
                                        <td>{bag.bloodType}</td>
                                        <td>{bag.status || 'UNTESTED'}</td>
                                        <td>
                                            {untested ? (
                                                <button onClick={() => handleTest(bag.id)}>Test</button>
                                            ) : (
                                                <span>-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default Inventory;
