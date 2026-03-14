import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../firebaseConfig';
import { onIdTokenChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { API_URL } from '../services/api';

// Define the User type strictly according to the backend
export type Role = 'FARMER' | 'BUYER' | 'TRANSPORTER' | 'ADMIN';

export interface User {
    id: string;
    email: string;
    role: Role;
    status: 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED';
    name?: string;
    profilePhoto?: string;
    phone?: string;
    language?: string;
    location?: {
        village?: string;
        district?: string;
        state?: string;
    };
}

interface AuthContextType {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    token: string | null;
    isLoading: boolean;
    login: (token: string, user: User) => void;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(() => {
        try {
            const saved = localStorage.getItem('user');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(() => {
        const hasLocalAuth = !!localStorage.getItem('token') && !!localStorage.getItem('user');
        return !hasLocalAuth;
    });

    useEffect(() => {
        // Listen for Firebase auth state changes including token refreshes
        const unsubscribe = onIdTokenChanged(auth, async (fUser) => {
            if (fUser) {
                // If we have fUser, we are definitely authenticated or in process
                setFirebaseUser(fUser);
                const idToken = await fUser.getIdToken();
                setToken(idToken);
                localStorage.setItem('token', idToken);

                // Fetch full user profile from backend to sync
                try {
                    const response = await fetch(`${API_URL}/auth/me`, {
                        headers: {
                            'Authorization': `Bearer ${idToken}`
                        }
                    });
                    if (response.ok) {
                        const userData = await response.json();
                        setUser(userData);
                        localStorage.setItem('user', JSON.stringify(userData));
                    } else if (response.status === 401) {
                        console.warn('[AuthContext] Token rejected by backend. Logging out.');
                        logout();
                    }
                } catch (error) {
                    console.error('Error fetching/syncing user profile:', error);
                    // Keep the local user if fetch fails (optimistic)
                }
            } else {
                setFirebaseUser(null);
                setToken(null);
                setUser(null);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = (newToken: string, newUser: User) => {
        // Manual login override if needed (e.g. immediately after signup)
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
    };

    const refreshUser = async () => {
        if (!token) return;
        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
                console.log('[AuthContext] Profile refreshed');
            }
        } catch (error) {
            console.error('[AuthContext] Refresh failed:', error);
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
            setFirebaseUser(null);
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                firebaseUser,
                token,
                isLoading,
                login,
                logout,
                refreshUser,
                isAuthenticated: !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
