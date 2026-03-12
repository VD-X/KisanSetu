import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const MagicLinkHandler = () => {
    const [status, setStatus] = useState('Verifying your magic link...');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const apiBase = rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl.replace(/\/+$/, '')}/api`;

    useEffect(() => {
        const handleMagicLink = async () => {
            if (isSignInWithEmailLink(auth, window.location.href)) {
                let email = window.localStorage.getItem('emailForSignIn');

                if (!email) {
                    email = window.prompt('Please provide your email for confirmation');
                }

                if (email) {
                    try {
                        setStatus('Signing you in...');
                        const result = await signInWithEmailLink(auth, email, window.location.href);
                        window.localStorage.removeItem('emailForSignIn');

                        const idToken = await result.user.getIdToken();

                        // Sync with backend (auto-linking/session creation)
                        // Note: Default role for Magic Link recovery is set to FARMER, 
                        // but the backend will override it with the actual registered role.
                        const response = await fetch(`${apiBase}/auth/firebase-login`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ idToken, role: 'FARMER' }), // Role will be checked/corrected by backend
                        });

                        const data = await response.json();
                        if (!response.ok) throw new Error(data.message || 'Session sync failed');

                        login(data.token, data.user);

                        // Redirect based on role
                        switch (data.user.role) {
                            case 'FARMER': navigate('/farmer/dashboard'); break;
                            case 'BUYER': navigate('/buyer/dashboard'); break;
                            case 'TRANSPORTER': navigate('/transporter/dashboard'); break;
                            case 'ADMIN': navigate('/admin/dashboard'); break;
                            default: navigate('/');
                        }
                    } catch (err: any) {
                        console.error("Magic Link Error:", err);
                        setError(err.message);
                        setStatus('Failed to sign in.');
                    }
                }
            } else {
                setStatus('Invalid or expired magic link.');
            }
        };

        handleMagicLink();
    }, [navigate, login, apiBase]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
                {!error ? (
                    <>
                        <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-800">{status}</h2>
                        <p className="text-gray-500 mt-2">Please wait while we set up your session.</p>
                    </>
                ) : (
                    <>
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Error</h2>
                        <p className="text-red-600 mt-2">{error}</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="mt-6 px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                        >
                            Back to Login
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default MagicLinkHandler;
