import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';

const LocationSearch = ({ label, placeholder, onLocationSelect, initialValue = '' }) => {
    const [query, setQuery] = useState(initialValue);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef(null);

    // Debounce logic
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length > 2 && showSuggestions) {
                fetchSuggestions(query);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query, showSuggestions]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const fetchSuggestions = async (searchText) => {
        setLoading(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&addressdetails=1&limit=5&countrycodes=in`,
                {
                    headers: {
                        'User-Agent': 'KisanSetu/1.0 (contact@kisansetu.com)'
                    }
                }
            );
            const data = await response.json();
            setSuggestions(data);
        } catch (error) {
            console.error("Nominatim Search Error:", error);
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (item) => {
        const address = item.display_name;
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);

        setQuery(address);
        setShowSuggestions(false);

        onLocationSelect && onLocationSelect({
            address,
            lat,
            lng,
            details: item.address
        });
    };

    const clearSearch = () => {
        setQuery('');
        setSuggestions([]);
        setShowSuggestions(false);
        onLocationSelect && onLocationSelect(null);
    };

    return (
        <div className="w-full relative" ref={wrapperRef}>
            {label && <label className="label text-sm font-semibold text-gray-700">{label}</label>}

            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Search size={18} />
                </div>

                <input
                    type="text"
                    className="input input-bordered w-full pl-10 pr-10"
                    placeholder={placeholder || "Search location..."}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => query.length > 2 && setShowSuggestions(true)}
                />

                {loading ? (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin">
                        <Loader2 size={18} />
                    </div>
                ) : query && (
                    <button
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((item) => (
                        <li
                            key={item.place_id}
                            className="p-3 hover:bg-gray-50 cursor-pointer flex items-start gap-3 border-b border-gray-100 last:border-0"
                            onClick={() => handleSelect(item)}
                        >
                            <MapPin className="text-gray-400 mt-1 shrink-0" size={16} />
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-800 line-clamp-1">
                                    {item.name || item.address.road || item.address.suburb || item.display_name.split(',')[0]}
                                </span>
                                <span className="text-xs text-gray-500 line-clamp-2">
                                    {item.display_name}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LocationSearch;
