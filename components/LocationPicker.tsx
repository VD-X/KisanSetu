import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import debounce from 'lodash.debounce';
import { formatSmartAddress } from '../utils/locationUtils';
import { locationAPI } from '../services/api';

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }; // India Center
const DEFAULT_ZOOM = 5;
const MAP_HEIGHT = '350px';

// Backend Route API (OSRM)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// --- Helper Functions ---

function getFormattedAddress(data) {
  if (!data) return '';
  if (data.display_name) return data.display_name;
  if (!data.address) return '';

  const a = data.address;
  const parts = [
    a.house_number || a.house_name || a.building,
    a.road || a.street,
    a.neighbourhood || a.suburb || a.subdistrict,
    a.city || a.town || a.village,
    a.state_district || a.county,
    a.state,
    a.postcode
  ].filter(Boolean);
  return parts.join(', ');
}

async function getAddressFromCoords(lat: number, lng: number) {
  try {
    const result = await locationAPI.reverseGeocode(lat, lng);
    return result.data || null;
  } catch (error) {
    console.error("Reverse Geocoding Error:", error);
    return null;
  }
}

async function getCoordsFromAddress(query: string) {
  try {
    const result = await locationAPI.geocode(query);
    const data = result.data;
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error("Geocoding Error:", error);
    return null;
  }
}

