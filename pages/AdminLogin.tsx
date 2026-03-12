import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRoleTranslate } from '../hooks/useRoleTranslate';

const AdminLogin = () => {
    const { t } = useRoleTranslate();
    const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const apiBase = rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl.replace(/\/+$/, '')}/api`;

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [adminSecret, setAdminSecret] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showSecret, setShowSecret] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${apiBase}/auth/admin-login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, adminSecret }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            login(data.token, data.user);
            navigate('/admin/dashboard');

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Animated Background Blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            {/* Login Card */}
            <div className="max-w-md w-full space-y-8 bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-2xl border border-white/20 relative z-10 animate-fadeInUp">
                {/* Logo/Icon */}
                <div className="text-center animate-scaleIn anim-delay-200">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg mb-4 animate-float">
                        <ShieldCheck className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                        Admin Portal
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">Secure access for administrators only</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg animate-slideInLeft" role="alert">
                            <div className="flex items-center">
                                <span className="text-xl mr-2">⚠️</span>
                                <span className="block sm:inline font-medium">{error}</span>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Email Input */}
                        <div className="animate-slideInRight anim-delay-400">
                            <label htmlFor="email-address" className="block text-sm font-semibold text-gray-700 mb-2">
                                {t('common.email_address')}
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-400 text-xl">📧</span>
                                </div>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="appearance-none relative block w-full pl-12 pr-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 hover:border-purple-400 focus:scale-[1.02] bg-white/50 backdrop-blur-sm"
                                    placeholder="admin@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="animate-slideInRight anim-delay-500">
                            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                                {t('common.password')}
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-400 text-xl">🔒</span>
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    required
                                    className="appearance-none relative block w-full pl-12 pr-12 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 hover:border-purple-400 focus:scale-[1.02] bg-white/50 backdrop-blur-sm"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-purple-600 transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Admin Secret Key */}
                        <div className="animate-slideInRight anim-delay-600">
                            <label htmlFor="admin-secret" className="block text-sm font-semibold text-gray-700 mb-2">
                                Admin Secret Key
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-400 text-xl">🛡️</span>
                                </div>
                                <input
                                    id="admin-secret"
                                    name="adminSecret"
                                    type={showSecret ? 'text' : 'password'}
                                    required
                                    className="appearance-none relative block w-full pl-12 pr-12 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 hover:border-purple-400 focus:scale-[1.02] bg-white/50 backdrop-blur-sm"
                                    placeholder="Enter admin secret key"
                                    value={adminSecret}
                                    onChange={(e) => setAdminSecret(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-purple-600 transition-colors"
                                    onClick={() => setShowSecret(!showSecret)}
                                    tabIndex={-1}
                                >
                                    {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            <p className="mt-1 text-xs text-gray-400">Required for administrator access</p>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="animate-slideInUp anim-delay-700">
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Verifying Access...</span>
                                </div>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5" />
                                    <span>Secure Admin Login</span>
                                    <span className="transform group-hover:translate-x-1 transition-transform duration-300">→</span>
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Back to User Login */}
                    <div className="text-center text-sm animate-fadeIn anim-delay-800">
                        <Link
                            to="/login"
                            className="font-medium text-gray-600 hover:text-purple-600 transition-colors"
                        >
                            ← Back to User Login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
