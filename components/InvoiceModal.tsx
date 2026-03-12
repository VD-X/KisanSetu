import React, { useState } from 'react';
import { InvoiceData, invoiceService } from '../services/invoiceService';
import Invoice from './Invoice';

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: InvoiceData;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, data }) => {
    const [isGenerating, setIsGenerating] = useState(false);

    if (!isOpen) return null;

    const handleDownload = async () => {
        try {
            setIsGenerating(true);
            const filename = `Invoice_${data.role}_${data.orderId.substring(0, 8)}.pdf`;
            await invoiceService.generatePDF('invoice-capture-area', filename);
        } catch (err) {
            console.error('PDF Generation failed:', err);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-[#f8f9fa]/95 via-white/85 to-[#e9ecef]/95 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-300">
            <div className="bg-gray-100 rounded-[40px] w-full max-w-5xl h-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden relative border border-white/20">

                {/* Modal Header */}
                <div className="bg-white px-8 py-6 flex justify-between items-center border-b border-gray-100 shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Invoice Preview</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">#{data.invoiceId}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePrint}
                            className="px-5 py-3 rounded-2xl bg-gray-100 text-gray-600 font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center gap-2"
                        >
                            <i className="fas fa-print"></i>
                            Print
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={isGenerating}
                            className="px-6 py-3 rounded-2xl bg-gray-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 shadow-xl shadow-gray-200 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:scale-100"
                        >
                            {isGenerating ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-download"></i>
                                    Download PDF
                                </>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="ml-4 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                            aria-label="Close invoice"
                            title="Close invoice"
                        >
                            <i className="fas fa-times text-lg"></i>
                        </button>
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-12 scrollbar-hide bg-gray-100">
                    {/* Wrap Invoice in a container for html2canvas to capture */}
                    <div className="mx-auto bg-white shadow-2xl rounded-sm">
                        <Invoice data={data} id="invoice-capture-area" />
                    </div>

                    {/* Print Styling - Only show invoice when printing */}
                    <style dangerouslySetInnerHTML={{
                        __html: `
             @media print {
               body * { visibility: hidden; }
               #invoice-capture-area, #invoice-capture-area * { visibility: visible; }
               #invoice-capture-area { 
                 position: absolute; 
                 left: 0; 
                 top: 0; 
                 width: 100%;
                 padding: 0;
                 margin: 0;
                 box-shadow: none;
                 border: none;
               }
               @page { size: auto; margin: 0; }
             }
           `}} />
                </div>

                {/* Modal Footer (Optional Tip) */}
                <div className="bg-white/50 backdrop-blur-md px-8 py-4 border-t border-gray-100 shrink-0 text-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
                        Secure Digital Invoice • Powered by KisanSetu Ledger
                    </p>
                </div>
            </div>
        </div>
    );
};

export default InvoiceModal;
