import React, { useEffect, useState } from 'react';

interface PaymentSuccessAnimationProps {
    onComplete: () => void;
}

const PaymentSuccessAnimation: React.FC<PaymentSuccessAnimationProps> = ({ onComplete }) => {
    const [step, setStep] = useState(0);

    const steps = [
        { text: 'Processing Payment...', icon: 'fas fa-circle-notch fa-spin', color: 'text-blue-500' },
        { text: 'Securing Funds in Escrow...', icon: 'fas fa-shield-alt', color: 'text-purple-500' },
        { text: 'Verify Farmer Details...', icon: 'fas fa-user-check', color: 'text-orange-500' },
        { text: 'Payment Held Safely', icon: 'fas fa-lock', color: 'text-green-600' },
        { text: 'Order Placed Successfully!', icon: 'fas fa-check-circle', color: 'text-green-600' }
    ];

    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];

        // Sequence of steps
        timers.push(setTimeout(() => setStep(1), 1500));
        timers.push(setTimeout(() => setStep(2), 3000));
        timers.push(setTimeout(() => setStep(3), 4500));
        timers.push(setTimeout(() => setStep(4), 6000));
        timers.push(setTimeout(() => {
            onComplete();
        }, 7500));

        return () => timers.forEach(t => clearTimeout(t));
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 backdrop-blur-sm animate-fadeIn">
            <div className="text-center max-w-md w-full p-8">

                {/* Icon Animation Container */}
                <div className="relative w-32 h-32 mx-auto mb-8 flex items-center justify-center">
                    {/* Ripple Effect */}
                    <div className={`absolute inset-0 rounded-full bg-green-100 ${step === 4 ? 'animate-ping opacity-20' : 'hidden'}`}></div>

                    <div className={`transition-all duration-500 transform ${step === 4 ? 'scale-110' : 'scale-100'}`}>
                        <i className={`${steps[Math.min(step, 4)].icon} text-6xl ${steps[Math.min(step, 4)].color} transition-colors duration-500`}></i>
                    </div>
                </div>

                {/* Text Animation */}
                <h2 className="text-2xl font-black text-gray-900 mb-2 animate-slideInUp">
                    {steps[Math.min(step, 4)].text}
                </h2>

                <p className="text-gray-500 font-medium mb-8 min-h-[1.5em] animate-fadeIn">
                    {step === 1 && "Protecting your money until delivery is complete"}
                    {step === 3 && "Funds released only after you confirm delivery"}
                </p>

                {/* Progress Indicators */}
                <div className="flex justify-center gap-2">
                    {[0, 1, 2, 3, 4].map((s) => (
                        <div
                            key={s}
                            className={`h-1.5 rounded-full transition-all duration-500 ${s <= step ? 'w-8 ' + steps[Math.min(s, 4)].color.replace('text-', 'bg-') : 'w-2 bg-gray-200'
                                }`}
                        ></div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccessAnimation;
