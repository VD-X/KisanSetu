import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRoleTranslate } from '../hooks/useRoleTranslate';
import { auth } from '../firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { API_URL } from '../services/api';
import LocationPicker from '../components/LocationPicker';
import ModernDropdown from '../components/common/ModernDropdown';

const SignupFarmer: React.FC = () => {
    const { t } = useRoleTranslate();
    const apiBase = API_URL;
    const navigate = useNavigate();
    const { user, login } = useAuth();
    
    // Redirect if already authenticated
    React.useEffect(() => {
        if (user) {
            navigate('/farmer/dashboard', { replace: true });
        }
    }, [user, navigate]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        gender: 'Male',
        phone: '',
        landSize: '',
        address: '',
        village: '',
        mandal: '',
        district: '',
        state: '',
        pincode: '',
        latitude: null as number | null,
        longitude: null as number | null,
        language: 'ENGLISH',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError(t('common.passwords_not_match'));
            return;
        }

        setLoading(true);

        try {
            // 1. Create user in Firebase
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;
            const idToken = await user.getIdToken();

            // 2. Synchronize with Backend
            const response = await fetch(`${apiBase}/auth/firebase-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idToken,
                    role: 'FARMER',
                    email: formData.email,
                    name: formData.fullName,
                    profileData: {
                        fullName: formData.fullName,
                        gender: formData.gender,
                        phone: formData.phone,
                        landSize: parseFloat(formData.landSize),
                        address: formData.address,
                        village: formData.village,
                        mandal: formData.mandal,
                        district: formData.district,
                        state: formData.state,
                        pincode: formData.pincode,
                        latitude: formData.latitude,
                        longitude: formData.longitude,
                        language: formData.language,
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // If backend fails, we might want to delete the Firebase user or handle it
                throw new Error(data.message || 'Profile creation failed');
            }

            // 3. Update Auth Context and navigate
            login(data.token, data.user);
            navigate('/farmer/dashboard', { replace: true });

        } catch (err: any) {
            console.error('Signup error:', err);
            setError(err.message || 'An error occurred during signup');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Animated Background Blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-green-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            {/* Signup Card */}
            <div className="max-w-2xl w-full space-y-8 bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-2xl border border-white/20 relative z-10 animate-fadeInUp">
                {/* Header */}
                <div className="text-center animate-scaleIn anim-delay-200">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg mb-4 animate-float">
                        <span className="text-4xl">🌾</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        {t('farmer.create_farmer_account')}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">{t('farmer.join_marketplace')}</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg animate-shake" role="alert">
                            <div className="flex items-center">
                                <span className="text-xl mr-2">⚠️</span>
                                <span className="font-medium">{error}</span>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Full Name */}
                        <div className="md:col-span-2 animate-slideInRight anim-delay-300">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                            <input
                                name="fullName"
                                type="text"
                                placeholder="Enter your full name"
                                autoComplete="name"
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 hover:border-green-400 bg-white/50 backdrop-blur-sm"
                                onChange={handleChange}
                            />
                        </div>

                        {/* Gender */}
                        <div className="animate-slideInRight anim-delay-350 relative z-50">
                            <ModernDropdown
                                label="Gender"
                                value={formData.gender}
                                options={[
                                    { value: 'Male', label: 'Male', icon: 'fas fa-male' },
                                    { value: 'Female', label: 'Female', icon: 'fas fa-female' },
                                    { value: 'Other', label: 'Other', icon: 'fas fa-genderless' }
                                ]}
                                onChange={(value) => setFormData({ ...formData, gender: value })}
                                placeholder="Select Gender"
                            />
                        </div>

                        {/* Phone */}
                        <div className="animate-slideInRight anim-delay-400">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                            <input
                                name="phone"
                                type="tel"
                                placeholder="Enter phone number"
                                autoComplete="tel"
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 hover:border-green-400 bg-white/50 backdrop-blur-sm"
                                onChange={handleChange}
                            />
                        </div>

                        {/* Email */}
                        <div className="md:col-span-2 animate-slideInRight anim-delay-450">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                            <input
                                name="email"
                                type="email"
                                placeholder="your@email.com"
                                autoComplete="email"
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 hover:border-green-400 bg-white/50 backdrop-blur-sm"
                                onChange={handleChange}
                            />
                        </div>

                        {/* Password */}
                        <div className="animate-slideInRight anim-delay-500">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                            <input
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                autoComplete="new-password"
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 hover:border-green-400 bg-white/50 backdrop-blur-sm"
                                onChange={handleChange}
                            />
                        </div>

                        {/* Confirm Password */}
                        <div className="animate-slideInRight anim-delay-550">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                            <input
                                name="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                autoComplete="new-password"
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 hover:border-green-400 bg-white/50 backdrop-blur-sm"
                                onChange={handleChange}
                            />
                        </div>

                        {/* Location Picker */}
                        <div className="md:col-span-2 animate-slideInRight anim-delay-580">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Location Detection</label>
                            <LocationPicker
                                hideMap={true}
                                value={{
                                    latitude: formData.latitude,
                                    longitude: formData.longitude,
                                    fullAddress: formData.address,
                                    city: formData.village, // Mapping city to village for farmer
                                    mandal: formData.mandal,
                                    district: formData.district,
                                    state: formData.state,
                                    pincode: formData.pincode
                                }}
                                onChange={(loc) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        address: loc.fullAddress || '',
                                        village: loc.city || loc.town || loc.village || '',
                                        mandal: (loc as any).mandal || '',
                                        district: loc.district || '',
                                        state: loc.state || '',
                                        pincode: loc.pincode || '',
                                        latitude: loc.latitude,
                                        longitude: loc.longitude
                                    }));
                                }}
                                pickupLocation={undefined}
                            />
                        </div>

                        {/* Location Details - Auto-filled but visible */}
                        <div className="md:col-span-2 animate-slideInRight anim-delay-600">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Street Address / House Name</label>
                            <input
                                name="address"
                                type="text"
                                value={formData.address}
                                placeholder="Auto-detected address"
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 hover:border-green-400 bg-white/50 backdrop-blur-sm"
                                onChange={handleChange}
                            />
                        </div>

                        <div className="animate-slideInRight anim-delay-600">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Mandal/Tehsil</label>
                            <input
                                name="mandal"
                                type="text"
                                value={formData.mandal}
                                placeholder="Auto-detected mandal"
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 hover:border-green-400 bg-white/50 backdrop-blur-sm"
                                onChange={handleChange}
                            />
                        </div>

                        <div className="animate-slideInRight anim-delay-600">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Village/City</label>
                            <input
                                name="village"
                                type="text"
                                value={formData.village}
                                placeholder="Auto-detected village"
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 hover:border-green-400 bg-white/50 backdrop-blur-sm"
                                onChange={handleChange}
                            />
                        </div>

                        <div className="animate-slideInRight anim-delay-600">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">District</label>
                            <input
                                name="district"
                                type="text"
                                value={formData.district}
                                placeholder="Auto-detected district"
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 hover:border-green-400 bg-white/50 backdrop-blur-sm"
                                onChange={handleChange}
                            />
                        </div>

                        <div className="animate-slideInRight anim-delay-620">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
                            <input
                                name="state"
                                type="text"
                                value={formData.state}
                                placeholder="Auto-detected state"
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 hover:border-green-400 bg-white/50 backdrop-blur-sm"
                                onChange={handleChange}
                            />
                        </div>

                        <div className="animate-slideInRight anim-delay-620">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Pincode</label>
                            <input
                                name="pincode"
                                type="text"
                                value={formData.pincode}
                                placeholder="Auto-detected pincode"
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 hover:border-green-400 bg-white/50 backdrop-blur-sm"
                                onChange={handleChange}
                            />
                        </div>

                        {/* Land Size */}
                        <div className="animate-slideInRight anim-delay-600">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Land Size (Acres)</label>
                            <input
                                name="landSize"
                                type="number"
                                step="0.1"
                                placeholder="Enter land size"
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 hover:border-green-400 bg-white/50 backdrop-blur-sm"
                                onChange={handleChange}
                            />
                        </div>

                        {/* Language */}
                        <div className="animate-slideInRight anim-delay-650 relative">
                            <ModernDropdown
                                label="Preferred Language"
                                value={formData.language}
                                options={[
                                    { value: 'ENGLISH', label: 'English', icon: 'fas fa-language' },
                                    { value: 'HINDI', label: 'Hindi', icon: 'fas fa-language' },
                                    { value: 'TELUGU', label: 'Telugu', icon: 'fas fa-language' },
                                    { value: 'TAMIL', label: 'Tamil', icon: 'fas fa-language' },
                                    { value: 'KANNADA', label: 'Kannada', icon: 'fas fa-language' }
                                ]}
                                onChange={(value) => setFormData({ ...formData, language: value })}
                                placeholder="Select Language"
                                direction="top"
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="animate-slideInUp anim-delay-900">
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Registering...</span>
                                </div>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <span>Create Account</span>
                                    <span className="transform group-hover:translate-x-1 transition-transform duration-300">→</span>
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Login Link */}
                    <div className="text-center text-sm animate-fadeIn anim-delay-1000">
                        <span className="text-gray-600">Already have an account? </span>
                        <Link
                            to="/login"
                            className="font-semibold text-green-600 hover:text-green-700 transition-colors duration-300 hover:underline"
                        >
                            Login here
                        </Link>
                    </div>
                </form>
            </div >
        </div >
    );
};

export default SignupFarmer;
