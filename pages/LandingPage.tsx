import React from 'react';
import Navbar from '../components/landing/Navbar';
import HeroSection from '../components/landing/HeroSection';
import TrustSection from '../components/landing/TrustSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import HowItWorks from '../components/landing/HowItWorks';
import MapPreview from '../components/landing/MapPreview';
import Testimonials from '../components/landing/Testimonials';
import CallToAction from '../components/landing/CallToAction';
import Footer from '../components/landing/Footer';

const LandingPage: React.FC = () => {
    return (
        <div className="font-sans text-gray-900 bg-white">
            <Navbar />
            <section id="hero"><HeroSection /></section>
            <TrustSection />
            <section id="features"><FeaturesSection /></section>
            <section id="how-it-works"><HowItWorks /></section>
            <MapPreview />
            <section id="testimonials"><Testimonials /></section>
            <CallToAction />
            <Footer />
        </div>
    );
};

export default LandingPage;
