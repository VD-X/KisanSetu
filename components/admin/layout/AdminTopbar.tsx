import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, Globe, LogOut, ChevronDown, User } from 'lucide-react';
import { useLanguage, SUPPORTED_LANGUAGES, Language } from '../../../context/LanguageContext';

interface AdminTopbarProps {
    activeTab: string;
}

const AdminTopbar: React.FC<AdminTopbarProps> = ({ activeTab }) => {
    const { language, setLanguage } = useLanguage();
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [isAccountOpen, setIsAccountOpen] = useState(false);
    const langRef = useRef<HTMLDivElement>(null);
    const accountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (langRef.current && !langRef.current.contains(event.target as Node)) setIsLangOpen(false);
            if (accountRef.current && !accountRef.current.contains(event.target as Node)) setIsAccountOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    return (
        <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 flex items-center justify-between px-8 sticky top-0 z-40">
            {/* Left Section: Page Search */}
            <div className="flex items-center gap-6">
                <h1 className="text-xl font-bold text-gray-800 capitalize">{activeTab}</h1>
                <div className="relative group hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search anything..."
                        className="pl-10 pr-4 py-2 bg-gray-100 rounded-xl text-sm border-none focus:ring-2 focus:ring-emerald-500/20 w-64 transition-all"
                    />
                </div>
            </div>

            {/* Right Section: Actions */}
            <div className="flex items-center gap-4">
                {/* Language Selector */}
                <div className="relative" ref={langRef}>
                    <button
                        onClick={() => setIsLangOpen(!isLangOpen)}
                        className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-600 transition-all flex items-center gap-2 border border-transparent hover:border-gray-200"
                    >
                        <Globe className="w-5 h-5" />
                        <span className="text-sm font-medium hidden sm:block">
                            {SUPPORTED_LANGUAGES.find(l => l.code === language)?.name}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isLangOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            {SUPPORTED_LANGUAGES.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => {
                                        setLanguage(lang.code as Language);
                                        setIsLangOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 transition-colors flex items-center justify-between ${language === lang.code ? 'text-emerald-600 bg-emerald-50/50' : 'text-gray-600'}`}
                                >
                                    <span className="font-medium">{lang.native}</span>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase">{lang.code}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Notifications */}
                <button className="relative p-2.5 rounded-xl hover:bg-gray-100 text-gray-600 transition-all group">
                    <Bell className="w-5 h-5 group-hover:shake" />
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white shadow-sm shadow-red-500/20" />
                </button>

                <div className="w-px h-6 bg-gray-200 mx-2" />

                {/* Account Section */}
                <div className="relative" ref={accountRef}>
                    <button
                        onClick={() => setIsAccountOpen(!isAccountOpen)}
                        className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-gray-100 transition-all"
                    >
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/10">
                            A
                        </div>
                        <div className="hidden lg:block text-left">
                            <p className="text-sm font-semibold text-gray-800">Administrator</p>
                            <p className="text-[10px] text-gray-500 font-medium">Status: Online</p>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isAccountOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isAccountOpen && (
                        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="px-4 py-2 border-b border-gray-100 mb-2">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Account</p>
                                <p className="text-sm font-semibold text-gray-800">admin@kisansetu.com</p>
                            </div>
                            <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors flex items-center gap-3">
                                <User className="w-4 h-4" /> Profile Settings
                            </button>
                            <button
                                onClick={handleLogout}
                                className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3 mt-2 border-t border-gray-50 pt-3"
                            >
                                <LogOut className="w-4 h-4" /> Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default AdminTopbar;
