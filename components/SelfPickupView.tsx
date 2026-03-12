import React, { useState, useEffect } from 'react';
import { orderAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import io from 'socket.io-client';

interface SelfPickupViewProps {
    orderId: string;
    userRole: 'BUYER' | 'FARMER';
    onComplete?: () => void;
    onClose?: () => void;
}

const SelfPickupView: React.FC<SelfPickupViewProps> = ({ orderId, userRole, onComplete, onClose }) => {
    const { success, error: showError } = useToast();
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [orderData, setOrderData] = useState<any>(null);
    const [otpInput, setOtpInput] = useState<string[]>(['', '', '', '', '', '']);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadPickupDetails();

        // Initialize socket for real-time updates
        const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
        const socket = io(socketUrl);

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
            socket.emit('join_order', orderId);
        });

        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
        });

        socket.on('self_pickup_update', (data: any) => {
            if (data.selfPickupStatus) {
                // Refresh data to get new status/OTP
                loadPickupDetails();
                if (data.message) success(data.message);

                if (data.selfPickupStatus === 'COMPLETED') {
                    setTimeout(() => {
                        if (onComplete) onComplete();
                    }, 2000);
                }
            }
        });

        return () => {
            socket.off('self_pickup_update');
            socket.disconnect();
        };
    }, [orderId]);

    const loadPickupDetails = async () => {
        try {
            setLoading(true);
            const response = await orderAPI.getSelfPickupDetails(orderId);
            setOrderData(response);
            // Reset input when step changes
            setOtpInput(['', '', '', '', '', '']);
        } catch (err: any) {
            showError(err.message || 'Failed to load pickup details');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) value = value.slice(-1);
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otpInput];
        newOtp[index] = value;
        setOtpInput(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`pickup-otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otpInput[index] && index > 0) {
            const prevInput = document.getElementById(`pickup-otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleVerify = async () => {
        const enteredOtp = otpInput.join('');
        if (enteredOtp.length !== 6) {
            showError('Please enter the complete 6-digit OTP');
            return;
        }

        try {
            setVerifying(true);
            const step = orderData.selfPickupStatus === 'PENDING' ? 'VERIFY_FARMER' : 'VERIFY_BUYER';
            await orderAPI.verifySelfPickupStep(orderId, enteredOtp, step);

            // Success handling is done via socket update or we can reload manually
            success('Verification successful!');
            await loadPickupDetails();

            if (step === 'VERIFY_BUYER') {
                setTimeout(() => {
                    if (onComplete) onComplete();
                }, 2000);
            }
        } catch (err: any) {
            showError(err.message || 'Verification failed');
        } finally {
            setVerifying(false);
        }
    };

    const handleCopyOtp = (otp: string) => {
        navigator.clipboard.writeText(otp).then(() => {
            setCopied(true);
            success('OTP copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        });
    };

    // Determine Mode
    let mode: 'SHOW_OTP' | 'ENTER_OTP' | 'COMPLETED' | 'WAITING' = 'WAITING';
    let otpDisplay = '';
    let stepTitle = '';
    let stepDescription = '';

    if (!loading && orderData) {
        if (orderData.selfPickupStatus === 'COMPLETED') {
            mode = 'COMPLETED';
        } else if (orderData.selfPickupStatus === 'PENDING') {
            // STEP 1: Buyer verifies Farmer
            if (userRole === 'BUYER') {
                mode = 'ENTER_OTP';
                stepTitle = 'Step 1: Verify Farmer';
                stepDescription = 'Ask the Farmer for the pickup verification code and enter it below.';
            } else { // FARMER
                mode = 'SHOW_OTP';
                otpDisplay = orderData.farmerPickupOtp;
                stepTitle = 'Step 1: Share Code';
                stepDescription = 'Show this code to the Buyer to verify your identity.';
            }
        } else if (orderData.selfPickupStatus === 'BUYER_VERIFIED') {
            // STEP 2: Farmer verifies Buyer
            if (userRole === 'FARMER') {
                mode = 'ENTER_OTP';
                stepTitle = 'Step 2: Verify Buyer';
                stepDescription = 'Ask the Buyer for the confirmation code and enter it below to complete the order.';
            } else { // BUYER
                mode = 'SHOW_OTP';
                otpDisplay = orderData.buyerPickupOtp;
                stepTitle = 'Step 2: Share Confirmation';
                stepDescription = 'Show this code to the Farmer to complete your pickup.';
            }
        }
    }

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center">
                    <i className="fas fa-spinner fa-spin text-4xl text-green-600 mb-4"></i>
                    <p className="text-gray-600 font-medium">Loading pickup details...</p>
                </div>
            </div>
        );
    }

    if (mode === 'COMPLETED') {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center animate-slideInUp">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                        <i className="fas fa-check text-4xl text-green-600 animate-bounce"></i>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Pickup Complete!</h2>
                    <p className="text-gray-500 font-medium">Order has been completed successfully.</p>
                    <button
                        onClick={onClose}
                        className="mt-6 px-6 py-2 bg-gray-100 font-bold text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden animate-slideInUp shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-green-500 p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-emerald-100 text-sm font-medium mb-1">Self Pickup</p>
                                <h2 className="text-2xl font-black">2-Step Verification</h2>
                            </div>
                            {onClose && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                                >
                                    <i className="fas fa-times text-white"></i>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Progress Indicator */}
                    <div className="flex items-center justify-center mb-4">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${orderData?.selfPickupStatus === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'
                            }`}>
                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs">1</div>
                            Verify Farmer
                        </div>
                        <div className="w-8 h-0.5 bg-gray-200"></div>
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${orderData?.selfPickupStatus === 'BUYER_VERIFIED' ? 'bg-amber-100 text-amber-700' :
                            (orderData?.selfPickupStatus === 'PENDING' ? 'bg-gray-100 text-gray-400' : 'bg-green-100 text-green-700')
                            }`}>
                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs">2</div>
                            Verify Buyer
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{stepTitle}</h3>
                        <p className="text-gray-500 text-sm mb-6">{stepDescription}</p>

                        {mode === 'SHOW_OTP' && (
                            <div className="bg-gray-50 rounded-2xl p-6 mb-4 border-2 border-dashed border-gray-200">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Code to Share</p>
                                <div className="text-4xl font-black text-gray-900 tracking-[0.5em] pl-4 mb-4">
                                    {otpDisplay}
                                </div>
                                <button
                                    onClick={() => handleCopyOtp(otpDisplay)}
                                    className="text-emerald-600 font-bold text-sm hover:text-emerald-700"
                                >
                                    <i className={`fas ${copied ? 'fa-check' : 'fa-copy'} mr-2`}></i>
                                    {copied ? 'Copied' : 'Copy Code'}
                                </button>
                            </div>
                        )}

                        {mode === 'ENTER_OTP' && (
                            <div>
                                <div className="flex justify-center gap-2 mb-6">
                                    {otpInput.map((digit, i) => (
                                        <input
                                            key={i}
                                            id={`pickup-otp-${i}`}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                            className="w-12 h-14 text-center text-xl font-black border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={handleVerify}
                                    disabled={verifying || otpInput.join('').length !== 6}
                                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-green-500 text-white rounded-2xl font-black text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all"
                                >
                                    {verifying ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <i className="fas fa-spinner fa-spin"></i> Verifying...
                                        </span>
                                    ) : (
                                        'Verify Code'
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Order Summary */}
                    <div className="border-t border-gray-100 pt-4 text-left">
                        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                <i className="fas fa-box text-emerald-600"></i>
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 text-sm">{orderData?.crop}</p>
                                <p className="text-xs text-gray-500">{orderData?.quantity} kg • Total: ₹{orderData?.priceFinal}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SelfPickupView;
