import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const CallToAction: React.FC = () => {
    return (
        <section className="py-24 bg-gradient-to-br from-green-900 via-green-800 to-green-900 text-white relative overflow-hidden">
            {/* Decorative Circles */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-green-700 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-yellow-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

            <div className="container mx-auto px-4 text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">Be Part of India’s Agri Revolution</h2>
                    <p className="text-xl text-green-100 mb-10 max-w-2xl mx-auto">
                        Join thousands of farmers and buyers who are trading smarter, faster, and better with KisanSetu.
                    </p>

                    <Link to="/select-role">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-10 py-5 bg-white text-green-900 font-bold rounded-full shadow-2xl hover:bg-gray-100 transition-colors inline-flex items-center gap-2 text-lg"
                        >
                            Join KisanSetu Today <ArrowRight className="w-5 h-5" />
                        </motion.button>
                    </Link>
                </motion.div>
            </div>
        </section>
    );
};

export default CallToAction;
