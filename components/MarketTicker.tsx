import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface TickerItem {
    id: string;
    type: 'SALE' | 'BID' | 'INSIGHT';
    text: string;
    icon: string;
    color: string;
}

const MarketTicker: React.FC = () => {
    const { user } = useAuth();
    const [items, setItems] = useState<TickerItem[]>([]);

    useEffect(() => {
        // In a real app, this would fetch from a socket or API
        // For now, generating realistic mock data
        const location = user?.location?.district || 'Guntur';

        const mockData: TickerItem[] = [
            { id: '1', type: 'SALE', text: `Ramesh sold 500kg Tomatoes in ${location} Mandi`, icon: 'fa-handshake', color: 'text-green-400' },
            { id: '2', type: 'BID', text: 'New bulk order for Cotton (Premium Grade)', icon: 'fa-bullhorn', color: 'text-blue-400' },
            { id: '3', type: 'INSIGHT', text: 'Chilli prices expected to rise by 2% today', icon: 'fa-arrow-trend-up', color: 'text-amber-400' },
            { id: '4', type: 'SALE', text: 'Suresh dispatched 2 tons of Wheat to Hyderabad', icon: 'fa-truck-fast', color: 'text-purple-400' },
            { id: '5', type: 'INSIGHT', text: 'Rain alert for coastal districts: delays likely', icon: 'fa-cloud-rain', color: 'text-cyan-400' },
            { id: '6', type: 'BID', text: 'Looking for 1000kg Organic Turmeric', icon: 'fa-magnifying-glass', color: 'text-pink-400' },
        ];

        setItems(mockData);
    }, [user]);

    return (
        <div className="w-full bg-white/5 backdrop-blur-md border-y border-white/10 overflow-hidden py-2 mb-6 shadow-sm">
            <div className="flex items-center gap-4 animate-marquee whitespace-nowrap">
                {/* Duplicate items for infinite scroll effect */}
                {[...items, ...items, ...items].map((item, idx) => (
                    <div key={`${item.id}-${idx}`} className="inline-flex items-center gap-2 px-4 border-r border-white/10 last:border-0">
                        <i className={`fas ${item.icon} ${item.color} text-xs`}></i>
                        <span className="text-sm font-medium text-gray-200 tracking-wide">
                            {item.text}
                        </span>
                    </div>
                ))}
            </div>

            <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
        </div>
    );
};

export default MarketTicker;
