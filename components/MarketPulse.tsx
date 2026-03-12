import React, { useState, useEffect } from 'react';

export const MarketPulse: React.FC = () => {
    const [activeUsers, setActiveUsers] = useState(420);
    const [tickerIndex, setTickerIndex] = useState(0);

    const updates = [
        "🍅 Tomato prices down 5% in Nagpur Mandi",
        "🌾 Wheat arrivals peaking in Punjab",
        "🥔 Potato demand high in Mumbai",
        "🚚 50+ New Transporters joined today",
        "🌧️ Light rains expected in Central India"
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveUsers(prev => prev + Math.floor(Math.random() * 3) - 1);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setTickerIndex(prev => (prev + 1) % updates.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative overflow-hidden bg-gradient-to-r from-green-900 via-emerald-900 to-teal-900 rounded-[32px] p-6 md:p-8 text-white shadow-xl shadow-green-900/20 mb-8 border border-white/10">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/3"></div>

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-green-300">Live Market Status</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-green-200">
                            {activeUsers.toLocaleString()} Farmers
                        </span>
                        <br />
                        <span className="text-lg md:text-xl font-bold text-green-100/80">Online Right Now</span>
                    </h2>
                    <p className="text-xs text-green-200/60 font-medium max-w-sm">
                        Source fresh produce directly from the fields. Real-time connections, zero brokerage.
                    </p>
                </div>

                <div className="w-full md:w-auto bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 min-w-[280px]">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-green-300">Market Updates</span>
                        <i className="fas fa-chart-line text-green-300 text-xs"></i>
                    </div>
                    <div className="h-10 flex items-center overflow-hidden relative">
                        {updates.map((update, idx) => (
                            <div
                                key={idx}
                                className={`absolute w-full transition-all duration-500 transform ${idx === tickerIndex ? 'translate-y-0 opacity-100' :
                                        idx < tickerIndex ? '-translate-y-full opacity-0' : 'translate-y-full opacity-0'
                                    }`}
                            >
                                <p className="text-sm font-bold text-white leading-tight">
                                    {update}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
