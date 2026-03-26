import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const TOAST_ICONS = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info
};

const TOAST_TITLES = {
    success: 'Success',
    error: 'Something went wrong',
    info: 'Heads up'
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const timeoutMap = useRef(new Map());

    const dismissToast = useCallback((id) => {
        const timeoutId = timeoutMap.current.get(id);
        if (timeoutId) {
            window.clearTimeout(timeoutId);
            timeoutMap.current.delete(id);
        }
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const showToast = useCallback(({ title, message, type = 'info', duration = 3600 }) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const nextToast = {
            id,
            type,
            title: title || TOAST_TITLES[type] || TOAST_TITLES.info,
            message
        };
        setToasts(prev => [...prev, nextToast]);
        const timeoutId = window.setTimeout(() => dismissToast(id), duration);
        timeoutMap.current.set(id, timeoutId);
        return id;
    }, [dismissToast]);

    const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="toast-viewport" aria-live="polite" aria-atomic="true">
                {toasts.map(toast => {
                    const Icon = TOAST_ICONS[toast.type] || Info;
                    return (
                        <div key={toast.id} className={`toast toast-${toast.type}`}>
                            <div className="toast-icon-wrap">
                                <Icon size={18} />
                            </div>
                            <div className="toast-copy">
                                <div className="toast-title">{toast.title}</div>
                                {toast.message && <div className="toast-message">{toast.message}</div>}
                            </div>
                            <button
                                type="button"
                                className="toast-close"
                                onClick={() => dismissToast(toast.id)}
                                aria-label="Dismiss notification"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
