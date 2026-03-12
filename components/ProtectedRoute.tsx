import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, Role } from '../context/AuthContext';

interface ProtectedRouteProps {
    allowedRoles?: Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
    const { user, isLoading, isAuthenticated } = useAuth();

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to their appropriate dashboard if they try to access a wrong route
        // Or just show unauthorized
        switch (user.role) {
            case 'FARMER':
                return <Navigate to="/farmer/dashboard" replace />;
            case 'BUYER':
                return <Navigate to="/buyer/dashboard" replace />;
            case 'TRANSPORTER':
                return <Navigate to="/transporter/dashboard" replace />;
            case 'ADMIN':
                return <Navigate to="/admin/dashboard" replace />;
            default:
                return <Navigate to="/" replace />;
        }
    }

    return <Outlet />;
};

export default ProtectedRoute;
