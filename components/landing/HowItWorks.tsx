import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Search, MessageCircle, Truck } from 'lucide-react';

const steps = [
    {
        icon: UserPlus,
        title: 'Farmer Lists Produce',
        desc: 'Farmers upload details about their crops, quantity, and expected price.',
    },
    {
        icon: Search,
        title: 'Buyer Finds & Negotiates',
        desc: 'Buyers browse listings and chat with farmers to agree on a fair price.',
    },
    {
        icon: MessageCircle,
        title: 'Secure Payment',
        desc: 'Payments are held securely until the produce is verified.',
    },
    {
        icon: Truck,
        title: 'Live Delivery Tracking',
        desc: 'Transporters pick up the goods, and you track them in real-time.',
    },
];

const HowItWorks: React.FC = () => {
    return (
        <section className="py-20 bg-white overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
                    <p className="text-gray-600">Your journey from farm to market in 4 simple steps.</p>
                </div>

                <div className="relative">
                    {/* Vertical Line for Desktop */}
                    <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-green-100 rounded-full"></div>

                    <div className="space-y-12">
                        {steps.map((step, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className={`flex flex-col md:flex-row items-center ${index % 2 === 0 ? 'md:flex-row-reverse' : ''
                                    } gap-8`}
                            >
                                <div className="flex-1 w-full text-center md:text-left">
                                    <div className={`p-6 bg-white rounded-3xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow ${index % 2 !== 0 ? 'md:mr-auto' : 'md:ml-auto'} max-w-lg mx-auto md:mx-0`}>
                                        <div className={` md:hidden w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-4`}>
                                            <step.icon className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                                        <p className="text-gray-600">{step.desc}</p>
                                    </div>
                                </div>

                                {/* Center Icon for Desktop */}
                                <div className="hidden md:flex flex-shrink-0 w-12 h-12 bg-green-600 rounded-full items-center justify-center text-white z-10 shadow-lg border-4 border-white">
                                    <step.icon className="w-6 h-6" />
                                </div>

                                <div className="flex-1 w-full hidden md:block"></div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;
