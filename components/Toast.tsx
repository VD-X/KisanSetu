import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    onClose: (id: string) => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ id, message, type, onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, duration);

        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    const styles = {
        success: 'bg-green-50 border-green-200 text-green-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800'
    };

    const icons = {
        success: 'fa-check-circle text-green-600',
        error: 'fa-exclamation-circle text-red-600',
        info: 'fa-info-circle text-blue-600'
    };

    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-500 animate-in slide-in-from-top-5 fade-in ${styles[type]} min-w-[300px] pointer-events-auto`}>
            <i className={`fas ${icons[type]} text-lg`}></i>
            <p className="text-sm font-semibold flex-1">{message}</p>
            <button
                onClick={() => onClose(id)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
            >
                <i className="fas fa-times"></i>
            </button>
        </div>
    );
};

export default Toast;
