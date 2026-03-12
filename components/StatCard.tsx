import React from 'react';

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    unit?: string;
    color: 'blue' | 'yellow' | 'green' | 'purple' | 'orange';
    size?: 'sm' | 'md' | 'lg';
}

const colorClasses = {
    blue: {
        bg: 'bg-blue-500/30',
        border: 'border-blue-400/40',
        icon: 'bg-gradient-to-br from-blue-400 to-blue-600',
        text: 'text-blue-300',
        value: 'text-blue-100',
    },
    yellow: {
        bg: 'bg-yellow-500/20',
        border: 'border-yellow-400/40',
        icon: 'bg-gradient-to-br from-yellow-400 to-orange-500',
        text: 'text-yellow-300',
        value: 'text-yellow-100',
    },
    green: {
        bg: 'bg-green-500/20',
        border: 'border-green-400/40',
        icon: 'bg-gradient-to-br from-green-400 to-emerald-600',
        text: 'text-green-300',
        value: 'text-green-100',
    },
    purple: {
        bg: 'bg-purple-500/20',
        border: 'border-purple-400/40',
        icon: 'bg-gradient-to-br from-purple-400 to-pink-600',
        text: 'text-purple-300',
        value: 'text-purple-100',
    },
    orange: {
        bg: 'bg-orange-500/20',
        border: 'border-orange-400/40',
        icon: 'bg-gradient-to-br from-orange-400 to-red-500',
        text: 'text-orange-300',
        value: 'text-orange-100',
    },
};

const sizeClasses = {
    sm: {
        container: 'p-3',
        icon: 'w-8 h-8 text-base',
        label: 'text-xs',
        value: 'text-lg',
    },
    md: {
        container: 'p-4',
        icon: 'w-10 h-10 text-lg',
        label: 'text-sm',
        value: 'text-2xl',
    },
    lg: {
        container: 'p-6',
        icon: 'w-12 h-12 text-xl',
        label: 'text-base',
        value: 'text-3xl',
    },
};

const StatCard: React.FC<StatCardProps> = ({
    icon,
    label,
    value,
    unit,
    color,
    size = 'md',
}) => {
    const colors = colorClasses[color];
    const sizes = sizeClasses[size];

    return (
        <div className={`backdrop-blur-xl ${colors.bg} border ${colors.border} rounded-2xl ${sizes.container} hover:bg-white/15 transition-all duration-300 text-center`}>
            <div className={`w-full flex flex-col items-center gap-2`}>
                <div className={`${colors.icon} rounded-xl flex items-center justify-center text-white shadow-lg ${sizes.icon}`}>
                    {icon}
                </div>
                <p className={`${colors.text} font-bold uppercase tracking-widest ${sizes.label}`}>
                    {label}
                </p>
                <div className={`${colors.value} font-black ${sizes.value} leading-tight`}>
                    {value}
                    {unit && <span className="text-xs ml-1">{unit}</span>}
                </div>
            </div>
        </div>
    );
};

interface TripStatsProps {
    distance: number;
    load: number;
    minCost: number;
    maxCost: number;
    layout?: 'grid' | 'compact';
}

export const TripStats: React.FC<TripStatsProps> = ({
    distance,
    load,
    minCost,
    maxCost,
    layout = 'grid',
}) => {
    if (layout === 'compact') {
        return (
            <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white font-semibold">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.99 5V1h-1v4H8.98v2h3.01v3.1H8.98v2h3.01V16h1v-3.9h3.01v-2h-3.01V7h3.01V5h-3.01z" />
                    </svg>
                    {distance.toFixed(1)} km
                </div>
                <div className="flex items-center gap-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white font-semibold">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                    </svg>
                    {load} kg
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
                icon={
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.99 5V1h-1v4H8.98v2h3.01v3.1H8.98v2h3.01V16h1v-3.9h3.01v-2h-3.01V7h3.01V5h-3.01z" />
                    </svg>
                }
                label="Distance"
                value={distance.toFixed(1)}
                unit="km"
                color="blue"
                size="md"
            />
            <StatCard
                icon={
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                    </svg>
                }
                label="Load"
                value={load}
                unit="kg"
                color="yellow"
                size="md"
            />
            <StatCard
                icon={
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                    </svg>
                }
                label="Min Cost"
                value={`₹${Math.round(minCost)}`}
                color="green"
                size="md"
            />
            <StatCard
                icon={
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                    </svg>
                }
                label="Max Cost"
                value={`₹${Math.round(maxCost)}`}
                color="purple"
                size="md"
            />
        </div>
    );
};

export default StatCard;
