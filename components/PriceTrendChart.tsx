import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

interface PricePoint {
    date: string;
    avg: number;
    min: number;
    max: number;
}

interface PriceTrendChartProps {
    data: PricePoint[];
    cropName: string;
    isLoading?: boolean;
}

const PriceTrendChart: React.FC<PriceTrendChartProps> = ({ data, cropName, isLoading }) => {
    if (isLoading) {
        return (
            <div className="h-[300px] w-full flex items-center justify-center bg-gray-50 rounded-3xl border border-gray-100 animate-pulse">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-green-200 border-t-green-500 rounded-full animate-spin"></div>
                    <p className="text-sm font-bold text-gray-400">Loading market trends...</p>
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="h-[300px] w-full flex items-center justify-center bg-gray-50 rounded-3xl border border-gray-100">
                <div className="text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                        <i className="fas fa-chart-line text-2xl"></i>
                    </div>
                    <p className="text-sm font-bold text-gray-500">No trend data available for {cropName}</p>
                </div>
            </div>
        );
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 rounded-xl shadow-xl border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
                    <p className="text-lg font-black text-gray-900">
                        ₹{payload[0].value}
                        <span className="text-xs font-bold text-gray-400 ml-1">/kg</span>
                    </p>
                    <div className="mt-2 text-xs font-medium text-gray-500 space-y-1">
                        <p>Min: ₹{payload[0].payload.min}</p>
                        <p>Max: ₹{payload[0].payload.max}</p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => {
                            const date = new Date(value);
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                        domain={['dataMin - 5', 'dataMax + 5']}
                        tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                        type="monotone"
                        dataKey="avg"
                        stroke="#10b981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorPrice)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default PriceTrendChart;
