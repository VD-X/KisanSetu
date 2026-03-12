
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { UserRole, Language, User, Listing, Gender, ListingStatus } from '../types';
import { SUPPORTED_LANGUAGES, TRANSLATIONS, CROPS } from '../constants.tsx';
import Layout from '../components/Layout';
// Lazy load role-specific dashboards
const FarmerDashboard = React.lazy(() => import('../components/FarmerDashboard'));
const BuyerDashboard = React.lazy(() => import('../components/BuyerDashboard'));
const TransporterDashboard = React.lazy(() => import('../components/TransporterDashboard'));
const AdminDashboard = React.lazy(() => import('../components/AdminDashboard'));
const NegotiationListView = React.lazy(() => import('../components/NegotiationListView'));


import { geminiService } from '../services/geminiService';
import { orderAPI, earningAPI, deliveryDealAPI, authAPI, default as api } from '../services/api';
import { socketService } from '../services/socketService';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
    const { user, logout, login, token, refreshUser } = useAuth(); // Use AuthContext
    const { success, info, error: showError } = useToast();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('home');

    // ... (rest of the file until onUpdateProfile)

    const onUpdateProfile = async (updates: Partial<User>) => {
        try {
            const { user: updatedUser } = await authAPI.updateProfile(updates);
            if (updatedUser && token) {
                login(token, updatedUser);
                await refreshUser(); // Ensure global state is perfectly synced
                success("Profile updated successfully");
            }
        } catch (err: any) {
            console.error("Profile update failed", err);
            showError(err.message || "Failed to update profile");
        }
    };

    // State for real data
    const [acceptedDeals, setAcceptedDeals] = useState<any[]>([]);

    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [ratings, setRatings] = useState<Record<string, number[]>>({});
    const [initialCheckout, setInitialCheckout] = useState(false);

    // Initial check for pending tab from notifications
    useEffect(() => {
        const pending = localStorage.getItem('pending_tab');
        if (pending) {
            setActiveTab(pending);
            localStorage.removeItem('pending_tab');
        }
    }, [user?.role]);

    // Financial State
    const [farmerEarnings, setFarmerEarnings] = useState({ total: 0, pending: 0 });
    const [transporterEarnings, setTransporterEarnings] = useState({ total: 0, pending: 0, today: 0, week: 0, month: 0 });
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

    // Track live location for transporters to fetch near deals
    useEffect(() => {
        if (user?.role !== 'TRANSPORTER' || !navigator.geolocation) return;

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setCurrentLocation(newLoc);
                console.log("[Dashboard] Live location updated:", newLoc);
            },
            (err) => console.error("[Dashboard] Geolocation error:", err),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [user?.role]);




    const handleNegotiationCheckout = async (data: { listingId: string, quantity: number, price: number, negotiationId: string }) => {
        try {
            const { cartAPI } = await import('../services/api');
            await cartAPI.add(data.listingId, data.quantity, data.negotiationId);
            setInitialCheckout(true);
            setActiveTab('cart');
            success("Negotiated item added to cart!");
        } catch (err: any) {
            console.error('Failed to add to cart', err);
        }
    };

    // Unified Fetch Data Function
    const fetchDashboardData = async () => {
        if (!user) return;

        try {
            if (user.role === 'FARMER') {
                // Fetch Farmer Orders/Earnings
                const ordersRes = await orderAPI.getAll();
                const orders = ordersRes.orders || [];

                // Realized Earnings (Completed Orders)
                // @ts-ignore
                const completedOrders = orders.filter((o: any) => o.orderStatus === 'COMPLETED');
                const total = completedOrders.reduce((sum: number, o: any) => sum + (o.priceFinal * o.quantity), 0);

                // Pending Earnings (Active Orders)
                // @ts-ignore
                const pendingOrders = orders.filter((o: any) => ['ORDER_CREATED', 'DELIVERY_PENDING', 'IN_DELIVERY', 'PICKED_UP'].includes(o.orderStatus));
                const pending = pendingOrders.reduce((sum: number, o: any) => sum + (o.priceFinal * o.quantity), 0);

                setFarmerEarnings({ total, pending });

                // Populate History
                const history = completedOrders.map((o: any) => ({
                    id: o.id,
                    crop: o.listing?.crop?.name || 'Crop',
                    buyer: o.buyer?.name || 'Buyer',
                    qty: o.quantity,
                    price: o.priceFinal,
                    date: new Date(o.updatedAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
                    timestamp: o.updatedAt,
                }));
                setAcceptedDeals(history);


            } else if (user.role === 'TRANSPORTER') {
                // Fetch Transporter Earnings
                const earningsRes = await earningAPI.getSummary();
                setTransporterEarnings({
                    total: earningsRes.total || 0,
                    // @ts-ignore
                    pending: 0, // Pending logic not in summary yet, assuming 0 or explicit field if added
                    today: earningsRes.today || 0,
                    week: earningsRes.week || 0,
                    month: earningsRes.month || 0
                });

                // Fetch Available/My Deliveries with live location if available
                // We need BOTH available deals (nearby) AND my assigned/completed deals
                const [availableRes, myDealsRes] = await Promise.all([
                    deliveryDealAPI.getAvailable(currentLocation?.lat, currentLocation?.lng),
                    deliveryDealAPI.getMy()
                ]);

                const availableDeals = availableRes.deals || [];
                const myDeals = myDealsRes.deliveries || [];

                // Combine and remove duplicates based on ID
                const allDeals = [...availableDeals];
                myDeals.forEach((md: any) => {
                    if (!allDeals.find(ad => ad.id === md.id)) {
                        allDeals.push(md);
                    }
                });

                setDeliveries(allDeals);
            } else if (user.role === 'BUYER') {


                const ordersRes = await orderAPI.getAll();
                // @ts-ignore
                const activeDeliveries = ordersRes.orders.filter(o => o.delivery).map(o => o.delivery);
                setDeliveries(activeDeliveries);
            }
        } catch (error) {
            // console.error("Failed to fetch dashboard data:", error);
        }
    };

    // Fetch Initial Data based on Role
    useEffect(() => {
        if (!user) return;

        fetchDashboardData();

        // Connect Socket
        socketService.connect();

        // Socket Listeners for Real-time Updates
        const cleanups: (() => void)[] = [];



        if (user.role === 'TRANSPORTER') {
            cleanups.push(socketService.onDeliveryCreated(() => fetchDashboardData()));
            cleanups.push(socketService.onDeliveryAccepted(() => fetchDashboardData()));
            cleanups.push(socketService.onDeliveryTaken(() => fetchDashboardData())); // Refresh when another transporter takes a deal
            cleanups.push(socketService.onDeliveryOtpVerified(() => fetchDashboardData()));
            cleanups.push(socketService.onDeliveryStatusUpdate(() => fetchDashboardData()));
        }

        // Global Negotiation Listeners (For both Farmer and Buyer)


        // Farmer specific listeners
        if (user.role === 'FARMER') {

        }

        // Set up interval for polling updates (backup)
        const interval = setInterval(fetchDashboardData, 10000);

        return () => {
            clearInterval(interval);
            cleanups.forEach(cleanup => cleanup());
            socketService.disconnect();
        };

    }, [user, user?.role]);


    if (!user) return null; // Should be handled by ProtectedRoute





    // Client-side handlers (Optimistic updates or re-fetch triggers)
    const handleDealFinalized = async (deal: any) => {
        // Refresh data instead of manual state manipulation to ensure consistency
        // But for UX, we can optimistically update activeNegotiations
        // setActiveNegotiations(prev => prev.filter(n => n.id !== deal.id));
        geminiService.speak(`Deal confirmed for ${deal.cropName}. Delivery job posted for transporters.`);
        // Re-fetch will happen on interval or could trigger here
        fetchDashboardData();
    };

    const handleDeliveryUpdate = async (id: string, status: string, transporterId?: string) => {
        // Optimistic update for UI responsiveness
        setDeliveries(prev => prev.map(d => {
            if (d.id === id) {
                if (status === 'ACCEPTED' && transporterId) {
                    // In real app this comes from API
                    return { ...d, status: 'PENDING', transporterId };
                }
                return { ...d, status };
            }
            return d;
        }));

        if (status === 'DELIVERED') {
            geminiService.speak("Delivery confirmed. Payment released.");
        }

        // Refresh data to ensure sync
        await fetchDashboardData();
    };

    const handleRateTransporter = (deliveryId: string, rating: number) => {
        // Call API here
        console.log('Rating transporter:', deliveryId, rating);
    };

    // @ts-ignore
    const userRole: UserRole = user.role;

    // Admin has its own complete layout, doesn't need Layout wrapper
    if (userRole === 'ADMIN') {
        return (
            <React.Suspense fallback={<div className="h-screen flex items-center justify-center">Loading Admin Panel...</div>}>
                <AdminDashboard />
            </React.Suspense>
        );
    }

    return (
        <Layout
            userRole={userRole}
            userName={user.name || user.email}
            userPhoto={user.profilePhoto}
            // @ts-ignore
            userLocation={user.location ? `${user.location.district}, ${user.location.state}` : ''}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onLogout={logout}
        >

            {userRole === 'FARMER' && activeTab !== 'chats' && (
                <React.Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Dashboard...</div>}>
                    <FarmerDashboard
                        activeTab={activeTab}
                        acceptedDeals={acceptedDeals}
                        onAddDelivery={(d) => setDeliveries([...deliveries, d])}
                        onDealHandled={() => { }} // Placeholder
                        user={user as unknown as User}
                        onUpdateProfile={onUpdateProfile}
                        earnings={farmerEarnings} // Pass centralized earnings
                    />
                </React.Suspense>
            )}

            {userRole === 'BUYER' && activeTab !== 'chats' && (
                <React.Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Dashboard...</div>}>
                    <BuyerDashboard
                        activeTab={activeTab}
                        onNavigate={(tab) => setActiveTab(tab)}
                        onRateTransporter={handleRateTransporter}
                        user={user as unknown as User}
                        onUpdateProfile={onUpdateProfile}
                        deliveries={deliveries}
                        initialCheckout={initialCheckout}
                        onResetAutoCheckout={() => setInitialCheckout(false)}
                    />
                </React.Suspense>
            )}

            {userRole === 'TRANSPORTER' && (
                <React.Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Dashboard...</div>}>
                    <TransporterDashboard
                        activeTab={activeTab}
                        deliveries={deliveries}
                        onUpdateStatus={handleDeliveryUpdate}
                        user={user as unknown as User}
                        onUpdateProfile={onUpdateProfile}
                        averageRating={0}
                        totalReviews={0}
                        earnings={transporterEarnings} // Pass consolidated earnings
                        onRefresh={fetchDashboardData}
                    />
                </React.Suspense>
            )}

            {/* Negotiation Chats View (for Farmer & Buyer) */}
            {(userRole === 'FARMER' || userRole === 'BUYER') && activeTab === 'chats' && (
                <React.Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Chats...</div>}>
                    <NegotiationListView
                        userId={user.id}
                        userRole={userRole as 'FARMER' | 'BUYER'}
                        onProceedToCheckout={handleNegotiationCheckout}
                    />
                </React.Suspense>
            )}

        </Layout>
    );
};

export default Dashboard;
