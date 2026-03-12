import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">K</div>
                            <span className="text-2xl font-bold text-white">Kisan<span className="text-green-500">Setu</span></span>
                        </div>
                        <p className="text-sm">
                            Empowering Indian farmers with technology, market access, and transparent pricing.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-4">Platform</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#" className="hover:text-white transition-colors">For Farmers</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">For Buyers</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">For Transporters</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-4">Company</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-800 pt-8 text-center text-sm">
                    © {new Date().getFullYear()} KisanSetu. All rights reserved. Made with ❤️ for India.
                </div>
            </div>
        </footer>
    );
}

export default Footer;
