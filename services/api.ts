const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl.replace(/\/+$/, '')}/api`;

import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';

const fetchWithRetry = async (url: string, options: RequestInit = {}, retryCount = 0): Promise<any> => {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (response.status === 401 && retryCount < 1) {
        console.log('[API] 401 detected. Attempting silent token refresh...');
        const currentUser = auth.currentUser;
        if (currentUser) {
            try {
                const newToken = await currentUser.getIdToken(true);
                localStorage.setItem('token', newToken);
                console.log('[API] Token refreshed. Retrying request...');
                return fetchWithRetry(url, options, retryCount + 1);
            } catch (refreshError: any) {
                console.error('[API] Token refresh failed:', refreshError);
                // Handle specific Firebase errors or general 400 Bad Requests
                if (refreshError?.code === 'auth/quota-exceeded' || 
                    refreshError?.message?.includes('400') ||
                    refreshError?.code === 'auth/user-token-expired') {
                    console.warn('[API] Critical auth error. Forcing re-authentication...');
                }
            }
        }
        
        // If no user, refresh failed, or quota exceeded, clear and redirect
        console.warn('[API] Session invalid or irrecoverable. Redirecting to login.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        try {
            await signOut(auth);
        } catch (e) {
            console.error('[API] Firebase signOut failed:', e);
        }
        
        // Only redirect if we are not already on the login/landing page to avoid loops
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
            window.location.href = '/login?expired=true';
        }
        
        const error: any = new Error('Session expired. Please login again.');
        error.status = 401;
        throw error;
    }

    if (!response.ok) {
        let body;
        try {
            body = await response.json();
        } catch {
            body = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        const err: any = new Error(body?.error || `HTTP ${response.status}`);
        err.status = response.status;
        err.body = body;
        throw err;
    }

    return response.json();
};

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    return fetchWithRetry(url, options);
};

// Listing APIs
// Listing APIs
export const listingAPI = {
    getAll: (params?: {
        cropId?: string;
        location?: string;
        minPrice?: string;
        maxPrice?: string;
        grade?: string;
        status?: string;
        search?: string;
        state?: string;
        radius?: string;
        latitude?: string;
        longitude?: string;
    }) => {
        const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
        return fetchWithAuth(`${API_URL}/listings${query}`);
    },

    search: (q: string) => {
        return fetchWithAuth(`${API_URL}/listings/search?q=${encodeURIComponent(q)}`);
    },

    getById: (id: string) => {
        return fetchWithAuth(`${API_URL}/listings/${id}`);
    },

    create: (data: any) => {
        return fetchWithAuth(`${API_URL}/listings`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    update: (id: string, data: any) => {
        return fetchWithAuth(`${API_URL}/listings/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    delete: (id: string) => {
        return fetchWithAuth(`${API_URL}/listings/${id}`, {
            method: 'DELETE',
        });
    },

    getMyListings: () => {
        return fetchWithAuth(`${API_URL}/listings/my/listings`);
    },

    getCrops: () => {
        return fetchWithAuth(`${API_URL}/listings/crops`);
    },
};

