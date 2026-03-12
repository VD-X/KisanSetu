import React from 'react';

interface DistanceDisplayProps {
    distanceKm: number | null;
    durationMinutes: number | null;
    isLoading?: boolean;
    error?: string | null;
    source?: 'ORS' | 'HAVERSINE' | null;
    onRecalculate?: () => void;
}

const DistanceDisplay: React.FC<DistanceDisplayProps> = ({
    distanceKm,
    durationMinutes,
    isLoading = false,
    error = null,
    source = null,
    onRecalculate
}) => {
    // Loading state
    if (isLoading) {
        return (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6">
                <div className="flex items-center justify-center gap-3">
                    <i className="fas fa-spinner fa-spin text-2xl text-green-600"></i>
                    <div>
                        <p className="font-bold text-gray-900">Calculating distance...</p>
                        <p className="text-xs text-gray-500 mt-1">This may take a few seconds</p>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                    <i className="fas fa-exclamation-triangle text-2xl text-red-600 mt-1"></i>
                    <div className="flex-1">
                        <p className="font-bold text-red-900">Failed to calculate distance</p>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                        {onRecalculate && (
                            <button
                                onClick={onRecalculate}
                                className="mt-3 text-sm font-bold text-red-600 hover:text-red-700 underline"
                            >
                                Try Again
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // No distance calculated yet
    if (distanceKm === null) {
        return (
            <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 text-gray-400">
                    <i className="fas fa-route text-2xl"></i>
                    <div>
                        <p className="font-bold">Distance not calculated</p>
                        <p className="text-xs mt-1">Enter delivery location to calculate</p>
                    </div>
                </div>
            </div>
        );
    }

    // Success state - show distance
    return (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Distance Icon */}
                    <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <i className="fas fa-route text-2xl text-white"></i>
                    </div>

                    {/* Distance Info */}
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Delivery Distance</p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-black text-gray-900">{distanceKm.toFixed(1)}</span>
                            <span className="text-lg font-bold text-gray-600">km</span>
                        </div>

                        {durationMinutes && (
                            <p className="text-sm text-gray-600 mt-1 flex items-center gap-1.5">
                                <i className="fas fa-clock text-green-600"></i>
                                <span>~{durationMinutes} mins estimated delivery</span>
                            </p>
                        )}
                    </div>
                </div>

                {/* Recalculate Button */}
                {onRecalculate && (
                    <button
                        onClick={onRecalculate}
                        className="px-4 py-2 bg-white border-2 border-green-300 text-green-700 font-bold rounded-xl hover:bg-green-50 transition-all duration-200 shadow-sm hover:shadow-md"
                        title="Recalculate distance"
                    >
                        <i className="fas fa-refresh"></i>
                    </button>
                )}
            </div>

            {/* Source Indicator */}
            {source && (
                <div className="mt-4 pt-4 border-t border-green-200">
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-gray-600">
                            <i className={`fas ${source === 'ORS' ? 'fa-map-location-dot' : 'fa-ruler'}`}></i>
                            <span>
                                {source === 'ORS'
                                    ? 'Calculated using real road distance'
                                    : 'Estimated distance (approximate)'}
                            </span>
                        </div>

                        {source === 'ORS' && (
                            <div className="flex items-center gap-1.5 text-green-600">
                                <i className="fas fa-check-circle"></i>
                                <span className="font-bold">Accurate</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DistanceDisplay;
