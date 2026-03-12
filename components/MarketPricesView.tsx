import React, { useState, useEffect } from 'react';
import { marketPriceAPI } from '../services/api';
import PriceTrendChart from './PriceTrendChart';

interface MarketPrice {
    cropId: string;
    crop: string;
    icon: string;
    mandi: string;
    variety?: string;
    min: number;
    max: number;
    avg: number;
    msp: number | null;
    analytics?: string;
    date: string;
}

interface MarketPricesViewProps {
    // No props needed - uses context
}

const MarketPricesView: React.FC<MarketPricesViewProps> = () => {
    const [prices, setPrices] = useState<MarketPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [lastUpdated, setLastUpdated] = useState<string>('');
    const [location, setLocation] = useState<string>('');

    // Chart State
    const [selectedCrop, setSelectedCrop] = useState<MarketPrice | null>(null);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        fetchPrices();
    }, []);

    useEffect(() => {
        if (selectedCrop) {
            fetchHistory(selectedCrop.cropId);
        }
    }, [selectedCrop]);

    const fetchPrices = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await marketPriceAPI.getDailyPrices();

            if (response.success && response.prices && response.prices.length > 0) {
                setPrices(response.prices);
                setLocation(response.location || '');
                
                // Set last updated based on the first price entry's date or current time
                const dataDate = response.prices[0]?.date;
                const today = new Date().toISOString().split('T')[0];
                const isToday = dataDate && dataDate.startsWith(today);
                
                setLastUpdated(isToday ? `Today, ${new Date().toLocaleTimeString()}` : (dataDate ? new Date(dataDate).toLocaleDateString() : new Date().toLocaleTimeString()));

                // Select first crop by default if none selected
                if (!selectedCrop) {
                    setSelectedCrop(response.prices[0]);
                }
            } else if (response.success && (!response.prices || response.prices.length === 0)) {
                // Handle success with no data
                setPrices([]);
                setError('No market data available for your location yet.');
            } else {
                setError(response.message || 'Failed to load market prices from server');
            }
        } catch (err: any) {
            console.error('Error fetching prices:', err);
            const errorMessage = err.body?.message || err.message || 'Network error: Could not reach the server';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        try {
            setLoading(true);
            setError(null);

            // Call the refresh endpoint to clear backend cache
            const response = await marketPriceAPI.refresh();

            if (response.success) {
                // Re-fetch the fresh prices
                await fetchPrices();
            } else {
                setError(response.message || 'Failed to refresh market prices');
                setLoading(false);
            }
        } catch (err: any) {
            console.error('Error refreshing prices:', err);
            const errorMessage = err.body?.message || err.message || 'Network error: Could not reach the server';
            setError(errorMessage);
            setLoading(false);
        }
    };

    const handleUseMockData = () => {
        // Fallback for demo/offline/error purposes
        const mockPrices: MarketPrice[] = [
            { cropId: 'm1', crop: 'Tomato', icon: '🍅', mandi: 'Local Mandi', min: 18, max: 26, avg: 22, msp: 18, date: new Date().toISOString() },
            { cropId: 'm2', crop: 'Onion', icon: '🧅', mandi: 'Local Mandi', min: 15, max: 22, avg: 18.5, msp: 16, date: new Date().toISOString() },
            { cropId: 'm3', crop: 'Potato', icon: '🥔', mandi: 'Local Mandi', min: 12, max: 18, avg: 15, msp: 12, date: new Date().toISOString() },
            { cropId: 'm4', crop: 'Pumpkin', icon: '🎃', mandi: 'Local Mandi', min: 14, max: 20, avg: 17, msp: 15, date: new Date().toISOString() },
            { cropId: 'm5', crop: 'Garlic', icon: '🧄', mandi: 'Local Mandi', min: 55, max: 85, avg: 70, msp: 60, date: new Date().toISOString() },
            { cropId: 'm6', crop: 'Ginger', icon: '🫚', mandi: 'Local Mandi', min: 42, max: 65, avg: 53.5, msp: 45, date: new Date().toISOString() }
        ];
        setPrices(mockPrices);
        setSelectedCrop(mockPrices[0]);
        setLocation('Demo Mode (Mock Data)');
        setError(null);
        setLastUpdated(new Date().toLocaleTimeString());
    };

    const fetchHistory = async (cropId: string) => {
        try {
            setLoadingHistory(true);
            const response = await marketPriceAPI.getHistory(cropId, 30);
            if (response.success && response.data) {
                setHistoryData(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch history', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const filteredPrices = prices.filter(price =>
        price.crop.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getPriceColor = (avg: number, msp: number | null) => {
        if (!msp) return 'text-gray-900';
        if (avg >= msp * 1.2) return 'text-green-600';
        if (avg >= msp) return 'text-emerald-600';
        return 'text-amber-600';
    };

    const getPriceTrend = (avg: number, msp: number | null) => {
        if (!msp) return null;
        const diff = ((avg - msp) / msp) * 100;
        return {
            value: Math.abs(diff).toFixed(1),
            isPositive: diff >= 0,
            icon: diff >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'
        };
    };

    if (loading) {
        return (
            <div className="space-y-6 pb-20 animate-in fade-in duration-500">
                <div className="flex items-center justify-between px-1">
                    <div className="h-8 w-48 bg-gray-200 rounded-2xl animate-pulse"></div>
                    <div className="h-8 w-24 bg-gray-200 rounded-2xl animate-pulse"></div>
                </div>
                <div className="h-[300px] bg-gray-100 rounded-[40px] animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-40 bg-gray-100 rounded-[32px] animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-6 animate-in fade-in duration-500">
                <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
                    <i className="fas fa-exclamation-triangle text-4xl text-red-500"></i>
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Market Data Unavailable</h3>
                <p className="text-sm text-gray-500 mb-8 text-center max-w-md">
                    {error.includes('Unauthorized') ? 'Your session has expired. Please log in again.' : error}
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={handleRefresh}
                        className="bg-gray-900 text-white px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-gray-800 active:scale-95 transition-all"
                    >
                        <i className="fas fa-refresh mr-2"></i>
                        Retry Fetch
                    </button>
                    <button
                        onClick={handleUseMockData}
                        className="bg-white border-2 border-gray-900 text-gray-900 px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-gray-50 active:scale-95 transition-all"
                    >
                        <i className="fas fa-database mr-2"></i>
                        Use Mock Data
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-24 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Market Prices</h2>
                    <p className="text-xs text-gray-400 mt-1 font-bold uppercase tracking-wider">
                        <i className="fas fa-location-dot mr-1 text-green-500"></i>
                        {location || 'Your Location'} • Updated: {lastUpdated || 'Today'}
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="bg-white border-2 border-gray-100 text-gray-600 px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-wider hover:border-green-200 hover:bg-green-50 hover:text-green-600 active:scale-95 transition-all disabled:opacity-50"
                    >
                        <i className="fas fa-refresh mr-2"></i>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Price Trend Chart Section */}
            {selectedCrop && (
                <div className="bg-white p-6 rounded-[32px] md:rounded-[40px] shadow-lg shadow-green-50 border border-green-100 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center text-3xl">
                                {selectedCrop.icon}
                            </div>
                            <div>
                                <h3 className="font-black text-xl text-gray-900 leading-none">{selectedCrop.crop} Trends</h3>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Last 30 Days Analysis</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-black text-gray-900 leading-none">₹{selectedCrop.avg}</p>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Current Avg</p>
                        </div>
                    </div>

                    <div className="relative z-10 -ml-4">
                        <PriceTrendChart
                            data={historyData}
                            cropName={selectedCrop.crop}
                            isLoading={loadingHistory}
                        />
                    </div>

                    {/* AI Analytics Section */}
                    {selectedCrop.analytics && (
                        <div className="mt-8 pt-6 border-t border-green-50 relative z-10 animate-in slide-in-from-bottom-4 duration-700">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center text-xs">
                                    <i className="fas fa-robot text-[10px]"></i>
                                </div>
                                <h4 className="font-black text-xs uppercase tracking-widest text-gray-900">Market Insight</h4>
                                <div className="ml-auto flex items-center gap-1.5 px-2 py-1 bg-green-100/50 rounded-md">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                    <span className="text-[9px] font-black text-green-700 uppercase tracking-tighter">AI Analysis Active</span>
                                </div>
                            </div>
                            <div className="bg-gray-50/80 rounded-2xl p-4 border border-white">
                                <p className="text-sm text-gray-700 leading-relaxed italic font-medium">
                                    "{selectedCrop.analytics}"
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Decorative Blob */}
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-green-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                </div>
            )}

            {/* Search Bar */}
            <div className="relative">
                <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-300"></i>
                <input
                    type="text"
                    placeholder="Search crops..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border-2 border-gray-100 pl-14 pr-6 py-4 rounded-3xl font-bold text-gray-900 placeholder-gray-300 focus:border-green-200 focus:bg-green-50/30 focus:outline-none transition-all"
                />
            </div>

            {/* Price Cards Grid */}
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">All Crops</h3>

            {filteredPrices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <i className="fas fa-search text-4xl text-gray-200"></i>
                    </div>
                    <h3 className="text-xl font-black text-gray-300 mb-2">No Crops Found</h3>
                    <p className="text-sm text-gray-400">Try a different search term</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPrices.map((price, idx) => {
                        const trend = getPriceTrend(price.avg, price.msp);
                        const priceColor = getPriceColor(price.avg, price.msp);
                        const isSelected = selectedCrop?.cropId === price.cropId;

                        return (
                            <button
                                key={price.cropId}
                                onClick={() => {
                                    setSelectedCrop(price);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={`text-left w-full bg-white rounded-[40px] shadow-sm border overflow-hidden hover:shadow-xl transition-all group animate-in slide-in-from-bottom duration-500 relative ${isSelected ? 'border-green-500 ring-4 ring-green-50' : 'border-gray-100 hover:border-green-100'}`}
                                style={{ animationDelay: `${Math.min(idx * 100, 500)}ms` }}
                            >
                                <div className="p-6">
                                    {/* Crop Header */}
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-16 h-16 bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 transition-transform">
                                            {price.icon || '🌿'}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-black text-xl text-gray-900 leading-none">{price.crop}</h3>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                    <i className="fas fa-location-dot text-green-500"></i>
                                                    {price.mandi}
                                                </p>
                                                {price.variety && (
                                                    <p className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-tighter">
                                                        {price.variety}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs shadow-lg shadow-green-200">
                                                <i className="fas fa-check"></i>
                                            </div>
                                        )}
                                    </div>

                                    {/* Price Range */}
                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                        <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-50">
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Min</p>
                                            <p className="text-lg font-black text-gray-700">₹{price.min}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-2xl border border-green-100">
                                            <p className="text-[8px] font-black text-green-600 uppercase tracking-widest mb-1">Avg</p>
                                            <p className={`text-lg font-black ${priceColor}`}>₹{price.avg}</p>
                                        </div>
                                        <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-50">
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Max</p>
                                            <p className="text-lg font-black text-gray-700">₹{price.max}</p>
                                        </div>
                                    </div>

                                    {/* MSP and Trend */}
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                        {price.msp ? (
                                            <>
                                                <div>
                                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">MSP</p>
                                                    <p className="text-sm font-black text-gray-600">₹{price.msp}/kg</p>
                                                </div>
                                                {trend && (
                                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${trend.isPositive ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                                        <i className={`fas ${trend.icon} text-xs`}></i>
                                                        <span className="text-xs font-black">{trend.value}%</span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <p className="text-xs text-gray-400 font-bold">Price per kg</p>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Info Footer */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-3xl border border-blue-100">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
                        <i className="fas fa-info-circle text-blue-600"></i>
                    </div>
                    <div>
                        <h4 className="font-black text-sm text-blue-900 mb-1">About Market Prices</h4>
                        <p className="text-xs text-blue-700 leading-relaxed">
                            Prices are updated daily from government sources and market data. MSP (Minimum Support Price) is the government-guaranteed price. Use these prices as a guide when listing your crops.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketPricesView;
