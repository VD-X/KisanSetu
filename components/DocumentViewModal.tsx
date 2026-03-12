
import React from 'react';

interface DocumentViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    htmlContent: string;
}

const DocumentViewModal: React.FC<DocumentViewModalProps> = ({ isOpen, onClose, title, htmlContent }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-bottom border-gray-100">
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{title}</h3>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 flex flex-col items-center justify-center bg-gray-50/50">
                    <div
                        className="w-full flex justify-center"
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />

                    <div className="mt-8 flex flex-col items-center gap-4 w-full">
                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 shadow-sm animate-pulse">
                            <i className="fas fa-certificate"></i>
                            <span className="text-[10px] font-black uppercase tracking-widest">Verified by KisanSetu Vault</span>
                        </div>

                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center px-10">
                            This is a digitally generated document stored securely in your vault.
                            Always carry original physical documents while operating vehicles.
                        </p>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-white border-top border-gray-100 flex gap-3">
                    <button
                        className="flex-1 bg-black text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-gray-900 transition-colors shadow-lg shadow-gray-200 flex items-center justify-center gap-2"
                        onClick={() => window.print()}
                    >
                        <i className="fas fa-download"></i>
                        Download Copy
                    </button>
                    <button
                        className="flex-1 border border-gray-200 text-gray-500 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-gray-50 transition-colors"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DocumentViewModal;
