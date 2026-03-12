import React, { useState, useEffect } from 'react';
import { weatherAPI } from '../services/api';

interface WeatherData {
    current: {
        temperature_2m: number;
        relative_humidity_2m: number;
        weather_code: number;
        wind_speed_10m: number;
        is_day: number;
    };
    daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max: number[];
        weather_code: number[];
        uv_index_max: number[];
        sunrise: string[];
        sunset: string[];
    };
}

interface WeatherWidgetProps {
    location?: {
        village?: string;
        district?: string;
        state?: string;
    };
    coords?: { lat: number; lng: number };
}

// Map WMO weather codes to icons and descriptions
const getWeatherInfo = (code: number) => {
    if (code === 0) return { icon: 'fa-sun', label: 'Clear Sky', color: 'text-yellow-500', bg: 'bg-yellow-50' };
    if (code === 1 || code === 2 || code === 3) return { icon: 'fa-cloud-sun', label: 'Partly Cloudy', color: 'text-blue-400', bg: 'bg-blue-50' };
    if (code >= 45 && code <= 48) return { icon: 'fa-smog', label: 'Foggy', color: 'text-gray-400', bg: 'bg-gray-100' };
    if (code >= 51 && code <= 67) return { icon: 'fa-cloud-rain', label: 'Drizzle', color: 'text-blue-500', bg: 'bg-blue-100' };
    if (code >= 80 && code <= 99) return { icon: 'fa-cloud-showers-heavy', label: 'Heavy Rain', color: 'text-blue-700', bg: 'bg-blue-200' };
    if (code >= 71 && code <= 77) return { icon: 'fa-snowflake', label: 'Snow', color: 'text-sky-300', bg: 'bg-sky-50' };
    return { icon: 'fa-cloud', label: 'Cloudy', color: 'text-gray-500', bg: 'bg-gray-50' };
};

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ location, coords }) => {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);

    const [error, setError] = useState(false);

    useEffect(() => {
        // Default to Guntur, Andhra Pradesh if no coords provided
        const lat = coords?.lat || 16.3067;
        const lng = coords?.lng || 80.4365;

        const fetchWeather = async () => {
            // Only set loading on first fetch
            if (!weather) setLoading(true);
            setError(false);
            const data = await weatherAPI.getForecast(lat, lng);
            if (data) {
                setWeather(data);
                setError(false);
            } else {
                setError(true);
            }
            setLoading(false);
        };

        fetchWeather();

        // Auto-refresh every 60 seconds
        const intervalId = setInterval(fetchWeather, 60000);

        return () => clearInterval(intervalId);
    }, [coords]);

    if (loading) {
        return (
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 animate-pulse h-[200px]">
                <div className="flex justify-between items-start">
                    <div className="h-6 w-32 bg-gray-100 rounded-full"></div>
                    <div className="h-10 w-10 bg-gray-100 rounded-full"></div>
                </div>
            </div>
        );
    }

    if (error || !weather) {
        return (
            <div className="group perspective-1000 w-full font-sans">
                <div className="relative overflow-hidden rounded-[32px] p-6 bg-slate-50 border border-slate-200 shadow-sm h-[200px] flex flex-col items-center justify-center text-center">
                    <i className="fas fa-cloud-exclamation text-4xl text-slate-300 mb-3"></i>
                    <p className="text-slate-500 font-bold mb-1">Weather Unavailable</p>
                    <p className="text-xs text-slate-400 mb-3">Check connection</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const isDay = weather.current.is_day === 1; // 1 = Day, 0 = Night
    const weatherCode = weather.current.weather_code;
    const isRaining = weatherCode >= 51;
    const isClear = weatherCode === 0;

    // Format Times
    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const sunriseTime = formatTime(weather.daily.sunrise[0]);
    const sunsetTime = formatTime(weather.daily.sunset[0]);
    const uvIndex = weather.daily.uv_index_max[0];
    const rainChance = weather.daily.precipitation_probability_max[0];

    // Dynamic Theme Logic
    const getTheme = () => {
        if (!isDay) return {
            bg: 'bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]', // Night Sky
            text: 'text-white',
            subText: 'text-gray-400',
            iconColor: 'text-yellow-200',
            accentBg: 'bg-white/10',
            borderColor: 'border-slate-700',
            shadow: 'shadow-slate-900/50'
        };
        if (isRaining) return {
            bg: 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400', // Rainy Day
            text: 'text-slate-800',
            subText: 'text-slate-600',
            iconColor: 'text-blue-600',
            accentBg: 'bg-white/40',
            borderColor: 'border-slate-300',
            shadow: 'shadow-slate-400/50'
        };
        return {
            bg: 'bg-gradient-to-br from-blue-400 via-sky-300 to-indigo-400', // Sunny Day
            text: 'text-white',
            subText: 'text-blue-50',
            iconColor: 'text-yellow-300',
            accentBg: 'bg-white/20',
            borderColor: 'border-white/30',
            shadow: 'shadow-blue-300/50'
        };
    };

    const theme = getTheme();

    // Icon & Label Logic
    const getWeatherIcon = () => {
        // Night Logic
        if (!isDay && isClear) return { icon: 'fa-moon', label: 'Clear Night' };
        if (!isDay && (weatherCode === 1 || weatherCode === 2)) return { icon: 'fa-cloud-moon', label: 'Partly Cloudy' };

        // Use existing mapper for other conditions, but override icons if needed
        const info = getWeatherInfo(weatherCode);
        return { icon: info.icon, label: info.label };
    };

    const weatherDisplay = getWeatherIcon();

    // Advisory logic
    let advisory = { text: "Good conditions for fieldwork.", type: "good" };
    if (weather.current.temperature_2m > 35) advisory = { text: "High heat. Irrigate crops locally.", type: "warning" };
    if (isRaining) advisory = { text: "Rain expected. Delay spraying.", type: "alert" };
    if (weather.current.wind_speed_10m > 20) advisory = { text: "High winds. Secure loose structures.", type: "warning" };

    return (
        <div className="group perspective-1000 cursor-pointer w-full font-sans transition-all duration-500">
            <div className={`relative overflow-hidden rounded-[32px] p-6 ${theme.bg} transition-all duration-500 shadow-2xl hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border ${theme.borderColor} backdrop-blur-3xl md:p-8 lg:p-10`}>

                {/* Background & Overlays */}
                <div className={`absolute top-0 right-0 w-64 h-64 md:w-96 md:h-96 rounded-full blur-[80px] opacity-40 -translate-y-1/2 translate-x-1/4 ${getWeatherInfo(weatherCode).bg.replace('bg-', 'bg-')} transition-transform duration-700`}></div>

                {!isDay && (
                    <div className="absolute inset-0 z-0 pointer-events-none">
                        {[...Array(30)].map((_, i) => (
                            <div key={i} className="absolute bg-white rounded-full animate-twinkle opacity-70" style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, width: `${Math.random() * 2 + 1}px`, height: `${Math.random() * 2 + 1}px`, animationDelay: `${Math.random() * 5}s` }}></div>
                        ))}
                    </div>
                )}
                {isDay && isClear && (
                    <div className="absolute -top-32 -right-32 w-96 h-96 bg-yellow-300 rounded-full blur-[100px] opacity-30 animate-pulse-slow pointer-events-none"></div>
                )}
                {isRaining && (
                    <div className="absolute inset-0 z-0 opacity-30 bg-[url('https://cdn.pixabay.com/animation/2023/06/25/21/55/rain-8088349_512.gif')] bg-cover mix-blend-overlay pointer-events-none"></div>
                )}

                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 lg:gap-10 items-start">

                    {/* Left Section: Current Weather (Span 4 on Desktop) */}
                    <div className="lg:col-span-4 flex flex-col justify-between h-full">
                        <div className="mb-4 lg:mb-0">
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${theme.accentBg} backdrop-blur-md border ${theme.borderColor} mb-4`}>
                                <i className={`fas fa-location-dot ${isDay ? 'text-red-500' : 'text-red-400'} text-[10px]`}></i>
                                <span className={`text-[10px] font-black uppercase tracking-wider ${theme.text} opacity-90`}>{location?.village || location?.district || 'Guntur'}</span>
                            </div>

                            <div className="relative">
                                <h1 className={`text-7xl lg:text-8xl font-black tracking-tighter ${theme.text} drop-shadow-sm leading-none mb-1`}>
                                    {Math.round(weather.current.temperature_2m)}°
                                </h1>
                                <p className={`text-lg lg:text-xl font-bold ${theme.text} opacity-90 flex items-center gap-2 ml-1 tracking-wide`}>
                                    {weatherDisplay.label}
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse"></span>
                                </p>
                            </div>
                        </div>

                        {/* Static Large Icon */}
                        <div className={`hidden lg:flex w-24 h-24 rounded-[2rem] ${theme.accentBg} backdrop-blur-xl items-center justify-center text-5xl shadow-inner border border-white/10 mt-6 hover:scale-105 transition-transform duration-500`}>
                            <i className={`fas ${weatherDisplay.icon} ${theme.iconColor} drop-shadow-xl`}></i>
                        </div>
                    </div>

                    {/* Middle Section: Details & Advisory (Span 5 on Desktop) */}
                    <div className="lg:col-span-5 flex flex-col gap-4">
                        {/* Mobile Icon */}
                        <div className={`lg:hidden w-20 h-20 rounded-[1.5rem] ${theme.accentBg} backdrop-blur-xl flex items-center justify-center text-4xl shadow-inner border border-white/10 self-end -mt-28 md:-mt-0 mb-4`}>
                            <i className={`fas ${weatherDisplay.icon} ${theme.iconColor} drop-shadow-lg`}></i>
                        </div>

                        {/* Current Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { icon: 'fa-wind', val: Math.round(weather.current.wind_speed_10m), unit: 'km/h', label: 'Wind' },
                                { icon: 'fa-droplet', val: weather.current.relative_humidity_2m, unit: '%', label: 'Humidity' },
                                { icon: 'fa-cloud-rain', val: rainChance, unit: '%', label: 'Rain %' },
                                { icon: 'fa-sun', val: uvIndex, unit: 'UV', label: 'Index' }
                            ].map((stat, i) => (
                                <div key={i} className={`flex flex-col items-center justify-center p-4 rounded-2xl ${theme.accentBg} backdrop-blur-md border ${theme.borderColor} hover:bg-white/20 transition-all cursor-default group/stat shadow-sm`}>
                                    <div className="flex items-center gap-1.5 mb-1 opacity-80">
                                        <i className={`fas ${stat.icon} ${theme.subText} text-xs group-hover/stat:scale-110 transition-transform`}></i>
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${theme.subText}`}>{stat.label}</span>
                                    </div>
                                    <span className={`text-xl font-black ${theme.text}`}>{stat.val}<span className="text-[10px] font-bold opacity-60 ml-0.5 align-top">{stat.unit}</span></span>
                                </div>
                            ))}
                        </div>

                        {/* Sunrise/Sunset Timeline */}
                        <div className={`relative flex justify-between items-center px-6 py-4 rounded-2xl border border-white/10 ${theme.accentBg} backdrop-blur-md overflow-hidden shadow-sm`}>
                            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                            <div className={`z-10 flex flex-col items-center gap-0.5 ${theme.text}`}>
                                <i className="fas fa-sunrise text-orange-300 text-base mb-0.5 drop-shadow-sm"></i>
                                <span className="text-sm font-black">{sunriseTime}</span>
                            </div>
                            <div className={`z-10 flex flex-col items-center gap-0.5 ${theme.text}`}>
                                <i className="fas fa-sunset text-amber-300 text-base mb-0.5 drop-shadow-sm"></i>
                                <span className="text-sm font-black">{sunsetTime}</span>
                            </div>
                        </div>

                        {/* Farming Advisory */}
                        <div className={`rounded-2xl p-4 flex items-start gap-3 backdrop-blur-xl shadow-lg bg-white/10 border border-white/20`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${advisory.type === 'good' ? 'bg-emerald-100/90 text-emerald-600' : advisory.type === 'warning' ? 'bg-amber-100/90 text-amber-600' : 'bg-blue-100/90 text-blue-600'} shadow-md`}>
                                <i className={`fas ${advisory.type === 'good' ? 'fa-check' : 'fa-exclamation'} text-sm`}></i>
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-1">Field Advisory</p>
                                <p className="text-[13px] font-bold leading-snug text-white/95">{advisory.text}</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Section: 7-Day Forecast (Span 3 on Desktop) */}
                    <div className="lg:col-span-3 h-full flex flex-col">
                        <h3 className={`text-[10px] font-black uppercase tracking-widest ${theme.subText} mb-4 opacity-80 pl-1 flex items-center gap-1.5`}>
                            <i className="fas fa-calendar-week"></i> 7-Day Forecast
                        </h3>
                        <div className="space-y-2 lg:overflow-y-auto lg:pr-1 custom-scrollbar flex-1">
                            {weather.daily.time.slice(1, 8).map((date, idx) => { // Show next 7 days
                                const info = getWeatherInfo(weather.daily.weather_code[idx + 1]);
                                const d = new Date(date);
                                const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

                                return (
                                    <div key={date} className={`flex justify-between items-center p-2.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group/day border border-transparent hover:border-white/5`}>
                                        <div className="flex items-center gap-3 w-14">
                                            <span className={`text-sm font-bold ${theme.text}`}>{dayName}</span>
                                        </div>
                                        <div className="flex-1 flex justify-center text-lg">
                                            <i className={`fas ${info.icon} ${isDay ? 'text-white/90' : 'text-white/70'} group-hover/day:scale-110 transition-transform`}></i>
                                        </div>
                                        <div className={`text-sm font-black ${theme.text} w-20 text-right`}>
                                            {Math.round(weather.daily.temperature_2m_max[idx + 1])}° <span className="text-[10px] opacity-60 font-semibold text-white/70"> {Math.round(weather.daily.temperature_2m_min[idx + 1])}°</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default WeatherWidget;
