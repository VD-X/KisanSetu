
import React, { useState } from 'react';
import DeliveryLocationForm from '../components/DeliveryLocationForm';
import DistanceDisplay from '../components/DistanceDisplay';
import LocationPermissionModal from '../components/LocationPermissionModal';
import { locationAPI } from '../services/api';

const TestLocation: React.FC = () => {
    const [showLocationModal, setShowLocationModal] = useState(true);
    const [deliveryLocation, setDeliveryLocation] = useState<{
        latitude: number | null;
        longitude: number | null;
        address: string;
        source?: 'GPS' | 'MANUAL';
    }>({ latitude: null, longitude: null, address: '', source: undefined });

    const [distanceData, setDistanceData] = useState<{
        distance: number | null;
        duration: number | null;
        source: 'ORS' | 'HAVERSINE' | null;
    }>({ distance: null, duration: null, source: null });

    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = React.useCallback((msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
    }, []);

    const handleAllowGPS = React.useCallback(async () => {
        setShowLocationModal(false);
        addLog('Requesting GPS...');
        if (!navigator.geolocation) {
            addLog('❌ Geolocation not supported');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                addLog(`✅ GPS Success: ${latitude}, ${longitude}`);
                setLoading(true);
                try {
                    // Update location state
                    const address = 'GPS Location (Mock Address Fetch)';
                    // In real app we fetch address, here we might skip or reuse logic if we extracted it.
                    // But DeliveryLocationForm handles fetching if we pass it? 
                    // No, DeliveryLocationForm takes initialLocation. 
                    // Actually CartView handles the fetching.

                    // Let's emulate CartView logic
                    // We can call locationAPI to reverse geocode if we had that.
                    // For now, let's just set coords.

                    setDeliveryLocation({
                        latitude,
                        longitude,
                        address: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`, // Mock address
                        source: 'GPS'
                    });

                } catch (error) {
                    addLog(`❌ Error processing GPS: ${error}`);
                } finally {
                    setLoading(false);
                }
            },
            (error) => {
                addLog(`❌ GPS Error: ${error.message} (Code: ${error.code})`);
                addLog('⚠️ Use Manual Entry instead.');
                // We keep modal closed, user sees manual form in DeliveryLocationForm if we render it.
            }
        );
    }, [addLog]);

    const handleManualEntry = React.useCallback(() => {
        setShowLocationModal(false);
        addLog('Selected Manual Entry mode');
    }, [addLog]);

    const handleLocationChange = React.useCallback(async (details: any) => {
        // Prevent infinite loop by checking if details actually changed significantly?
        // But for now, just stabilizing the function reference should be enough if Child uses it in dependency.

        // Wait, if Child calls this, Parent updates state -> Parent re-renders -> Child re-renders -> useEffect checks dependencies.
        // If handleLocationChange is stable, and 'location' (Child state) is stable, useEffect WON'T run.

        addLog(`📍 Location Updated: ${details.address} (${details.latitude}, ${details.longitude})`);
        setDeliveryLocation(details);

        // Calculate Distance logic
        if (details.latitude && details.longitude) {
            setLoading(true);
            try {
                // Mock farmer location (e.g. Center of India or specific)
                const farmerLat = 20.5937;
                const farmerLng = 78.9629;

                const result = await locationAPI.calculateDistance(
                    { lat: farmerLat, lng: farmerLng },
                    { lat: details.latitude, lng: details.longitude }
                );

                addLog(`📏 Distance Calculated: ${result.distance} km (${result.source})`);
                setDistanceData({
                    distance: result.distance,
                    duration: result.duration,
                    source: result.source as any
                });
            } catch (error) {
                addLog(`❌ Distance Calc Failed: ${error}`);
            } finally {
                setLoading(false);
            }
        }
    }, [addLog]);

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-black text-gray-900 mb-6">Location Component Test Harness</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left: Components */}
                    <div className="space-y-6">
                        <section className="bg-white p-6 rounded-3xl shadow-sm">
                            <h2 className="text-xl font-bold mb-4">Delivery Location Form</h2>
                            <DeliveryLocationForm
                                initialLocation={{ ...deliveryLocation, district: '', state: '', mandal: '', pincode: '', source: deliveryLocation.source || null }}
                                onLocationChange={handleLocationChange}
                            />
                        </section>

                        <section className="bg-white p-6 rounded-3xl shadow-sm">
                            <h2 className="text-xl font-bold mb-4">Distance Display</h2>
                            <DistanceDisplay
                                distanceKm={distanceData.distance}
                                durationMinutes={distanceData.duration}
                                source={distanceData.source as 'ORS' | 'HAVERSINE' | null}
                                onRecalculate={() => handleLocationChange(deliveryLocation)}
                                isLoading={loading}
                            />
                        </section>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowLocationModal(true)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold"
                            >
                                Reset / Show Modal
                            </button>
                            <button
                                onClick={() => setLogs([])}
                                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold"
                            >
                                Clear Logs
                            </button>
                        </div>
                    </div>

                    {/* Right: Logs & State */}
                    <div className="space-y-6">
                        <section className="bg-white p-6 rounded-3xl shadow-sm h-96 overflow-y-auto font-mono text-sm">
                            <h2 className="text-xl font-bold mb-4 sticky top-0 bg-white pb-2 border-b">Debug Logs</h2>
                            {logs.length === 0 ? (
                                <p className="text-gray-400 italic">No logs yet...</p>
                            ) : (
                                logs.map((log, i) => <div key={i} className="mb-1 border-b border-gray-100 pb-1">{log}</div>)
                            )}
                        </section>

                        <section className="bg-gray-800 text-green-400 p-6 rounded-3xl shadow-sm font-mono text-sm overflow-x-auto">
                            <h2 className="text-white font-bold mb-2">Current State</h2>
                            <pre>{JSON.stringify({ deliveryLocation, distanceData, loading }, null, 2)}</pre>
                        </section>
                    </div>
                </div>
            </div>

            <LocationPermissionModal
                isOpen={showLocationModal}
                onClose={() => setShowLocationModal(false)}
                onAllowGPS={handleAllowGPS}
                onManualEntry={handleManualEntry}
            />
        </div>
    );
};

export default TestLocation;
