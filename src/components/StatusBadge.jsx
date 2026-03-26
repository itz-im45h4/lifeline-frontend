import React from 'react';

const BADGE_STYLES = {
    success: { background: '#DCFCE7', color: '#166534' },
    danger: { background: '#FEE2E2', color: '#991B1B' },
    warning: { background: '#FEF3C7', color: '#92400E' },
    info: { background: '#DBEAFE', color: '#1D4ED8' },
    neutral: { background: '#E2E8F0', color: '#334155' }
};

const statusToVariant = (status = '') => {
    const normalized = String(status).toUpperCase();
    if (['SAFE', 'AVAILABLE', 'APPROVED', 'FULFILLED', 'COMPLETED', 'ONGOING'].includes(normalized)) return 'success';
    if (['CRITICAL', 'CANCELLED', 'BIO-HAZARD', 'DISCARD', 'POSITIVE'].includes(normalized)) return 'danger';
    if (['PENDING', 'PARTIAL', 'HIGH', 'UPCOMING'].includes(normalized)) return 'warning';
    if (['NORMAL', 'SCHEDULED', 'OPEN'].includes(normalized)) return 'info';
    return 'neutral';
};

const StatusBadge = ({ status, variant, children, style }) => {
    const tone = variant || statusToVariant(status || children);
    return (
        <span
            className="status-badge"
            style={{
                ...BADGE_STYLES[tone],
                ...style
            }}
        >
            {children || status}
        </span>
    );
};

export default StatusBadge;
