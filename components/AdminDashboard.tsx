import React, { useState, useEffect, Suspense, lazy } from 'react';
import { socketService } from '../services/socketService';
import AdminLayout from './admin/layout/AdminLayout';

// Layout & Overview
const StatsOverview = lazy(() => import('./admin/overview/StatsOverview'));
const ActivityFeed = lazy(() => import('./admin/overview/ActivityFeed'));

// User Management
const UserManagement = lazy(() => import('./admin/users/UserManagement'));

// Product & Listings
const ListingModeration = lazy(() => import('./admin/listings/ListingModeration'));
const CropManager = lazy(() => import('./admin/listings/CropManager'));

// Orders & Tracking
const OrderMonitor = lazy(() => import('./admin/orders/OrderMonitor'));
const DeliveryTracking = lazy(() => import('./admin/tracking/DeliveryTracking'));

// Monitoring & Safety
const ChatMonitor = lazy(() => import('./admin/monitoring/ChatMonitor'));
const AuditLogs = lazy(() => import('./admin/monitoring/AuditLogs'));

// Finance & Analytics
const EarningsManager = lazy(() => import('./admin/finance/EarningsManager'));
const PriceManager = lazy(() => import('./admin/finance/PriceManager'));
const AnalyticsView = lazy(() => import('./admin/analytics/AnalyticsView'));

// Settings
const SettingsView = lazy(() => import('./admin/settings/SettingsView'));

const LoadingFallback = () => (
    <div className="w-full h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">Initializing Module...</p>
    </div>
);

const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        try {
            socketService.connect();
            console.log("Admin Dashboard WebSocket Connected");
        } catch (err) {
            console.error("Socket connection failed:", err);
        }
        return () => {
            socketService.disconnect();
        };
    }, []);

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-8">
                        <StatsOverview />
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                            <div className="lg:col-span-2">
                                <AnalyticsView />
                            </div>
                            <div className="lg:col-span-1">
                                <ActivityFeed />
                            </div>
                        </div>
                    </div>
                );
            case 'farmers':
                return <UserManagement initialRole="FARMER" />;
            case 'buyers':
                return <UserManagement initialRole="BUYER" />;
            case 'transporters':
                return <UserManagement initialRole="TRANSPORTER" />;
            case 'listings':
                return <ListingModeration />;
            case 'crops':
                return <CropManager />;
            case 'orders':
                return <OrderMonitor />;
            case 'tracking':
                return <DeliveryTracking />;
            case 'chats':
                return <ChatMonitor />;
            case 'audit':
                return <AuditLogs />;
            case 'finance':
                return <EarningsManager />;
            case 'prices':
                return <PriceManager />;
            case 'analytics':
                return <AnalyticsView />;
            case 'settings':
                return <SettingsView />;
            default:
                return (
                    <div className="py-20 text-center">
                        <h2 className="text-xl font-bold text-gray-400 italic">This module is yet to be implemented.</h2>
                    </div>
                );
        }
    };

    return (
        <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
            <Suspense fallback={<LoadingFallback />}>
                {renderContent()}
            </Suspense>
        </AdminLayout>
    );
};

export default AdminDashboard;
