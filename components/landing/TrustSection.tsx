import React from 'react';
import { motion } from 'framer-motion';
import { Users, MapPin, Activity, ShieldCheck } from 'lucide-react';

const stats = [
    { icon: Users, label: 'Farmers', value: '10,000+', color: 'bg-green-100 text-green-600' },
    { icon: MapPin, label: 'Cities Covered', value: '50+', color: 'bg-blue-100 text-blue-600' },
    { icon: Activity, label: 'Daily Trades', value: '24/7', color: 'bg-orange-100 text-orange-600' },
    { icon: ShieldCheck, label: 'Secure Payments', value: '100%', color: 'bg-purple-100 text-purple-600' },
];

const TrustSection: React.FC = () => {
    return (
        <section className="py-16 bg-white">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1, duration: 0.6 }}
                            whileHover={{ y: -5 }}
                            className="flex flex-col items-center text-center p-6 rounded-2xl hover:shadow-xl transition-shadow bg-gray-50/50"
                        >
                            <div className={`p-4 rounded-full mb-4 ${stat.color}`}>
                                <stat.icon className="w-8 h-8" />
                            </div>
                            <h3 className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                            <p className="text-gray-500 font-medium">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TrustSection;
