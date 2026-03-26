import React from 'react';
import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react';

const variantMap = {
    loading: {
        Icon: LoaderCircle,
        title: 'Loading',
        className: 'feedback-loading'
    },
    error: {
        Icon: AlertCircle,
        title: 'Unable to load',
        className: 'feedback-error'
    },
    empty: {
        Icon: Inbox,
        title: 'Nothing here yet',
        className: 'feedback-empty'
    }
};

const FeedbackState = ({ variant = 'empty', title, message, compact = false }) => {
    const config = variantMap[variant] || variantMap.empty;
    const Icon = config.Icon;

    return (
        <div className={`feedback-state ${config.className} ${compact ? 'feedback-compact' : ''}`}>
            <div className="feedback-icon">
                <Icon size={compact ? 18 : 22} className={variant === 'loading' ? 'spin' : ''} />
            </div>
            <div>
                <div className="feedback-title">{title || config.title}</div>
                {message && <div className="feedback-message">{message}</div>}
            </div>
        </div>
    );
};

export default FeedbackState;
