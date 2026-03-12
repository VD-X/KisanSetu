import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
// Lazy load pages
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const Login = React.lazy(() => import('./pages/Login'));
const AdminLogin = React.lazy(() => import('./pages/AdminLogin'));
const RoleSelection = React.lazy(() => import('./pages/RoleSelection'));
const SignupFarmer = React.lazy(() => import('./pages/SignupFarmer'));
const SignupBuyer = React.lazy(() => import('./pages/SignupBuyer'));
const SignupTransporter = React.lazy(() => import('./pages/SignupTransporter'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const TestLocation = React.lazy(() => import('./pages/TestLocation'));
const TestTracking = React.lazy(() => import('./pages/TestTracking'));
const LiveTracking = React.lazy(() => import('./pages/LiveTracking'));
const ArrangeDeliveryPage = React.lazy(() => import('./pages/ArrangeDeliveryPage'));
const MagicLinkHandler = React.lazy(() => import('./pages/MagicLinkHandler'));


// Loading Fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
  </div>
);
import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
  return (
    <Router>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <React.Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/select-role" element={<RoleSelection />} />
                <Route path="/signup/farmer" element={<SignupFarmer />} />
                <Route path="/signup/buyer" element={<SignupBuyer />} />
                <Route path="/signup/transporter" element={<SignupTransporter />} />
                <Route path="/test-location" element={<TestLocation />} />
                <Route path="/test-tracking" element={<TestTracking />} />
                <Route path="/tracking/:deliveryId" element={<LiveTracking />} />
                <Route path="/auth/magic-link" element={<MagicLinkHandler />} />

                <Route path="/transporter/pending-approval" element={
                  <div className="flex h-screen items-center justify-center bg-gray-50 p-6">
                    <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
                      <div className="text-4xl mb-4">⏳</div>
                      <h2 className="text-2xl font-bold mb-2">Approval Pending</h2>
                      <p className="text-gray-600">Your transporter account is currently under review by the admin. Please check back later.</p>
                      <a href="/login" className="mt-6 inline-block text-green-600 hover:underline">Back to Login</a>
                    </div>
                  </div>
                } />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/farmer/dashboard" element={<Dashboard />} />
                  <Route path="/buyer/dashboard" element={<Dashboard />} />
                  <Route path="/transporter/dashboard" element={<Dashboard />} />
                  <Route path="/admin/dashboard" element={<Dashboard />} />
                  <Route path="/arrange-delivery/:orderId" element={<ArrangeDeliveryPage />} />

                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </React.Suspense>
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
};

export default App;
