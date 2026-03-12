import React, { useState } from 'react';

interface ProofOfDeliveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { imageData: string; otp: string }) => Promise<void> | void;
}

const ProofOfDeliveryModal: React.FC<ProofOfDeliveryModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [step, setStep] = useState<'photo' | 'otp'>('photo');
    const [imageData, setImageData] = useState<string | null>(null);
    const [compressing, setCompressing] = useState(false);
    const [enteredOtp, setEnteredOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const compressToDataUrl = (file: File, maxDim = 1280, quality = 0.75) => {
        return new Promise<string>((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                try {
                    const w = img.width;
                    const h = img.height;
                    const scale = Math.min(1, maxDim / Math.max(w, h));
                    const targetW = Math.max(1, Math.round(w * scale));
                    const targetH = Math.max(1, Math.round(h * scale));
                    const canvas = document.createElement('canvas');
                    canvas.width = targetW;
                    canvas.height = targetH;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error('Canvas not supported');
                    ctx.drawImage(img, 0, 0, targetW, targetH);
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    URL.revokeObjectURL(url);
                    resolve(dataUrl);
                } catch (e) {
                    URL.revokeObjectURL(url);
                    reject(e);
                }
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image'));
            };
            img.src = url;
        });
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setError('');
        const file = e.target.files?.[0];
        if (!file) return;
        setCompressing(true);
        try {
            const dataUrl = await compressToDataUrl(file);
            setImageData(dataUrl);
        } catch (err: any) {
            setError(err?.message || 'Failed to process image');
            setImageData(null);
        } finally {
            setCompressing(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) return;
        if (!/^\d*$/.test(value)) return;
        const next = [...enteredOtp];
        next[index] = value;
        setEnteredOtp(next);
        if (value && index < 5) {
            const nextInput = document.getElementById(`pod-otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !enteredOtp[index] && index > 0) {
            const prevInput = document.getElementById(`pod-otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleComplete = async () => {
        if (!imageData) return;
        const otp = enteredOtp.join('');
        if (otp.length !== 6) {
            setError('Please enter complete 6-digit OTP');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await onSubmit({ imageData, otp });
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to verify OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-gradient-to-br from-[#f8f9fa]/95 via-white/85 to-[#e9ecef]/95 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Proof of Delivery</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Step {step === 'photo' ? '1' : '2'} of 2: {step === 'photo' ? 'Upload Photo' : 'Verify Buyer OTP'}
                        </p>
                    </div>
                    <button type="button" title="Close" aria-label="Close" onClick={onClose} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="p-8">
                    {step === 'photo' ? (
                        <div className="space-y-6">
                            <div className="border-2 border-dashed border-gray-300 rounded-3xl p-8 text-center hover:bg-gray-50 transition-colors relative">
                                <label htmlFor="pod-photo" className="sr-only">Upload delivery photo</label>
                                <input
                                    id="pod-photo"
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    title="Upload delivery photo"
                                    aria-label="Upload delivery photo"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {imageData ? (
                                    <div className="relative">
                                        <img src={imageData} alt="Preview" className="max-h-48 mx-auto rounded-xl shadow-sm" />
                                        <p className="mt-4 text-sm font-bold text-green-600 flex items-center justify-center gap-2">
                                            <i className="fas fa-check-circle"></i> Photo Ready
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto text-2xl">
                                            <i className="fas fa-camera"></i>
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{compressing ? 'Processing...' : 'Tap to Capture'}</p>
                                            <p className="text-xs text-gray-400">Take a clear photo of the delivered items</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {!!error && (
                                <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
                                    <p className="text-red-600 text-xs font-bold text-center">{error}</p>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setError('');
                                    setStep('otp');
                                }}
                                disabled={!imageData || compressing}
                                className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-900 transition-all active:scale-95"
                            >
                                Next
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-gray-50 border border-gray-200 rounded-3xl p-5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center mb-4">
                                    Enter Buyer OTP (6 digits)
                                </p>
                                <div className="flex gap-2 justify-center">
                                    {enteredOtp.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`pod-otp-${index}`}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            className="w-11 h-14 text-center text-2xl font-black border-2 border-gray-200 rounded-2xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all bg-white"
                                            aria-label={`OTP digit ${index + 1}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {!!error && (
                                <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
                                    <p className="text-red-600 text-xs font-bold text-center">{error}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setStep('photo')}
                                    className="bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={handleComplete}
                                    disabled={!imageData || enteredOtp.join('').length !== 6 || loading}
                                    className="bg-green-600 text-white py-4 rounded-2xl font-bold hover:bg-green-700 disabled:opacity-50 transition-all active:scale-95"
                                >
                                    {loading ? 'Verifying...' : 'Complete Delivery'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProofOfDeliveryModal;
