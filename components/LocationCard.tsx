import React from 'react';

interface LocationCardProps {
    label: 'Pickup' | 'Drop-off';
    address: string;
    district: string;
    state: string;
    latitude?: number;
    longitude?: number;
    isLoading?: boolean;
    onEdit?: () => void;
}

interface Location {
    latitude: number | null;
    longitude: number | null;
    address: string;
    district: string;
    state: string;
}

const LocationCard: React.FC<LocationCardProps> = ({
    label,
    address,
    district,
    state,
    latitude,
    longitude,
    isLoading = false,
    onEdit,
}) => {
    const isPickup = label === 'Pickup';
    const gradient = isPickup
        ? 'from-emerald-400 to-green-500'
        : 'from-orange-400 to-red-500';
    const bgGradient = isPickup
        ? 'from-green-500/20 to-emerald-500/20'
        : 'from-orange-500/20 to-red-500/20';
    const borderColor = isPickup ? 'border-green-400/40' : 'border-orange-400/40';

    return (
        <div className="relative group">
            <div className={`absolute inset-0 bg-gradient-to-r ${gradient} rounded-3xl blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500`}></div>
            <div className={`relative backdrop-blur-2xl bg-gradient-to-br ${bgGradient} border ${borderColor} rounded-3xl p-6 hover:bg-white/15 transition-all duration-300 shadow-2xl`}>
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg`}>
                            {isPickup ? (
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-13h4v5h-4z" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                </svg>
                            )}
                        </div>

                        {/* Location Info */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-1">
                                {label} Location
                            </p>
                            <p className="text-lg font-black text-white line-clamp-2 break-words">
                                {address}
                            </p>
                            <p className="text-xs text-slate-400 mt-2">
                                {district}, {state}
                            </p>

                            {/* Coordinates */}
                            {latitude && longitude && (
                                <div className="mt-3 text-xs text-slate-400 flex items-center gap-2">
                                    <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                                    </svg>
                                    <span className="font-mono">{latitude.toFixed(4)}°, {longitude.toFixed(4)}°</span>
                                </div>
                            )}

                            {isLoading && (
                                <div className="mt-3 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                    <span className="text-xs text-blue-400 font-semibold">Fetching location...</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Edit Button */}
                    {onEdit && (
                        <button
                            onClick={onEdit}
                            className="ml-3 flex-shrink-0 p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white/60 hover:text-white transition-all duration-200"
                            title="Edit location"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" />
                                <path d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

interface LocationDisplayProps {
    pickupLocation: Location;
    dropLocation: Location;
    onEditPickup?: () => void;
    onEditDrop?: () => void;
    isLoadingPickup?: boolean;
    isLoadingDrop?: boolean;
}

export const LocationDisplay: React.FC<LocationDisplayProps> = ({
    pickupLocation,
    dropLocation,
    onEditPickup,
    onEditDrop,
    isLoadingPickup = false,
    isLoadingDrop = false,
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LocationCard
                label="Pickup"
                address={pickupLocation.address}
                district={pickupLocation.district}
                state={pickupLocation.state}
                latitude={pickupLocation.latitude || undefined}
                longitude={pickupLocation.longitude || undefined}
                onEdit={onEditPickup}
                isLoading={isLoadingPickup}
            />
            <LocationCard
                label="Drop-off"
                address={dropLocation.address}
                district={dropLocation.district}
                state={dropLocation.state}
                latitude={dropLocation.latitude || undefined}
                longitude={dropLocation.longitude || undefined}
                onEdit={onEditDrop}
                isLoading={isLoadingDrop}
            />
        </div>
    );
};

export default LocationCard;
