import React, { useState } from 'react';

interface OTPModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'display' | 'entry';
    otp?: string;
    onVerify?: (otp: string) => void;
    onSubmit?: (otp: string) => void;
    error?: string;
    title?: string;
}

const OTPModal: React.FC<OTPModalProps> = ({
    isOpen,
    onClose,
    mode,
    otp,
    onVerify,
    onSubmit,
    error: externalError,
    title
}) => {
    const [enteredOtp, setEnteredOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) return;
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...enteredOtp];
        newOtp[index] = value;
        setEnteredOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !enteredOtp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleVerify = async () => {
        const otpString = enteredOtp.join('');
        if (otpString.length !== 6) {
            setError('Please enter complete 6-digit OTP');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const cb = onVerify || onSubmit;
            if (cb) await cb(otpString);
        } catch (err: any) {
            setError(err.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#f8f9fa]/95 via-white/85 to-[#e9ecef]/95 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-lock text-3xl text-green-600"></i>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900">
                        {title || (mode === 'display' ? 'Pickup OTP' : 'Enter OTP')}
                    </h2>
                    <p className="text-gray-500 text-sm mt-2">
                        {mode === 'display'
                            ? 'Share this OTP with the transporter for pickup verification'
                            : 'Enter the 6-digit OTP to confirm pickup'
                        }
                    </p>
                </div>

                {/* OTP Display Mode */}
                {mode === 'display' && otp && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 mb-6">
                        <div className="text-center">
                            <p className="text-sm text-gray-600 mb-2">Your OTP</p>
                            <p className="text-4xl font-black text-green-600 tracking-widest">
                                {otp}
                            </p>
                        </div>
                    </div>
                )}

                {/* OTP Entry Mode */}
                {mode === 'entry' && (
                    <>
                        <div className="flex gap-2 justify-center mb-6">
                            {enteredOtp.map((digit, index) => (
                                <input
                                    key={index}
                                    id={`otp-${index}`}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all"
                                    aria-label={`Digit ${index + 1}`}
                                />
                            ))}
                        </div>

                        {(externalError || error) && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                                <p className="text-red-600 text-sm text-center font-medium">{externalError || error}</p>
                            </div>
                        )}

                        <button
                            onClick={handleVerify}
                            disabled={loading || enteredOtp.join('').length !== 6}
                            className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <i className="fas fa-spinner fa-spin"></i>
                                    Verifying...
                                </span>
                            ) : (
                                'Verify OTP'
                            )}
                        </button>
                    </>
                )}

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="w-full mt-4 bg-gray-100 text-gray-700 py-3 rounded-2xl font-bold hover:bg-gray-200 active:scale-95 transition-all"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

export default OTPModal;
