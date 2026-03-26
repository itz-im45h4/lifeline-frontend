import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmDialogContext = createContext(null);

export const ConfirmDialogProvider = ({ children }) => {
    const resolverRef = useRef(null);
    const [dialog, setDialog] = useState(null);

    const closeDialog = useCallback((result) => {
        if (resolverRef.current) {
            resolverRef.current(result);
            resolverRef.current = null;
        }
        setDialog(null);
    }, []);

    const confirm = useCallback((options) => {
        setDialog({
            title: options?.title || 'Confirm action',
            message: options?.message || 'Are you sure you want to continue?',
            confirmLabel: options?.confirmLabel || 'Confirm',
            cancelLabel: options?.cancelLabel || 'Cancel',
            tone: options?.tone || 'danger'
        });

        return new Promise((resolve) => {
            resolverRef.current = resolve;
        });
    }, []);

    const value = useMemo(() => ({ confirm }), [confirm]);

    return (
        <ConfirmDialogContext.Provider value={value}>
            {children}
            {dialog && (
                <div className="dialog-backdrop">
                    <div className="dialog-card glass-panel">
                        <div className={`dialog-icon dialog-icon-${dialog.tone}`}>
                            <AlertTriangle size={20} />
                        </div>
                        <h2 className="dialog-title">{dialog.title}</h2>
                        <p className="dialog-message">{dialog.message}</p>
                        <div className="dialog-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => closeDialog(false)}>
                                {dialog.cancelLabel}
                            </button>
                            <button
                                type="button"
                                className={`btn ${dialog.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                                onClick={() => closeDialog(true)}
                            >
                                {dialog.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmDialogContext.Provider>
    );
};

export const useConfirmDialog = () => {
    const context = useContext(ConfirmDialogContext);
    if (!context) {
        throw new Error('useConfirmDialog must be used within a ConfirmDialogProvider');
    }
    return context;
};
