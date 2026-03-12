import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, MessageSquare, Truck } from 'lucide-react';

const features = [
    {
        icon: ShoppingBag,
        title: 'Direct Farmer Listings',
        desc: 'Farmers list their produce directly. No middlemen, better prices.',
        color: 'bg-green-500',
    },
    {
        icon: MessageSquare,
        title: 'Real-Time Negotiation',
        desc: 'Chat directly with buyers to negotiate prices and quantity instantly.',
        color: 'bg-blue-500',
    },
    {
        icon: Truck,
        title: 'Live Delivery Tracking',
        desc: 'Track your shipment in real-time from farm to doorstep.',
        color: 'bg-orange-500',
    },
];

const FeaturesSection: React.FC = () => {
    return (
        <section className="py-20 bg-gray-50">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Choose KisanSetu?</h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        We provide the technology to make agriculture profitable and efficient.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.2, duration: 0.6 }}
                            whileHover={{ y: -10 }}
                            className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100"
                        >
                            <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg`}>
                                <feature.icon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                            <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeaturesSection;
