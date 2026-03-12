import React, { useState, useEffect } from 'react';
import { ChevronDown, Check, User, Tractor, ShoppingCart, Truck, ShieldCheck, Mail, Phone, LogIn } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, Role } from '../context/AuthContext';
import { useRoleTranslate } from '../hooks/useRoleTranslate';
import ModernDropdown from '../components/common/ModernDropdown';
import { auth } from '../firebaseConfig';
import { API_URL } from '../services/api';
import {
    GoogleAuthProvider,
    signInWithPopup,
    sendSignInLinkToEmail,
    signInWithEmailAndPassword
} from 'firebase/auth';

const Login = () => {
    const { t } = useRoleTranslate();
    const apiBase = API_URL;

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<Role>('FARMER');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const roles = [
        { id: 'FARMER' as Role, label: 'Farmer', icon: Tractor, color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200' },
        { id: 'BUYER' as Role, label: 'Buyer', icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' },
        { id: 'TRANSPORTER' as Role, label: 'Transporter', icon: Truck, color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-200' },
    ];

    const { login } = useAuth();
    const navigate = useNavigate();

    // Simplified: No special effects needed for email-only login

    const handleFirebaseLogin = async (idToken: string, userDetails?: any) => {
        try {
            const response = await fetch(`${apiBase}/auth/firebase-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken, role, ...userDetails }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Firebase login failed');

            login(data.token, data.user);
            redirectUser(data.user.role);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const idToken = await result.user.getIdToken();
            await handleFirebaseLogin(idToken, {
                email: result.user.email,
                name: result.user.displayName,
                photo: result.user.photoURL
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };


    const handleSendMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const actionCodeSettings = {
            url: `${window.location.origin}/auth/magic-link`,
            handleCodeInApp: true,
        };

        try {
            await sendSignInLinkToEmail(auth, email, actionCodeSettings);
            window.localStorage.setItem('emailForSignIn', email);
            alert(`A magic login link has been sent to ${email}. Please check your inbox.`);
        } catch (err: any) {
            console.error("Magic Link Error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. Sign in with Firebase
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const idToken = await userCredential.user.getIdToken();

            // 2. Synchronize with Backend
            await handleFirebaseLogin(idToken, { email });
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const redirectUser = (userRole: Role) => {
        switch (userRole) {
            case 'FARMER': navigate('/farmer/dashboard'); break;
            case 'BUYER': navigate('/buyer/dashboard'); break;
            case 'TRANSPORTER': navigate('/transporter/dashboard'); break;
            case 'ADMIN': navigate('/admin/dashboard'); break;
            default: navigate('/');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            <div id="recaptcha-container"></div>

            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-green-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            <div className="max-w-md w-full space-y-8 bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-2xl border border-white/20 relative z-10">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg mb-4">
                        <span className="text-4xl">🌾</span>
                    </div>
                    <h2 className="text-3xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        {t('auth.welcome_back')}
                    </h2>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
                            <span>⚠️</span>
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        <ModernDropdown
                            label=""
                            value={role}
                            options={roles.map(r => ({
                                value: r.id, label: r.label, icon: r.icon, iconColor: r.color, iconBg: r.bg
                            }))}
                            onChange={(value) => setRole(value as Role)}
                            placeholder="Select Role"
                        />

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="your@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                            <input
                                type="password"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <div className="text-right">
                                <button
                                    type="button"
                                    onClick={handleSendMagicLink}
                                    className="text-xs font-semibold text-green-600 hover:underline"
                                    disabled={!email || loading}
                                >
                                    Forgot Password? Send Magic Link
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><LogIn size={20} /> Login</>}
                    </button>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                        <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or continue with</span></div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            className="w-full py-3 px-4 border border-gray-300 rounded-xl flex items-center justify-center gap-2 font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                            Google
                        </button>
                    </div>

                    <p className="text-center text-sm text-gray-600">
                        {t('common.dont_have_account')} <Link to="/select-role" className="text-green-600 font-bold hover:underline">{t('common.signup')}</Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

declare global { interface Window { recaptchaVerifier: any; } }
export default Login;