async function getRoute(from, to) {
  try {
    const response = await fetch(`${API_URL}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start: [from.lng, from.lat],
        end: [to.lng, to.lat]
      })
    });
    const data = await response.json();
    if (data.success && data.data) {
      return {
        distance: data.data.distance / 1000, // Convert meters to km
        duration: data.data.duration / 60,   // Convert seconds to minutes
        polyline: data.data.geometry.coordinates.map(([lng, lat]) => [lat, lng]) // Swap for Leaflet
      };
    }
    return null;
  } catch (error) {
    console.error("Routing Error:", error);
    return null;
  }
}

// Helper to auto-zoom/pan map
const RecenterMap = ({ position, zoom = 15 }) => {
  const map = useMapEvents({});
  useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], zoom, { animate: true });
    }
  }, [position, map, zoom]);
  return null;
};

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const markerIcon = new L.Icon({
  iconUrl: iconUrl,
  iconRetinaUrl: iconRetinaUrl,
  shadowUrl: shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map clicks and marker movement
function LocationMarker({ position, setPosition, setAddress, setLocationObj, onChange }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition(e.latlng);
      getAddressFromCoords(lat, lng).then(data => {
        if (data) {
          const smart = formatSmartAddress(data.address);
          const fullAddress = smart.fullAddress;

          setAddress(fullAddress);
          setLocationObj(data);

          onChange && onChange({
            latitude: lat,
            longitude: lng,
            fullAddress: fullAddress,
            house: smart.houseNumber || smart.building,
            road: smart.street,
            suburb: smart.colony,
            city: smart.city,
            state: smart.state,
            district: smart.district,
            pincode: smart.pincode,
            country: data.address?.country || ''
          });
        }
      });
    }
  });

  return position && typeof position.lat === 'number' && typeof position.lng === 'number' ? (
    <Marker
      position={position}
      icon={markerIcon}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const latlng = e.target.getLatLng();
          setPosition(latlng);
          getAddressFromCoords(latlng.lat, latlng.lng).then(data => {
            if (data) {
              const smart = formatSmartAddress(data.address);
              const fullAddress = smart.fullAddress;

              setAddress(fullAddress);
              setLocationObj(data);
              onChange && onChange({
                latitude: latlng.lat,
                longitude: latlng.lng,
                fullAddress: fullAddress,
                house: smart.houseNumber || smart.building,
                road: smart.street,
                suburb: smart.colony,
                city: smart.city,
                state: smart.state,
                district: smart.district,
                pincode: smart.pincode,
                country: data.address?.country || ''
              });
            }
          });
        }
      }}
    >
      <Popup>{position.lat.toFixed(5)}, {position.lng.toFixed(5)}</Popup>
    </Marker>
  ) : null;
}

export default function LocationPicker({ value, onChange, pickupLocation, liveMarkers = [], hideMap = false }) {
  // Initialize state from props or default
  const [position, setPosition] = useState(value && value.latitude ? { lat: value.latitude, lng: value.longitude } : null);
  const [address, setAddress] = useState(value?.fullAddress || '');
  const [locationObj, setLocationObj] = useState(value || {});

  // Search & Routing State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [routeInfo, setRouteInfo] = useState({ distance: null, duration: null, polyline: [] });

  // Auto-detect location on mount if no value provided
  useEffect(() => {
    if (!value?.latitude && !position) {
      handleAutoLocation(); // Ask only if not set
    }
  }, []);

  // Sync internal state if props change externally
  useEffect(() => {
    if (!value) return;

    const hasNewCoords = value.latitude && value.longitude;
    const isDifferentPos = value.latitude !== position?.lat || value.longitude !== position?.lng;
    const isDifferentAddr = value.fullAddress && value.fullAddress !== address;

    if (hasNewCoords && isDifferentPos) {
      setPosition({ lat: value.latitude, lng: value.longitude });
    }

    if (isDifferentAddr) {
      setAddress(value.fullAddress);
    }

    // Only clear if the parent explicitly sends null and we aren't currently searching/detecting
    else if (value.latitude === null && position !== null && !isSearching) {
      setPosition(null);
      setAddress('');
    }
  }, [value?.latitude, value?.longitude, value?.fullAddress]);

  const handleAutoLocation = () => {
    if (navigator.geolocation) {
      setIsSearching(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const latlng = { lat: latitude, lng: longitude };
          setPosition(latlng);

          const data = await getAddressFromCoords(latitude, longitude);
          setIsSearching(false);

          if (data) {
            const smart = formatSmartAddress(data.address);
            const fullAddr = smart.fullAddress;

            setAddress(fullAddr);
            setLocationObj(data);

            if (onChange) {
              onChange({
                latitude,
                longitude,
                fullAddress: fullAddr,
                house: smart.houseNumber || smart.building,
                road: smart.street,
                suburb: smart.colony,
                city: smart.city,
                state: smart.state,
                district: smart.district,
                pincode: smart.pincode,
                country: data.address?.country || ''
              });
            }
          }
        },
        (err) => {
          console.error("Geolocation failed", err);
          setIsSearching(false);
          alert("Could not get your location. Please check browser permissions and ensure Location Services (GPS) are enabled.");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  // Calculate route when pickupLocation and current position are set
  useEffect(() => {
    if (pickupLocation && position) {
      getRoute(pickupLocation, position).then(info => {
        if (info) {
          setRouteInfo(info);
        }
      });
    }
  }, [pickupLocation, position]);

  // Handle Search with suggestions logic
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const result = await locationAPI.geocode(searchQuery);
      const results = result.data;
      setIsSearching(false);

      if (results && results.length > 0) {
        setSuggestions(results);
        if ((results.length === 1 || hideMap) && !hideMap) {
          // Auto-select first only if not hiding map (if hiding, always show suggestions so user can refine)
          selectLocation(results[0]);
        }
      } else {
        alert("No results found for this location.");
      }
    } catch (error) {
      console.error("Search error:", error);
      setIsSearching(false);
    }
  };

  const selectLocation = (data) => {
    const lat = parseFloat(data.lat);
    const lng = parseFloat(data.lon);
    const latlng = { lat, lng };
    setPosition(latlng);
    setSuggestions([]);

    const smart = formatSmartAddress(data.address);
    const fullAddress = smart.fullAddress;

    setAddress(fullAddress);
    setLocationObj(data);

    if (onChange) {
      onChange({
        latitude: lat,
        longitude: lng,
        fullAddress: fullAddress,
        house: smart.houseNumber || smart.building,
        road: smart.street,
        suburb: smart.colony,
        city: smart.city,
        state: smart.state,
        district: smart.district,
        pincode: smart.pincode,
        country: data.address?.country || ''
      });
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Search Bar & Auto Button */}
      <div className="flex flex-col sm:flex-row gap-2 relative">
        <div className="flex flex-1 gap-2 relative">
          <input
            type="text"
            placeholder="Search for a city, area, or address..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
          />
          <button
            type="button"
            onClick={handleSearch}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            disabled={isSearching}
          >
            {isSearching ? '...' : 'Search'}
          </button>

          {/* Search Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[1000] max-h-60 overflow-y-auto">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectLocation(s)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-none flex items-start gap-3 group transition-colors"
                >
                  <i className="fas fa-location-dot mt-1 text-gray-400 group-hover:text-green-500"></i>
                  <div>
                    <p className="text-sm font-bold text-gray-900 line-clamp-1">{s.display_name}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-black">
                      {s.address?.city || s.address?.town || s.address?.village || s.address?.municipality || s.address?.hamlet || s.address?.suburb || s.address?.neighbourhood || s.address?.city_district || 'Location'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleAutoLocation}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <span>📍</span> Auto-Detect
        </button>
      </div>

      {/* Map Container */}
      <div className="relative border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <MapContainer
          center={position || DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: MAP_HEIGHT, width: '100%' }}
        >
          <RecenterMap position={position} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          <LocationMarker
            position={position}
            setPosition={setPosition}
            setAddress={setAddress}
            setLocationObj={setLocationObj}
            onChange={onChange}
          />

          {/* Routing Polyline */}
          {pickupLocation && routeInfo.polyline.length > 0 && (
            <Polyline positions={routeInfo.polyline} color="blue" weight={4} opacity={0.7} />
          )}

          {/* Live Markers (e.g., Drivers) */}
          {liveMarkers.map((m, i) => (
            <Marker key={i} position={[m.latitude, m.longitude]} icon={markerIcon}>
              <Popup>{m.label || 'Transporter'}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Selected Address Display */}
      {address && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
          <strong>Selected Location:</strong> {address}
        </div>
      )}

      {/* Route Info Display */}
      {routeInfo.distance && (
        <div className="grid grid-cols-2 gap-4 mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-800 text-sm">
          <div><strong>Distance:</strong> {routeInfo.distance.toFixed(2)} km</div>
          <div><strong>Est. Time:</strong> {routeInfo.duration ? routeInfo.duration.toFixed(0) + ' mins' : 'N/A'}</div>
        </div>
      )}
    </div>
  );
}
