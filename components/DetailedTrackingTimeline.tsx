import React from 'react';

interface TimelineEvent {
    status: string;
    label: string;
    description: string;
    timestamp?: string;
    location?: string;
    isCompleted: boolean;
    isActive: boolean;
}

interface DetailedTrackingTimelineProps {
    delivery: any;
    driverLocation?: { lat: number; lng: number } | null;
    pickupLocation?: { lat: number; lng: number; address: string } | null;
    dropLocation?: { lat: number; lng: number; address: string } | null;
}

const DetailedTrackingTimeline: React.FC<DetailedTrackingTimelineProps> = ({
    delivery,
    driverLocation,
    pickupLocation,
    dropLocation
}) => {
    const getStatusOrder = (status: string): number => {
        const order: Record<string, number> = {
            'WAITING_FOR_TRANSPORTER': 0,
            'TRANSPORTER_ASSIGNED': 1,
            'PICKED_UP': 2,
            'IN_TRANSIT': 3,
            'OUT_FOR_DELIVERY': 4,
            'DELIVERED': 5,
            'COMPLETED': 6
        };
        return order[status?.toUpperCase()] ?? 0;
    };

    const currentStatus = delivery?.status || 'WAITING_FOR_TRANSPORTER';
    const currentStatusIndex = getStatusOrder(currentStatus);

    const events: TimelineEvent[] = [
        {
            status: 'WAITING_FOR_TRANSPORTER',
            label: 'Order Confirmed',
            description: 'Your order has been placed and we are arranging delivery',
            timestamp: delivery?.order?.createdAt ? new Date(delivery.order.createdAt).toLocaleString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }) : undefined,
            isCompleted: currentStatusIndex >= 0,
            isActive: currentStatusIndex === 0
        },
        {
            status: 'TRANSPORTER_ASSIGNED',
            label: 'Driver Found',
            description: `Transporter ${delivery?.transporter?.transporterProfile?.fullName || delivery?.transporter?.name || 'assigned'} has accepted your delivery`,
            timestamp: delivery?.updatedAt && currentStatusIndex >= 1 ? new Date(delivery.updatedAt).toLocaleString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }) : undefined,
            isCompleted: currentStatusIndex >= 1,
            isActive: currentStatusIndex === 1
        },
        {
            status: 'PICKED_UP',
            label: 'Picked Up',
            description: 'The driver has picked up your order from the farmer',
            location: pickupLocation?.address || 'Farm location',
            timestamp: delivery?.updatedAt && currentStatusIndex >= 2 ? new Date(delivery.updatedAt).toLocaleString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }) : undefined,
            isCompleted: currentStatusIndex >= 2,
            isActive: currentStatusIndex === 2
        },
        {
            status: 'IN_TRANSIT',
            label: 'In Transit',
            description: 'Your item is being transported to your location',
            location: driverLocation ? 'Moving - Live path active' : 'On the way',
            timestamp: delivery?.updatedAt && currentStatusIndex >= 3 ? new Date(delivery.updatedAt).toLocaleString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }) : undefined,
            isCompleted: currentStatusIndex >= 3,
            isActive: currentStatusIndex === 3
        },
        {
            status: 'OUT_FOR_DELIVERY',
            label: 'Out for Delivery',
            description: 'Your item is out for final delivery - arriving very soon!',
            location: driverLocation ? 'Nearby transporter - live location' : dropLocation?.address,
            timestamp: delivery?.updatedAt && currentStatusIndex >= 4 ? new Date(delivery.updatedAt).toLocaleString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }) : undefined,
            isCompleted: currentStatusIndex >= 4,
            isActive: currentStatusIndex === 4
        },
        {
            status: 'DELIVERED',
            label: 'Delivered',
            description: 'Your order has been delivered successfully',
            location: dropLocation?.address,
            timestamp: delivery?.updatedAt && (currentStatusIndex >= 5) ? new Date(delivery.updatedAt).toLocaleString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }) : undefined,
            isCompleted: currentStatusIndex >= 5,
            isActive: currentStatusIndex === 5 || currentStatusIndex === 6
        }
    ];

    return (
        <div className="h-full overflow-y-auto bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-black text-gray-900 mb-6 uppercase tracking-wide">Tracking Details</h3>

            <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                {/* Progress line */}
                {currentStatusIndex > 0 && (
                    <div
                        className="absolute left-4 top-0 w-0.5 bg-green-500 transition-all duration-500 max-h-full"
                        style={{
                            height: `${(currentStatusIndex / (events.length - 1)) * 100}%`
                        }}
                    ></div>
                )}

                <div className="space-y-6">
                    {events.map((event, index) => {
                        const isPast = index < currentStatusIndex;
                        const isCurrent = index === currentStatusIndex;
                        const isFuture = index > currentStatusIndex;

                        return (
                            <div key={index} className="relative flex gap-4">
                                {/* Circle indicator */}
                                <div className={`
                                    relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                                    ${isPast ? 'bg-green-500 text-white' : ''}
                                    ${isCurrent ? 'bg-green-600 text-white ring-4 ring-green-200 animate-pulse' : ''}
                                    ${isFuture ? 'bg-gray-200 text-gray-400' : ''}
                                `}>
                                    {isPast ? (
                                        <i className="fas fa-check text-xs"></i>
                                    ) : isCurrent ? (
                                        <i className="fas fa-circle text-xs"></i>
                                    ) : (
                                        <i className="fas fa-circle text-xs"></i>
                                    )}
                                </div>

                                {/* Content */}
                                <div className={`flex-1 pb-6 ${isFuture ? 'opacity-50' : ''}`}>
                                    <div className="flex items-start justify-between gap-4 mb-1">
                                        <h4 className={`text-sm font-black ${isCurrent ? 'text-green-700' : isPast ? 'text-gray-900' : 'text-gray-400'}`}>
                                            {event.label}
                                        </h4>
                                        {event.timestamp && (
                                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                                {event.timestamp}
                                            </span>
                                        )}
                                    </div>

                                    <p className={`text-xs mb-2 ${isCurrent ? 'text-green-600 font-semibold' : 'text-gray-600'}`}>
                                        {event.description}
                                    </p>

                                    {event.location && (
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <i className="fas fa-map-marker-alt"></i>
                                            <span className="line-clamp-2">{event.location}</span>
                                        </div>
                                    )}

                                    {isCurrent && currentStatus === 'IN_TRANSIT' && driverLocation && (
                                        <div className="mt-2 flex items-center gap-2 text-xs text-green-600 font-semibold">
                                            <i className="fas fa-satellite-dish animate-pulse"></i>
                                            <span>Live tracking active</span>
                                        </div>
                                    )}

                                    {/* Sub-events for IN_TRANSIT */}
                                    {(isCurrent && currentStatus === 'IN_TRANSIT') && (
                                        <div className="mt-3 space-y-2 pl-4 border-l-2 border-green-200">
                                            {pickupLocation && (
                                                <div className="text-xs text-gray-600">
                                                    <span className="font-semibold">Picked up from:</span> {pickupLocation.address}
                                                </div>
                                            )}
                                            {driverLocation && (
                                                <div className="text-xs text-green-600 font-semibold">
                                                    <i className="fas fa-truck mr-1"></i>
                                                    Transporter is en route
                                                </div>
                                            )}
                                            {dropLocation && (
                                                <div className="text-xs text-gray-600">
                                                    <span className="font-semibold">Delivering to:</span> {dropLocation.address}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {/* Sub-events for PICKED_UP (Out for Delivery) */}
                                    {(isCurrent && currentStatus === 'PICKED_UP') && (
                                        <div className="mt-3 space-y-2 pl-4 border-l-2 border-green-200">
                                            {pickupLocation && (
                                                <div className="text-xs text-gray-600">
                                                    <span className="font-semibold">Picked up from:</span> {pickupLocation.address}
                                                </div>
                                            )}
                                            {driverLocation && (
                                                <div className="text-xs text-green-600 font-semibold">
                                                    <i className="fas fa-truck mr-1"></i>
                                                    Transporter is en route
                                                </div>
                                            )}
                                            {dropLocation && (
                                                <div className="text-xs text-gray-600">
                                                    <span className="font-semibold">Delivering to:</span> {dropLocation.address}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Delivery Info Footer */}
            {delivery && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                            <p className="text-gray-500 mb-1">Distance</p>
                            <p className="font-black text-gray-900">
                                {typeof delivery.distance === 'number' ? `${delivery.distance.toFixed(1)} km` : '--'}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-500 mb-1">Delivery Cost</p>
                            <p className="font-black text-green-600">
                                ₹{typeof delivery.totalCost === 'number' ? delivery.totalCost.toLocaleString() : '--'}
                            </p>
                        </div>
                    </div>
                    {delivery.selectedVehicle && (
                        <div className="mt-4">
                            <p className="text-xs text-gray-500 mb-1">Vehicle</p>
                            <p className="text-xs font-semibold text-gray-900">{delivery.selectedVehicle}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DetailedTrackingTimeline;
