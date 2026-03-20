import React, { useState, useEffect } from 'react';
import api from '../services/api';

const StockDashboard = () => {
    const [stock, setStock] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStock();
    }, []);

    const fetchStock = async () => {
        try {
            const response = await api.get('/api/inventory');
            setStock(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching stock", error);
            setLoading(false);
        }
    };

    const getStatusColor = (status, testStatus) => {
        if (status === 'Bio-Hazard') return '#ffcccc'; // Light Red
        if (status === 'Expired') return '#fff3cd'; // Yellow/Orange
        if (status === 'Safe' && testStatus === 'TESTED_SAFE') return '#d4edda'; // Light Green
        return '#f8f9fa'; // Default/Untested
    };

    const getStatusTextColor = (status) => {
        if (status === 'Bio-Hazard') return '#721c24';
        if (status === 'Expired') return '#856404';
        if (status === 'Safe') return '#155724';
        return '#333';
    };

    if (loading) return <div>Loading stock...</div>;

    return (
        <div style={{ padding: '2rem' }}>
            <h2>Blood Stock Inventory</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                {stock.map(item => (
                    <div
                        key={item.id}
                        style={{
                            padding: '1.5rem',
                            borderRadius: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            backgroundColor: getStatusColor(item.status, item.testStatus),
                            color: getStatusTextColor(item.status),
                            border: '1px solid #ddd'
                        }}
                    >
                        <h3 style={{ marginTop: 0 }}>Type: {item.bloodType}</h3>
                        <p><strong>Quantity:</strong> {item.quantity} Units</p>
                        <p><strong>Expiry:</strong> {item.expiryDate}</p>
                        <p><strong>Status:</strong> {item.status}</p>
                        <p style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>Validation: {item.testStatus || 'Pending'}</p>
                    </div>
                ))}
            </div>
            {stock.length === 0 && <p>No inventory found.</p>}
        </div>
    );
};

export default StockDashboard;
