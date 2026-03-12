// services/adminService.ts
import { fetchWithAuth } from './api';

const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl.replace(/\/+$/, '')}/api`;

export const adminService = {
    getStats: () => {
        return fetchWithAuth(`${API_URL}/admin/stats`);
    },

    // User Management
    getUsers: (params: any) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithAuth(`${API_URL}/admin/users?${query}`);
    },
    updateUserStatus: (id: string, status: string) => {
        return fetchWithAuth(`${API_URL}/admin/users/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    },

    // Transporter Management
    getTransporters: (params: any) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithAuth(`${API_URL}/admin/transporters?${query}`);
    },
    verifyTransporter: (id: string, status: string) => {
        return fetchWithAuth(`${API_URL}/admin/transporters/${id}/verify`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    },

    // Crop Management
    getCrops: () => fetchWithAuth(`${API_URL}/admin/crops`),
    createCrop: (data: any) => fetchWithAuth(`${API_URL}/admin/crops`, { method: 'POST', body: JSON.stringify(data) }),
    updateCrop: (id: string, data: any) => fetchWithAuth(`${API_URL}/admin/crops/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    // Market Price Management
    getMarketPrices: (filters: any) => {
        const query = new URLSearchParams(filters).toString();
        return fetchWithAuth(`${API_URL}/admin/market-prices?${query}`);
    },
    createMarketPrice: (data: any) => fetchWithAuth(`${API_URL}/admin/market-prices`, { method: 'POST', body: JSON.stringify(data) }),
    updateMarketPrice: (id: string, data: any) => fetchWithAuth(`${API_URL}/admin/market-prices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    refreshPrices: () => fetchWithAuth(`${API_URL}/admin/market-prices/refresh`, { method: 'POST' }),

    // Listings Moderation
    getListings: (params: any) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithAuth(`${API_URL}/admin/listings?${query}`);
    },
    updateListingStatus: (id: string, status: string) => {
        return fetchWithAuth(`${API_URL}/admin/listings/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    },

    // Order & Delivery Management
    getOrders: (params: any) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithAuth(`${API_URL}/admin/orders?${query}`);
    },
    cancelOrder: (id: string, reason: string) => {
        return fetchWithAuth(`${API_URL}/admin/orders/${id}/cancel`, {
            method: 'PATCH',
            body: JSON.stringify({ reason })
        });
    },
    reassignTransporter: (orderId: string, transporterId: string | null) => {
        return fetchWithAuth(`${API_URL}/admin/orders/${orderId}/reassign`, {
            method: 'PATCH',
            body: JSON.stringify({ transporterId })
        });
    },

    // Earnings
    getEarnings: (filters: any) => {
        const query = new URLSearchParams(filters).toString();
        return fetchWithAuth(`${API_URL}/admin/earnings?${query}`);
    },

    // Analytics
    getAnalytics: () => fetchWithAuth(`${API_URL}/admin/analytics`),

    // Settings & Logs
    getSettings: () => fetchWithAuth(`${API_URL}/admin/settings`),
    updateSettings: (settings: any) => {
        return fetchWithAuth(`${API_URL}/admin/settings`, {
            method: 'POST',
            body: JSON.stringify(settings)
        });
    },
    getAuditLogs: (params: any = {}) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithAuth(`${API_URL}/admin/logs?${query}`);
    }
};
