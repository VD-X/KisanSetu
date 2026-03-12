import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRoleTranslate } from '../hooks/useRoleTranslate';

const RoleSelection = () => {
    const { t } = useRoleTranslate();
    const navigate = useNavigate();

    const handleRoleSelect = (role: string) => {
        switch (role) {
            case 'FARMER':
                navigate('/signup/farmer');
                break;
            case 'BUYER':
                navigate('/signup/buyer');
                break;
            case 'TRANSPORTER':
                navigate('/signup/transporter');
                break;
            case 'ADMIN':
                alert(t('admin.admin_signup_restricted'));
                break;
            default:
                break;
        }
    };

    const roles = [
        {
            id: 'FARMER',
            icon: '🌾',
            title: 'Farmer',
            description: 'Sell your crops directly to buyers and get the best prices',
            color: 'from-green-500 to-emerald-600',
            hoverColor: 'hover:border-green-500',
            delay: '300'
        },
        {
            id: 'BUYER',
            icon: '🛒',
            title: 'Buyer',
            description: 'Source fresh produce directly from farmers',
            color: 'from-blue-500 to-cyan-600',
            hoverColor: 'hover:border-blue-500',
            delay: '400'
        },
        {
            id: 'TRANSPORTER',
            icon: '🚛',
            title: 'Transporter',
            description: 'Earn by delivering crops from farms to buyers',
            color: 'from-orange-500 to-amber-600',
            hoverColor: 'hover:border-orange-500',
            delay: '500'
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 relative overflow-hidden">
            {/* Animated Background Blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 -left-4 w-48 md:w-72 h-48 md:h-72 bg-green-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-48 md:w-72 h-48 md:h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-48 md:w-72 h-48 md:h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-6xl">
                {/* Header */}
                <div className="text-center mb-6 md:mb-12 animate-fadeInUp">
                    <div className="inline-flex items-center justify-center w-14 h-14 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg mb-3 md:mb-6 animate-float">
                        <span className="text-2xl md:text-4xl">🌾</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2 md:mb-4">
                        {t('auth.join_kisansetu')}
                    </h1>
                    <p className="text-gray-600 text-sm md:text-base lg:text-lg max-w-2xl mx-auto px-4">
                        {t('auth.select_role_desc')}
                    </p>
                </div>

                {/* Role Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8 mb-6 md:mb-8">
                    {roles.map((role) => (
                        <div
                            key={role.id}
                            onClick={() => handleRoleSelect(role.id)}
                            className={`group bg-white/80 backdrop-blur-xl p-5 md:p-8 rounded-2xl md:rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer border-2 border-white/50 ${role.hoverColor} flex flex-col items-center transform hover:scale-105 hover:-translate-y-2 animate-fadeInUp anim-delay-${role.delay}`}
                        >
                            {/* Icon */}
                            <div className={`text-5xl md:text-7xl mb-3 md:mb-6 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 animate-float`}>
                                {role.icon}
                            </div>

                            {/* Title */}
                            <h3 className={`text-xl md:text-2xl font-bold bg-gradient-to-r ${role.color} bg-clip-text text-transparent mb-2 md:mb-3`}>
                                {role.title}
                            </h3>

                            {/* Description */}
                            <p className="text-gray-600 text-center leading-relaxed text-sm md:text-base">
                                {role.description}
                            </p>

                            {/* Hover Arrow */}
                            <div className="mt-3 md:mt-6 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                                <div className={`inline-flex items-center gap-2 text-xs md:text-sm font-semibold bg-gradient-to-r ${role.color} bg-clip-text text-transparent`}>
                                    <span>Get Started</span>
                                    <span className="transform group-hover:translate-x-1 transition-transform duration-300">→</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Login Link */}
                <div className="text-center text-gray-600 animate-fadeIn anim-delay-600 text-sm md:text-base">
                    <span>Already have an account? </span>
                    <Link
                        to="/login"
                        className="font-semibold text-green-600 hover:text-green-700 transition-colors duration-300 hover:underline"
                    >
                        Login here
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default RoleSelection;
