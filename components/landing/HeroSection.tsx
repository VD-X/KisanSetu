import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Leaf, TrendingUp, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const HeroSection: React.FC = () => {
    return (
        <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-[#F0FDF4]">
            {/* Animated Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-200/50 rounded-full blur-3xl animate-blob"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-200/50 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
                <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-yellow-100/50 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
            </div>

            <div className="container mx-auto px-4 z-10 relative flex flex-col items-center text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="max-w-4xl"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm mb-6 border border-green-100">
                        <Leaf className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Revolutionizing Agriculture in India</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight mb-6">
                        Cultivating Prosperity, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-green-800">
                            Seed by Seed, Deal by Deal
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Empowering Bharat's farmers with direct market access, transparent pricing,
                        and guaranteed payments. Because your hard work deserves a fair harvest.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link to="/select-role">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-8 py-4 bg-green-600 text-white rounded-full font-bold text-lg shadow-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                            >
                                Start Selling <ArrowRight className="w-5 h-5" />
                            </motion.button>
                        </Link>

                        <Link to="/market">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-8 py-4 bg-white text-gray-800 rounded-full font-bold text-lg shadow-md hover:shadow-lg border border-gray-100 transition-all flex items-center gap-2"
                            >
                                Explore Marketplace <TrendingUp className="w-5 h-5 text-gray-500" />
                            </motion.button>
                        </Link>
                    </div>
                </motion.div>

                {/* Floating Icons/Elements for aesthetics */}
                <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="absolute top-10 left-10 md:left-20 text-green-600/20"
                >
                    <Leaf className="w-12 h-12" />
                </motion.div>

                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-20 right-10 md:right-20 text-orange-500/20"
                >
                    <ShieldCheck className="w-16 h-16" />
                </motion.div>
            </div>

            {/* CSS for custom blob animation (can be in global css, but inline style works for now if tailwind config not touched) */}
            <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
        </section>
    );
};

export default HeroSection;
