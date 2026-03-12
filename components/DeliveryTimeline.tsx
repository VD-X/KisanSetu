import React from 'react';

interface TimelineStep {
    status: string;
    label: string;
    icon: string;
    description?: string;
    date?: string;
}

interface DeliveryTimelineProps {
    currentStatus: string;
    role: 'FARMER' | 'BUYER' | 'TRANSPORTER';
}

const STEPS_FARMER: TimelineStep[] = [
    { status: 'WAITING_FOR_TRANSPORTER', label: 'Looking for Driver', icon: 'fa-magnifying-glass', description: 'Broadcasting to nearby trucks' },
    { status: 'TRANSPORTER_ASSIGNED', label: 'Driver Assigned', icon: 'fa-truck-fast', description: 'Vehicle is en route to farm' },
    { status: 'PICKED_UP', label: 'Harvest Loaded', icon: 'fa-boxes-packing', description: 'Goods handed over to driver' },
    { status: 'IN_TRANSIT', label: 'In Transit', icon: 'fa-route', description: 'Shipment moving to buyer' },
    { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: 'fa-box-open', description: 'Nearing destination' },
    { status: 'DELIVERED', label: 'Delivered & Completed', icon: 'fa-check-double', description: 'Handover complete' }
];

const STEPS_TRANSPORTER: TimelineStep[] = [
    { status: 'WAITING_FOR_TRANSPORTER', label: 'Job Opportunity', icon: 'fa-bell', description: 'New load available' },
    { status: 'TRANSPORTER_ASSIGNED', label: 'Job Accepted', icon: 'fa-file-signature', description: 'You accepted this route' },
    { status: 'PICKED_UP', label: 'Cargo Loaded', icon: 'fa-truck-ramp-box', description: 'Pickup confirmed at farm' },
    { status: 'IN_TRANSIT', label: 'On Route', icon: 'fa-road', description: 'Driving to destination' },
    { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: 'fa-box-open', description: 'Within 5km - ready to deliver' },
    { status: 'DELIVERED', label: 'Unloaded & Paid', icon: 'fa-sack-dollar', description: 'Delivery confirmed' }
];

const STEPS_BUYER: TimelineStep[] = [
    { status: 'WAITING_FOR_TRANSPORTER', label: 'Order Confirmed', icon: 'fa-clipboard-check', description: 'We are arranging delivery' },
    { status: 'TRANSPORTER_ASSIGNED', label: 'Driver Found', icon: 'fa-id-card', description: 'Transporter assigned' },
    { status: 'PICKED_UP', label: 'Picked Up', icon: 'fa-box-open', description: 'Left the farm' },
    { status: 'IN_TRANSIT', label: 'Arriving Soon', icon: 'fa-location-dot', description: 'On the way to you' },
    { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: 'fa-truck-ramp-box', description: 'Almost there!' },
    { status: 'DELIVERED', label: 'Received', icon: 'fa-house-circle-check', description: 'Order delivered to you' }
];

const DeliveryTimeline: React.FC<DeliveryTimelineProps> = ({ currentStatus, role }) => {

    let steps = STEPS_FARMER;
    if (role === 'TRANSPORTER') steps = STEPS_TRANSPORTER;
    if (role === 'BUYER') steps = STEPS_BUYER;

    const getStatusIndex = (status: string) => {
        if (!status) return 0;
        const normalized = status.toUpperCase();
        const order = ['WAITING_FOR_TRANSPORTER', 'TRANSPORTER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'];
        const idx = order.indexOf(normalized);
        // Map both DELIVERED and COMPLETED to the final step
        if (idx >= 5) return 5;
        if (idx === -1) return 0;
        return idx;
    };

    const activeIndex = getStatusIndex(currentStatus);
    const progressPercent = Math.max(0, Math.min(100, (activeIndex / (steps.length - 1)) * 100));

    return (
        <div className="relative pl-4 py-4 font-sans">
            {/* Connecting Line - Background */}
            <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-100 rounded-full"></div>

            {/* Connecting Line - Progress (Animated) */}
            <div
                className="absolute left-6 top-6 w-0.5 bg-green-500 transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                style={{ height: `${progressPercent}%`, maxHeight: 'calc(100% - 40px)' }}
            ></div>

            <div className="space-y-8">
                {steps.map((step, index) => {
                    const isActive = index === activeIndex;
                    const isCompleted = index < activeIndex;
                    const isPending = index > activeIndex;

                    return (
                        <div key={index} className={`relative flex items-start gap-4 group transition-all duration-500 ${isPending ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}`}>
                            {/* Icon Circle */}
                            <div className={`
                                w-12 h-12 rounded-full flex items-center justify-center text-lg z-10 border-4 transition-all duration-500 relative
                                ${isActive ? 'bg-green-600 text-white border-green-200 shadow-[0_0_20px_rgba(22,163,74,0.4)] scale-110' : ''}
                                ${isCompleted ? 'bg-green-500 text-white border-white scale-100 shadow-md' : ''}
                                ${isPending ? 'bg-white text-gray-300 border-gray-100' : ''}
                            `}>
                                <i className={`fas ${isCompleted ? 'fa-check' : step.icon} ${isActive ? 'animate-pulse' : ''}`}></i>

                                {isActive && (
                                    <span className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping opacity-20"></span>
                                )}
                            </div>

                            {/* Content */}
                            <div className={`mt-1 transition-all duration-500 ${isActive ? 'translate-x-2' : ''}`}>
                                <h4 className={`text-sm font-black uppercase tracking-widest transition-colors ${isActive ? 'text-green-700' : isCompleted ? 'text-gray-800' : 'text-gray-400'}`}>
                                    {step.label}
                                </h4>
                                {(isActive || isCompleted) && step.description && (
                                    <p className={`text-[10px] font-bold mt-1 transition-all ${isActive ? 'text-green-600' : 'text-gray-400'}`}>
                                        {step.description}
                                    </p>
                                )}
                                {isActive && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce delay-100"></span>
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce delay-200"></span>
                                        <span className="text-[9px] font-black uppercase text-green-500 tracking-widest ml-1">Processing</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DeliveryTimeline;