export const aiAPI = {
    verifyHarvest: (data: { cropName: string; selectedHarvestType: string; images: string[] }) => {
        return fetchWithAuth(`${API_URL}/ai/verify-harvest`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    getMarketPrice: (crop: string, location: string) => {
        const query = '?' + new URLSearchParams({ crop, location }).toString();
        return fetchWithAuth(`${API_URL}/ai/market-price${query}`);
    },

    getRecommendations: (location: string) => {
        const query = '?' + new URLSearchParams({ location }).toString();
        return fetchWithAuth(`${API_URL}/ai/recommendations${query}`);
    },

    getQualityGrade: (images: string[]) => {
        return fetchWithAuth(`${API_URL}/ai/quality-grade`, {
            method: 'POST',
            body: JSON.stringify({ images }),
        });
    },

    verifyCrop: (data: { expectedCropName: string; images: string[] }) => {
        return fetchWithAuth(`${API_URL}/ai/verify-crop`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    visionDetect: (data: { images: string[]; expectedCropName?: string }) => {
        return fetchWithAuth(`${API_URL}/ai/vision-detect`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    gradeSummary: (data: { rawDescription: string }) => {
        return fetchWithAuth(`${API_URL}/ai/grade-summary`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
};

// Cart APIs
export const cartAPI = {
    get: () => {
        return fetchWithAuth(`${API_URL}/cart`);
    },

    add: (listingId: string, quantity: number, negotiationId?: string) => {
        return fetchWithAuth(`${API_URL}/cart/add`, {
            method: 'POST',
            body: JSON.stringify({ listingId, quantity, negotiationId }),
        });
    },

    update: (itemId: string, quantity: number) => {
        return fetchWithAuth(`${API_URL}/cart/update/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify({ quantity }),
        });
    },

    remove: (itemId: string) => {
        return fetchWithAuth(`${API_URL}/cart/remove/${itemId}`, {
            method: 'DELETE',
        });
    },

    checkout: (deliveryResponsibility: 'FARMER_ARRANGED' | 'BUYER_ARRANGED', locationData?: {
        deliveryLatitude: number | null;
        deliveryLongitude: number | null;
        deliveryAddress: string;
        distanceKm: number | null;
        estimatedDuration: number | null;
        deliveryMode?: 'SELF_PICKUP' | 'ARRANGE_DELIVERY' | null;
        paymentMethod?: string;
        platformFee?: number;
        farmerAmount?: number;
        transporterAmount?: number;
    }) => {
        return fetchWithAuth(`${API_URL}/cart/checkout`, {
            method: 'POST',
            body: JSON.stringify({ deliveryResponsibility, ...locationData }),
        });
    },
};

// Order APIs
export const orderAPI = {
    getAll: () => {
        return fetchWithAuth(`${API_URL}/orders`);
    },

    getById: (id: string) => {
        return fetchWithAuth(`${API_URL}/orders/${id}`);
    },

    create: (data: any) => {
        return fetchWithAuth(`${API_URL}/orders/create`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    setDeliveryOption: (id: string, deliveryResponsibility: string, deliveryMode?: string) => {
        return fetchWithAuth(`${API_URL}/orders/${id}/delivery-option`, {
            method: 'PUT',
            body: JSON.stringify({ deliveryResponsibility, ...(deliveryMode && { deliveryMode }) }),
        });
    },

    getSelfPickupDetails: (id: string) => {
        return fetchWithAuth(`${API_URL}/orders/${id}/self-pickup-details`);
    },

    verifySelfPickupStep: (id: string, otp: string, step: 'VERIFY_FARMER' | 'VERIFY_BUYER') => {
        return fetchWithAuth(`${API_URL}/orders/${id}/verify-self-pickup`, {
            method: 'POST',
            body: JSON.stringify({ otp, step }),
        });
    },

    cancel: (id: string) => {
        return fetchWithAuth(`${API_URL}/orders/${id}/cancel`, {
            method: 'PUT',
        });
    },
};

// Delivery Deal APIs
export const deliveryDealAPI = {
    create: (data: any) => {
        return fetchWithAuth(`${API_URL}/delivery-deals/create`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    getAvailable: (lat?: number, lng?: number) => {
        const query = (lat !== undefined && lng !== undefined) ? `?latitude=${lat}&longitude=${lng}` : '';
        return fetchWithAuth(`${API_URL}/delivery-deals/available${query}`);
    },

    accept: (id: string) => {
        return fetchWithAuth(`${API_URL}/delivery-deals/${id}/accept`, {
            method: 'POST',
        });
    },

    decline: (id: string) => {
        return fetchWithAuth(`${API_URL}/delivery-deals/${id}/decline`, {
            method: 'POST',
        });
    },

    uploadProofPhoto: (id: string, imageData: string) => {
        return fetchWithAuth(`${API_URL}/delivery-deals/${id}/proof-photo`, {
            method: 'POST',
            body: JSON.stringify({ imageData }),
        });
    },

    verifyOtp: (id: string, otp: string) => {
        return fetchWithAuth(`${API_URL}/delivery-deals/${id}/verify-otp`, {
            method: 'POST',
            body: JSON.stringify({ otp }),
        });
    },

    updateStatus: (id: string, status: string) => {
        return fetchWithAuth(`${API_URL}/delivery-deals/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
        });
    },

    pay: (id: string) => {
        return fetchWithAuth(`${API_URL}/delivery-deals/${id}/pay`, {
            method: 'POST',
        });
    },

    getTracking: (id: string) => {
        return fetchWithAuth(`${API_URL}/delivery-deals/${id}/tracking`);
    },

    getRoute: (pickup: { lat: number; lng: number }, drop: { lat: number; lng: number }) => {
        // Use OSRM public API for real route data
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?overview=full&geometries=geojson`;
        return fetch(osrmUrl).then(response => response.json());
    },

    getDistanceAndETA: (pickup: { lat: number; lng: number }, drop: { lat: number; lng: number }) => {
        // Use OSRM API to get distance and duration
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?overview=false`;
        return fetch(osrmUrl).then(response => response.json());
    },

    getMy: () => {
        return fetchWithAuth(`${API_URL}/delivery-deals/my`);
    },
};

// Negotiation APIs
export const negotiationAPI = {
    start: (data: { listingId: string; quantity: number; initialOffer: number }) =>
        fetchWithAuth(`${API_URL}/negotiations/start`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    getMy: () => fetchWithAuth(`${API_URL}/negotiations/my`),
    getById: (chatId: string) => fetchWithAuth(`${API_URL}/negotiations/${chatId}`),
    getMessages: (chatId: string) => fetchWithAuth(`${API_URL}/negotiations/${chatId}/messages`),
    sendMessage: (chatId: string, text: string) => fetchWithAuth(`${API_URL}/negotiations/${chatId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text }),
    }),
    counter: (chatId: string, amount: number) => fetchWithAuth(`${API_URL}/negotiations/${chatId}/counter`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
    }),
    accept: (chatId: string) => fetchWithAuth(`${API_URL}/negotiations/${chatId}/accept`, { method: 'POST' }),
    reject: (chatId: string) => fetchWithAuth(`${API_URL}/negotiations/${chatId}/reject`, { method: 'POST' }),
};


// Auth APIs
export const authAPI = {
    login: (phone: string, password: string) => {
        return fetchWithAuth(`${API_URL}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ phone, password }),
        });
    },

    register: (data: any) => {
        return fetchWithAuth(`${API_URL}/auth/register`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    updateProfile: (profileData: any) => {
        return fetchWithAuth(`${API_URL}/auth/profile`, {
            method: 'PUT',
            body: JSON.stringify(profileData),
        });
    },
};

// Earning APIs
export const earningAPI = {
    getSummary: () => {
        return fetchWithAuth(`${API_URL}/earnings/summary`);
    },
    getHistory: () => {
        return fetchWithAuth(`${API_URL}/earnings`);
    },
};

// Market Price APIs
export const marketPriceAPI = {
    getDailyPrices: (location?: string) => {
        const query = location ? `?location=${encodeURIComponent(location)}` : '';
        return fetchWithAuth(`${API_URL}/market-prices/daily${query}`);
    },

    getCropPrice: (cropId: string, location?: string) => {
        const query = location ? `?location=${encodeURIComponent(location)}` : '';
        return fetchWithAuth(`${API_URL}/market-prices/crop/${cropId}${query}`);
    },

    getHistory: (cropId: string, days: number = 30) => {
        return fetchWithAuth(`${API_URL}/market-prices/history/${cropId}?days=${days}`);
    },

    refresh: () => {
        return fetchWithAuth(`${API_URL}/market-prices/refresh`, {
            method: 'POST'
        });
    },

    getPriceSuggestion: (cropId: string, grade: string, quantity: number) => {
        const query = new URLSearchParams({
            cropId,
            grade,
            quantity: quantity.toString()
        }).toString();
        return fetchWithAuth(`${API_URL}/market-prices/suggestion?${query}`);
    },
};

// Weather APIs
export const weatherAPI = {
    getForecast: async (lat: number, lng: number) => {
        try {
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset&timezone=auto`
            );
            return await response.json();
        } catch (error) {
            console.error("Weather fetch error:", error);
            return null;
        }
    }
};

// Location APIs
export const locationAPI = {
    calculateDistance: (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) => {
        return fetchWithAuth(`${API_URL}/location/calculate-distance`, {
            method: 'POST',
            body: JSON.stringify({ origin, destination })
        });
    },

    updateProfile: (location: { latitude?: number; longitude?: number; locationSource?: string; address?: string }) => {
        return fetchWithAuth(`${API_URL}/location/update-profile`, {
            method: 'PUT',
            body: JSON.stringify(location)
        });
    },

    updateFarmerProfile: (location: { latitude?: number; longitude?: number; locationSource?: string; address?: string }) => {
        return fetchWithAuth(`${API_URL}/location/update-farmer-profile`, {
            method: 'PUT',
            body: JSON.stringify(location)
        });
    },

    validateCoordinates: (latitude: number, longitude: number) => {
        return fetchWithAuth(`${API_URL}/location/validate`, {
            method: 'POST',
            body: JSON.stringify({ latitude, longitude })
        });
    },

    geocode: (query: string, limit: number = 1) => {
        return fetch(`${API_URL}/location/geocode?q=${encodeURIComponent(query)}&limit=${limit}`, {
            headers: { 'Content-Type': 'application/json' }
        }).then(res => res.json());
    },

    reverseGeocode: (lat: number, lon: number) => {
        return fetch(`${API_URL}/location/reverse-geocode?lat=${lat}&lon=${lon}`, {
            headers: { 'Content-Type': 'application/json' }
        }).then(res => res.json());
    }
};

export const walletAPI = {
    get: () => fetchWithAuth(`${API_URL}/wallet/my`),
    addFunds: (amount: number) => fetchWithAuth(`${API_URL}/wallet/add-funds`, {
        method: 'POST',
        body: JSON.stringify({ amount })
    }),
};

export const notificationAPI = {
    getUserNotifications: (userId: string) => fetchWithAuth(`${API_URL}/notifications/user/${userId}`),
    markAsRead: (id: string) => fetchWithAuth(`${API_URL}/notifications/${id}/read`, { method: 'PUT' }),
};


export default {

    listing: listingAPI,
    cart: cartAPI,
    order: orderAPI,
    deliveryDeal: deliveryDealAPI,
    auth: authAPI,
    earning: earningAPI,

    marketPrice: marketPriceAPI,
    location: locationAPI,
    wishlist: {
        getAll: () => fetchWithAuth(`${API_URL}/wishlist`),
        add: (listingId: string) => fetchWithAuth(`${API_URL}/wishlist/add`, {
            method: 'POST',
            body: JSON.stringify({ listingId })
        }),
        remove: (listingId: string) => fetchWithAuth(`${API_URL}/wishlist/remove/${listingId}`, {
            method: 'DELETE'
        }),
    },
    negotiation: negotiationAPI,
    notification: {
        getUserNotifications: (userId: string) => fetchWithAuth(`${API_URL}/notifications/user/${userId}`),
        markAsRead: (id: string) => fetchWithAuth(`${API_URL}/notifications/${id}/read`, { method: 'PUT' }),
    },
    wallet: walletAPI,
};
