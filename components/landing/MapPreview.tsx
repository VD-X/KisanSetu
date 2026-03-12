import React from 'react';
import { motion } from 'framer-motion';

const MapPreview: React.FC = () => {
    return (
        <section className="py-20 bg-gray-900 text-white overflow-hidden relative">
            <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover bg-center"></div>

            <div className="container mx-auto px-4 relative z-10 flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1 text-center md:text-left">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
                        Real-Time <span className="text-green-400">Live Tracking</span>
                    </h2>
                    <p className="text-gray-400 text-lg mb-8 max-w-lg mx-auto md:mx-0">
                        Watch your produce move across the map in real-time. Know exactly when it will arrive.
                        Integrated with advanced GPS & route optimization.
                    </p>

                    <div className="flex gap-4 justify-center md:justify-start">
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold text-white">98%</span>
                            <span className="text-sm text-gray-500">On-Time</span>
                        </div>
                        <div className="w-[1px] bg-gray-700 h-10"></div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold text-white">Live</span>
                            <span className="text-sm text-gray-500">Updates</span>
                        </div>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="flex-1 w-full max-w-2xl"
                >
                    <div className="relative bg-gray-800 rounded-2xl p-4 shadow-2xl border border-gray-700 aspect-video overflow-hidden group">
                        {/* Mock Map UI */}
                        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                            <div className="w-full h-full bg-gray-700 opacity-50 relative">
                                {/* Grid lines mock */}
                                <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 gap-[1px] bg-gray-800 opacity-20">
                                    {[...Array(24)].map((_, i) => <div key={i} className="bg-transparent" />)}
                                </div>
                                {/* Path */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                    <motion.path
                                        d="M 50 150 Q 150 50 350 100 T 550 200"
                                        fill="transparent"
                                        stroke="#16A34A"
                                        strokeWidth="4"
                                        strokeDasharray="10 5"
                                        initial={{ pathLength: 0 }}
                                        whileInView={{ pathLength: 1 }}
                                        transition={{ duration: 2, ease: "easeInOut" }}
                                    />
                                </svg>

                                <motion.div
                                    className="absolute w-4 h-4 bg-green-500 rounded-full shadow-[0_0_20px_rgba(22,163,74,0.8)] z-10"
                                    animate={{ offsetDistance: "100%" }}
                                    style={{ offsetPath: "path('M 50 150 Q 150 50 350 100 T 550 200')" }}
                                    transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }}
                                />
                            </div>
                        </div>

                        {/* UI Overlay */}
                        <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/10 text-sm">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="font-semibold">Shipment #KS-2901</span>
                            </div>
                            <div className="text-gray-400 text-xs">Arriving in 25 mins</div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default MapPreview;
