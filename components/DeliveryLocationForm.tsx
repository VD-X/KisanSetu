import React, { useState, useEffect } from 'react';
import { formatSmartAddress } from '../utils/locationUtils';
import { locationAPI } from '../services/api';

interface Location {
    latitude: number | null;
    longitude: number | null;
    address: string;
    district: string;
    mandal: string;
    state: string;
    pincode: string;
    source: 'GPS' | 'MANUAL' | null;
}

interface DeliveryLocationFormProps {
    onLocationChange: (location: Location) => void;
    initialLocation?: Location;
    showGPSButton?: boolean;
}

const DeliveryLocationForm: React.FC<DeliveryLocationFormProps> = ({
    onLocationChange,
    initialLocation,
    showGPSButton = true
}) => {
    const [location, setLocation] = useState<Location>(initialLocation || {
        latitude: null,
        longitude: null,
        address: '',
        district: '',
        mandal: '',
        state: '',
        pincode: '',
        source: null
    });

    const [isLoadingGPS, setIsLoadingGPS] = useState(false);
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [isGeocoding, setIsGeocoding] = useState(false);

    // Suggestions states
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Notify parent when location changes
    useEffect(() => {
        onLocationChange(location);
    }, [location, onLocationChange]);

    // Debounce geocoding (for manual entry without suggestions)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (location.address && location.district && location.state && location.source === 'MANUAL' && !showSuggestions) {
                geocodeAddress();
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [location.address, location.district, location.state, showSuggestions]);

    // Fetch suggestions as user types
    useEffect(() => {
        const timer = setTimeout(() => {
            if (location.address && location.address.length > 3 && location.source === 'MANUAL') {
                fetchSuggestions();
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        }, 600);

        return () => clearTimeout(timer);
    }, [location.address]);

    const fetchSuggestions = async () => {
        setIsSearching(true);
        try {
            const response = await locationAPI.geocode(location.address, 5);
            if (response.success && response.data) {
                setSuggestions(response.data);
                setShowSuggestions(response.data.length > 0);
            }
        } catch (error) {
            console.error('Failed to fetch suggestions:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const geocodeAddress = async () => {
        const query = `${location.address}, ${location.district}, ${location.state}`;
        setIsGeocoding(true);
        try {
            const response = await locationAPI.geocode(query);
            const data = response.data;

            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                setLocation(prev => ({
                    ...prev,
                    latitude: parseFloat(lat),
                    longitude: parseFloat(lon)
                }));
            }
        } catch (error) {
            console.error('Geocoding failed:', error);
        } finally {
            setIsGeocoding(false);
        }
    };

    const handleGPSFetch = () => {
        setIsLoadingGPS(true);
        setGpsError(null);

        if (!navigator.geolocation) {
            setGpsError('Geolocation is not supported by your browser');
            setIsLoadingGPS(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                console.log('GPS coordinates fetched:', { latitude, longitude });

                // Start reverse geocoding
                setIsGeocoding(true);
                let addressData = {
                    road: '',
                    city: '',
                    state: '',
                    fullAddress: ''
                };

                try {
                    const response = await locationAPI.reverseGeocode(latitude, longitude);
                    const data = response.data;

                    if (data && data.address) {
                        const smart = formatSmartAddress(data.address);
                        const fullAddress = smart.fullAddress;

                        setLocation(prev => ({
                            ...prev,
                            latitude,
                            longitude,
                            source: 'GPS',
                            address: fullAddress,
                            district: smart.district || prev.district,
                            mandal: smart.mandal || prev.mandal,
                            state: smart.state || prev.state,
                            pincode: smart.pincode || prev.pincode
                        }));
                    }
                } catch (error) {
                    console.error('Reverse geocoding failed:', error);
                } finally {
                    setIsGeocoding(false);
                    setIsLoadingGPS(false);
                }
            },
            (error) => {
                let errorMessage = 'Failed to get your location';

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out.';
                        break;
                }

                setGpsError(errorMessage);
                setIsLoadingGPS(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    const handleInputChange = (field: keyof Location, value: string | number) => {
        setLocation(prev => ({
            ...prev,
            [field]: value,
            source: prev.source || 'MANUAL'
        }));
    };

    const handleSelectSuggestion = (suggestion: any) => {
        const smart = formatSmartAddress(suggestion.address);

        // Use the display name or parts to construct a friendly address
        const displayAddr = suggestion.display_name.split(',').slice(0, 3).join(',').trim();

        setLocation({
            latitude: parseFloat(suggestion.lat),
            longitude: parseFloat(suggestion.lon),
            address: displayAddr || smart.fullAddress,
            district: smart.district || '',
            mandal: smart.mandal || '',
            state: smart.state || '',
            pincode: smart.pincode || '',
            source: 'MANUAL'
        });

        setSuggestions([]);
        setShowSuggestions(false);
    };

    return (
        <div className="space-y-4">
            {/* GPS Fetch Button */}
            {showGPSButton && (
                <div>
                    <button
                        onClick={handleGPSFetch}
                        disabled={isLoadingGPS}
                        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all duration-200 ${isLoadingGPS
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                            }`}
                    >
                        {isLoadingGPS ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i>
                                Fetching GPS Location...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-location-crosshairs"></i>
                                Use My Current Location
                            </>
                        )}
                    </button>

                    {gpsError && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-xs text-red-700 flex items-start gap-2">
                                <i className="fas fa-exclamation-circle mt-0.5"></i>
                                <span>{gpsError}</span>
                            </p>
                        </div>
                    )}

                    {location.source === 'GPS' && location.latitude && location.longitude && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-xs text-green-700 flex items-center gap-2">
                                <i className="fas fa-check-circle"></i>
                                GPS location fetched successfully
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Divider */}
            {showGPSButton && (
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200"></div>
                    <span className="text-xs text-gray-400 font-medium">OR ENTER MANUALLY</span>
                    <div className="flex-1 h-px bg-gray-200"></div>
                </div>
            )}

            {/* Manual Entry Form */}
            <div className="space-y-4">
                {/* Address */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-bold text-gray-700">
                            Delivery Address *
                        </label>
                        {isGeocoding && (
                            <span className="text-xs text-blue-600 flex items-center gap-1 animate-pulse">
                                <i className="fas fa-satellite-dish"></i> Finding coordinates...
                            </span>
                        )}
                    </div>
                    <div className="relative">
                        <textarea
                            value={location.address}
                            onChange={(e) => handleInputChange('address', e.target.value)}
                            onFocus={() => {
                                if (suggestions.length > 0) setShowSuggestions(true);
                            }}
                            placeholder="Type to search your location or enter manually"
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none shadow-sm"
                            required
                        />

                        {/* Suggestions Dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn backdrop-blur-md bg-white/95">
                                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                    {suggestions.map((s, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleSelectSuggestion(s)}
                                            className="w-full text-left px-5 py-4 hover:bg-green-50 border-b border-gray-50 last:border-0 transition-colors group"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-green-100 text-gray-400 group-hover:text-green-600 transition-colors">
                                                    <i className="fas fa-location-dot"></i>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-gray-900 line-clamp-2">
                                                        {s.display_name}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-1">
                                                        {s.address?.city || s.address?.town || s.address?.suburb || 'Location'} • {s.address?.state || ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <div className="p-2 bg-gray-50 text-[10px] text-center text-gray-400 font-bold tracking-widest uppercase">
                                    Powered by OpenStreetMap
                                </div>
                            </div>
                        )}

                        {isSearching && (
                            <div className="absolute right-3 top-3">
                                <i className="fas fa-spinner fa-spin text-green-500"></i>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mandal and District */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Mandal/Tehsil
                        </label>
                        <input
                            type="text"
                            value={location.mandal}
                            onChange={(e) => handleInputChange('mandal', e.target.value)}
                            placeholder="e.g., Guntur Rural"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            District *
                        </label>
                        <input
                            type="text"
                            value={location.district}
                            onChange={(e) => handleInputChange('district', e.target.value)}
                            placeholder="e.g., Guntur"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                            required
                        />
                    </div>
                </div>

                {/* State and Pincode */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            State *
                        </label>
                        <input
                            type="text"
                            value={location.state}
                            onChange={(e) => handleInputChange('state', e.target.value)}
                            placeholder="e.g., Andhra Pradesh"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Pincode *
                        </label>
                        <input
                            type="text"
                            value={location.pincode}
                            onChange={(e) => handleInputChange('pincode', e.target.value)}
                            placeholder="e.g., 522001"
                            maxLength={6}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                            required
                        />
                    </div>
                </div>

                {/* GPS Coordinates (Read-only, shown if available) */}
                {location.latitude && location.longitude && (
                    <div className={`bg-gray-50 border border-gray-200 rounded-xl p-4 transition-all ${isGeocoding ? 'opacity-50' : 'opacity-100'}`}>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Location Coordinates
                            </p>
                            {location.source === 'MANUAL' && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                                    Auto-detected from address
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">Latitude:</span>
                                <span className="ml-2 font-mono text-gray-900">{location.latitude.toFixed(6)}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Longitude:</span>
                                <span className="ml-2 font-mono text-gray-900">{location.longitude.toFixed(6)}</span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            <i className="fas fa-info-circle mr-1"></i>
                            Used for accurate delivery distance calculation
                        </p>
                    </div>
                )}

                {/* Location Source Indicator */}
                {location.source && !location.latitude && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <i className="fas fa-keyboard"></i>
                        <span>Manual Entry</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeliveryLocationForm;
