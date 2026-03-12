import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';

const testimonials = [
    {
        name: 'Rajesh Kumar',
        role: 'Farmer, Punjab',
        text: 'KisanSetu changed my life. I sold my entire harvest of wheat at 20% higher rates than the local mandi directly to a buyer in Delhi.',
        rating: 5,
    },
    {
        name: 'Anita Desai',
        role: 'Wholesale Buyer, Mumbai',
        text: 'The quality of produce I get here is unmatched. Direct negotiation means I verify the quality before I pay. The transparency is amazing.',
        rating: 5,
    },
    {
        name: 'Vikram Singh',
        role: 'Transporter, Haryana',
        text: 'I get regular trips now. The app is easy to use and payments are always on time. Highly recommended for fleet owners.',
        rating: 4,
    },
];

const Testimonials: React.FC = () => {
    const [current, setCurrent] = useState(0);

    const next = () => setCurrent((curr) => (curr + 1) % testimonials.length);
    const prev = () => setCurrent((curr) => (curr - 1 + testimonials.length) % testimonials.length);

    // Auto-advance
    useEffect(() => {
        const timer = setInterval(next, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <section className="py-20 bg-green-50">
            <div className="container mx-auto px-4 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12">Stories of Success</h2>

                <div className="relative max-w-4xl mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={current}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.5 }}
                            className="bg-white p-10 rounded-3xl shadow-xl border border-green-100 relative"
                        >
                            <Quote className="absolute top-6 left-6 w-10 h-10 text-green-200" />

                            <div className="flex flex-col items-center">
                                <div className="flex gap-1 mb-6">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`w-5 h-5 ${i < testimonials[current].rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                        />
                                    ))}
                                </div>

                                <p className="text-xl md:text-2xl text-gray-700 italic mb-8 leading-relaxed">
                                    "{testimonials[current].text}"
                                </p>

                                <div>
                                    <h4 className="font-bold text-lg text-gray-900">{testimonials[current].name}</h4>
                                    <p className="text-green-600 font-medium">{testimonials[current].role}</p>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    <button
                        onClick={prev}
                        className="absolute top-1/2 left-0 md:-left-12 transform -translate-y-1/2 p-3 bg-white rounded-full shadow-md text-gray-600 hover:text-green-600 transition-colors z-10"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    <button
                        onClick={next}
                        className="absolute top-1/2 right-0 md:-right-12 transform -translate-y-1/2 p-3 bg-white rounded-full shadow-md text-gray-600 hover:text-green-600 transition-colors z-10"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </section>
    );
};

export default Testimonials;
