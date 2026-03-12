import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRoleTranslate } from '../hooks/useRoleTranslate';
import { auth } from '../firebaseConfig';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { API_URL } from '../services/api';
import LocationPicker from '../components/LocationPicker';
import ModernDropdown from '../components/common/ModernDropdown';
import { TRANS_VEHICLES } from '../constants';

const SignupTransporter = () => {
    const { t } = useRoleTranslate();
    const apiBase = API_URL;
    const navigate = useNavigate();
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');


    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        gender: 'Male',
        phone: '',
        // Address Fields
        address: '',
        city: '',
        district: '',
        state: '',
        pincode: '',
        latitude: null,
        longitude: null,
        // Fleet Details
        vehicleType: '',
        vehicleNumber: '',
        capacity: '',
        pricePerKm: '',
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
                    role: 'TRANSPORTER',
                    email: formData.email,
                    name: formData.fullName,
                    profileData: {
                        fullName: formData.fullName,
                        gender: formData.gender,
                        phone: formData.phone,
                        // Address Details
                        address: formData.address,
                        city: formData.city,
                        state: formData.state,
                        pincode: formData.pincode,
                        // Fleet Details
                        vehicleType: formData.vehicleType,
                        vehicleNumber: formData.vehicleNumber,
                        capacity: parseFloat(formData.capacity),
                        pricePerKm: parseFloat(formData.pricePerKm),
                        language: formData.language,
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Profile creation failed');
            }

            if (data.user.status === 'PENDING_APPROVAL') {
                navigate('/transporter/pending-approval');
            } else {
                login(data.token, data.user);
                navigate('/transporter/dashboard');
            }

        } catch (err: any) {
            console.error('Signup error:', err);
            setError(err.message || 'An error occurred during signup');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden" >
            {/* Animated Background Blobs */}
            < div className="absolute inset-0 overflow-hidden pointer-events-none" >
                <div className="absolute top-0 -left-4 w-72 h-72 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-amber-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
            </div >

            {/* Signup Card */}
            < div className="max-w-2xl w-full space-y-8 bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-2xl border border-white/20 relative z-10 animate-fadeInUp" >
                {/* Header */}
                < div className="text-center animate-scaleIn anim-delay-200" >
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg mb-4 animate-float">
                        <span className="text-4xl">🚛</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                        {t('transporter.create_transporter_account')}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">{t('transporter.earn_by_delivering')}</p>
                </div >

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
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 hover:border-orange-400 bg-white/50 backdrop-blur-sm"
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
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 hover:border-orange-400 bg-white/50 backdrop-blur-sm"
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
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 hover:border-orange-400 bg-white/50 backdrop-blur-sm"
                                onChange={handleChange}
                            />
                        </div>

                        {/* Address & Location - using LocationPicker */}
                        <div className="md:col-span-2 mt-4 mb-2 animate-fadeIn anim-delay-500">
                            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2">Address & Location</h3>
                        </div>

                        <div className="md:col-span-2 animate-slideInRight anim-delay-500 z-50">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Location</label>
                            <LocationPicker
                                value={{
                                    latitude: formData.latitude,
                                    longitude: formData.longitude,
                                    fullAddress: formData.address,
                                    city: formData.city,
                                    district: formData.district,
                                    state: formData.state,
                                    pincode: formData.pincode
                                }}
                                onChange={(loc) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        latitude: loc.latitude,
                                        longitude: loc.longitude,
                                        address: loc.fullAddress,
                                        city: loc.city || loc.town || loc.village || '',
                                        district: loc.district || '',
                                        state: loc.state || '',
                                        pincode: loc.pincode || ''
                                    }));
                                }}
                                hideMap={true}
                                pickupLocation={undefined} />
                        </div>

                        {/* Location Details - Visible and Auto-filled */}
                        <div className="md:col-span-2 animate-slideInRight anim-delay-550">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Street Address / Village</label>
                            <input
                                name="address"
                                type="text"
                                value={formData.address}
                                placeholder="Auto-detected address"
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 hover:border-orange-400 bg-white/50 backdrop-blur-sm"
                                onChange={handleChange}
                            />
                        </div>

                        <div className="animate-slideInRight anim-delay-600">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">City/Town</label>
                            <input
                                name="city"
                                type="text"
                                value={formData.city}
                                placeholder="Auto-detected city"
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 hover:border-orange-400 bg-white/50 backdrop-blur-sm"
                                onChange={handleChange}
                            />
                        </div>

                        <div className="animate-slideInRight anim-delay-600">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Pincode</label>
                            <input
                                name="pincode"
                                type="text"
                                value={formData.pincode}
                                placeholder="Auto-detected pincode"
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 hover:border-orange-400 bg-white/50 backdrop-blur-sm"
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
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 hover:border-orange-400 bg-white/50 backdrop-blur-sm"
                                onChange={handleChange}
                            />
                        </div>

                        <div className="animate-slideInRight anim-delay-600">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
                            <input
                                name="state"
                                type="text"
                                value={formData.state}
                                placeholder="Auto-detected state"
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 hover:border-orange-400 bg-white/50 backdrop-blur-sm"
                                onChange={handleChange}
                            />
                        </div>


                        {/* Fleet Management */}
                        <div className="md:col-span-2 mt-4 mb-2 animate-fadeIn anim-delay-600">
                            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2">Fleet Management</h3>
                        </div>

                        {/* Vehicle Type Selection (Custom Dropdown) */}
                        {/* Vehicle Type Selection (Modern Dropdown) */}
                        <div className="animate-slideInRight anim-delay-650 relative z-20">
                            <ModernDropdown
                                label="Vehicle Type"
                                value={formData.vehicleType}
                                options={TRANS_VEHICLES.map(v => ({
                                    value: v.name,
                                    label: v.name,
                                    icon: v.icon,
                                    subLabel: `Max ${v.capacity}kg`
                                }))}
                                onChange={(value) => {
                                    const vehicle = TRANS_VEHICLES.find(v => v.name === value);
                                    setFormData(prev => ({
                                        ...prev,
                                        vehicleType: value,
                                        // Auto-fill capacity and price if a standard vehicle is selected
                                        ...(vehicle && {
                                            capacity: vehicle.capacity.toString(),
                                            pricePerKm: vehicle.perKmPrice.toString()
                                        })
                                    }));
                                }}
                                required
                                placeholder="Select your vehicle type"
                            />
                        </div>

                        {/* Vehicle Number */}
                        <div className="animate-slideInRight anim-delay-650">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Number</label>
                            <input
                                name="vehicleNumber"
                                type="text"
                                placeholder="Enter vehicle number"
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 hover:border-orange-400 bg-white/50 backdrop-blur-sm"
                                onChange={handleChange}
                            />
                        </div>

                        {/* Capacity */}
                        <div className="animate-slideInRight anim-delay-700">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Max Load Capacity (kg)</label>
                            <input
                                name="capacity"
                                type="number"
                                step="100"
                                value={formData.capacity}
                                placeholder="Enter capacity in kg"
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 hover:border-orange-400 bg-white/50 backdrop-blur-sm"
                                onChange={handleChange}
                            />
                        </div>

                        {/* Price Per Km */}
                        <div className="animate-slideInRight anim-delay-700">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Cost per km (₹)</label>
                            <input
                                name="pricePerKm"
                                type="number"
                                step="1"
                                value={formData.pricePerKm}
                                placeholder="Enter price per km"
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 hover:border-orange-400 bg-white/50 backdrop-blur-sm"
                                onChange={handleChange}
                            />
                        </div>

                        {/* Password Section Moved Down */}
                        <div className="md:col-span-2 mt-4 mb-2 animate-fadeIn anim-delay-750">
                            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2">Security</h3>
                        </div>

                        {/* Password */}
                        <div className="animate-slideInRight anim-delay-800">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                            <input
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 hover:border-orange-400 bg-white/50 backdrop-blur-sm"
                                onChange={handleChange}
                            />
                        </div>

                        {/* Confirm Password */}
                        <div className="animate-slideInRight anim-delay-800">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                            <input
                                name="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                required
                                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 hover:border-orange-400 bg-white/50 backdrop-blur-sm"
                                onChange={handleChange}
                            />
                        </div>

                        {/* Language */}
                        <div className="md:col-span-2 animate-slideInRight anim-delay-800 relative">
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
                    <div className="animate-slideInUp anim-delay-850">
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Submitting Application...</span>
                                </div>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <span>Submit Application</span>
                                    <span className="transform group-hover:translate-x-1 transition-transform duration-300">→</span>
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Login Link */}
                    <div className="text-center text-sm animate-fadeIn anim-delay-900">
                        <span className="text-gray-600">Already have an account? </span>
                        <Link
                            to="/login"
                            className="font-semibold text-orange-600 hover:text-orange-700 transition-colors duration-300 hover:underline"
                        >
                            Login here
                        </Link>
                    </div>
                </form>
            </div >
        </div >
    );
};

export default SignupTransporter;
