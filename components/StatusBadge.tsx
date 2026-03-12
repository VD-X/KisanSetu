import React from 'react';
import { DeliveryStatus, OrderStatus, ListingStatus } from '../types';

interface StatusBadgeProps {
    status: DeliveryStatus | OrderStatus | ListingStatus | string;
    type?: 'delivery' | 'order' | 'listing';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'delivery' }) => {
    const getStatusConfig = () => {
        const normalizedStatus = (() => {
            if (type === 'listing') {
                return status === 'SOLD' ? 'SOLD' : 'AVAILABLE';
            }
            return status;
        })();

        const configs: Record<string, { color: string; bg: string; icon: string; label: string }> = {
            // Delivery statuses
            'WAITING_FOR_TRANSPORTER': {
                color: 'text-yellow-700',
                bg: 'bg-yellow-100',
                icon: '🔍',
                label: 'Finding Transporter'
            },
            'TRANSPORTER_ASSIGNED': {
                color: 'text-blue-700',
                bg: 'bg-blue-100',
                icon: '✅',
                label: 'Transporter Assigned'
            },
            'PICKED_UP': {
                color: 'text-purple-700',
                bg: 'bg-purple-100',
                icon: '📦',
                label: 'Picked Up'
            },
            'IN_TRANSIT': {
                color: 'text-indigo-700',
                bg: 'bg-indigo-100',
                icon: '🚚',
                label: 'In Transit'
            },
            'DELIVERED': {
                color: 'text-green-700',
                bg: 'bg-green-100',
                icon: '📍',
                label: 'Delivered'
            },
            'COMPLETED': {
                color: 'text-green-700',
                bg: 'bg-green-100',
                icon: '🎉',
                label: 'Completed'
            },

            // Order statuses
            'ORDER_CREATED': {
                color: 'text-blue-700',
                bg: 'bg-blue-100',
                icon: '📝',
                label: 'Order Created'
            },
            'DELIVERY_PENDING': {
                color: 'text-yellow-700',
                bg: 'bg-yellow-100',
                icon: '⏳',
                label: 'Delivery Pending'
            },
            'IN_DELIVERY': {
                color: 'text-indigo-700',
                bg: 'bg-indigo-100',
                icon: '🚚',
                label: 'In Delivery'
            },
            'CANCELLED': {
                color: 'text-red-700',
                bg: 'bg-red-100',
                icon: '❌',
                label: 'Cancelled'
            },

            // Listing statuses
            'AVAILABLE': {
                color: 'text-green-700',
                bg: 'bg-green-100',
                icon: '✅',
                label: 'Available'
            },
            'PRICE_AGREED': {
                color: 'text-blue-700',
                bg: 'bg-blue-100',
                icon: '🤝',
                label: 'Price Agreed'
            },
            'LOCKED': {
                color: 'text-yellow-700',
                bg: 'bg-yellow-100',
                icon: '🔒',
                label: 'Locked'
            },
            'SOLD': {
                color: 'text-gray-700',
                bg: 'bg-gray-100',
                icon: '✔️',
                label: 'Sold Out'
            },

            // Negotiation statuses
            'OPEN': {
                color: 'text-blue-700',
                bg: 'bg-blue-100',
                icon: '💬',
                label: 'Open'
            },
            'ACCEPTED': {
                color: 'text-green-700',
                bg: 'bg-green-100',
                icon: '✅',
                label: 'Accepted'
            },
            'REJECTED': {
                color: 'text-red-700',
                bg: 'bg-red-100',
                icon: '❌',
                label: 'Rejected'
            }
        };

        return configs[normalizedStatus] || {
            color: 'text-gray-700',
            bg: 'bg-gray-100',
            icon: '•',
            label: String(normalizedStatus)
        };
    };

    const config = getStatusConfig();

    return (
        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${config.bg} ${config.color}`}>
            <span>{config.icon}</span>
            <span>{config.label}</span>
        </span>
    );
};

export default StatusBadge;
