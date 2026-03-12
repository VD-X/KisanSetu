import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const Navbar: React.FC = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setIsOpen(false);
        }
    };

    return (
        <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'}`}>
            <div className="container mx-auto px-4 flex justify-between items-center">
                {/* Logo */}
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">K</div>
                    <span className={`text-2xl font-bold tracking-tight ${isScrolled ? 'text-gray-900' : 'text-gray-900'}`}>Kisan<span className="text-green-600">Setu</span></span>
                </div>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-8">
                    <button onClick={() => scrollToSection('features')} className="text-gray-600 hover:text-green-600 font-medium transition-colors">Features</button>
                    <button onClick={() => scrollToSection('how-it-works')} className="text-gray-600 hover:text-green-600 font-medium transition-colors">How it Works</button>
                    <button onClick={() => scrollToSection('testimonials')} className="text-gray-600 hover:text-green-600 font-medium transition-colors">Testimonials</button>
                </div>

                {/* Auth Buttons */}
                <div className="hidden md:flex items-center gap-4">
                    <Link to="/login" className="text-gray-700 hover:text-green-600 font-bold transition-colors">Login</Link>
                    <Link to="/select-role" className="px-5 py-2.5 bg-green-600 text-white rounded-full font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-200">
                        Get Started
                    </Link>
                </div>

                {/* Mobile Menu Toggle */}
                <button className="md:hidden text-gray-700" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-lg py-6 px-4 flex flex-col gap-4 border-t border-gray-100">
                    <button onClick={() => scrollToSection('features')} className="text-left text-gray-700 font-medium py-2">Features</button>
                    <button onClick={() => scrollToSection('how-it-works')} className="text-left text-gray-700 font-medium py-2">How it Works</button>
                    <button onClick={() => scrollToSection('testimonials')} className="text-left text-gray-700 font-medium py-2">Testimonials</button>
                    <hr />
                    <Link to="/login" className="text-center py-3 text-gray-700 font-bold bg-gray-50 rounded-lg">Login</Link>
                    <Link to="/select-role" className="text-center py-3 bg-green-600 text-white font-bold rounded-lg shadow-md">Get Started</Link>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
