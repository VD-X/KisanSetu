import React, { useState } from 'react';

interface LocationPermissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAllowGPS: () => void;
    onManualEntry: () => void;
}

const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
    isOpen,
    onClose,
    onAllowGPS,
    onManualEntry
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#f8f9fa]/95 via-white/85 to-[#e9ecef]/95 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                            <i className="fas fa-location-dot text-2xl"></i>
                        </div>
                        <div>
                            <h2 className="text-xl font-black">Location Permission</h2>
                            <p className="text-xs text-green-50 font-medium">Help us calculate delivery distance</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Why we need your location</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            We use your location to calculate the accurate delivery distance from the farmer's location to your address. This helps us provide you with:
                        </p>
                    </div>

                    {/* Benefits */}
                    <div className="space-y-3 mb-6">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <i className="fas fa-check text-green-600 text-xs"></i>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Accurate delivery cost</p>
                                <p className="text-xs text-gray-500">Based on real road distance</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <i className="fas fa-check text-green-600 text-xs"></i>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Estimated delivery time</p>
                                <p className="text-xs text-gray-500">Know when to expect your order</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <i className="fas fa-check text-green-600 text-xs"></i>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Faster checkout</p>
                                <p className="text-xs text-gray-500">Auto-fill your delivery address</p>
                            </div>
                        </div>
                    </div>

                    {/* Privacy Notice */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6">
                        <div className="flex items-start gap-2">
                            <i className="fas fa-shield-halved text-blue-600 text-sm mt-0.5"></i>
                            <div>
                                <p className="text-xs font-semibold text-blue-900">Your privacy is protected</p>
                                <p className="text-xs text-blue-700 mt-1">
                                    Your exact GPS coordinates are never shared publicly. We only use them to calculate delivery distance.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        <button
                            onClick={onAllowGPS}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 px-4 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                            <i className="fas fa-location-crosshairs mr-2"></i>
                            Use My Current Location
                        </button>

                        <button
                            onClick={onManualEntry}
                            className="w-full bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-all duration-200"
                        >
                            <i className="fas fa-keyboard mr-2"></i>
                            Enter Address Manually
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full text-gray-500 text-sm font-medium py-2 hover:text-gray-700 transition-colors"
                        >
                            Maybe Later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LocationPermissionModal;
