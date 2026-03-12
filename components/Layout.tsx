import React from 'react';
import { UserRole, Language } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants.tsx';
import { useState, useRef, useEffect } from 'react';
import { useRoleTranslate } from '../hooks/useRoleTranslate';
import { useLanguage } from '../context/LanguageContext';
import NotificationCenter from './NotificationCenter';

interface LayoutProps {
  children: React.ReactNode;
  userRole?: UserRole;
  userName?: string;
  userLocation?: string;
  userPhoto?: string;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onNavigateToChat?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, userRole, userName, userLocation, userPhoto, onLogout, activeTab, setActiveTab, onNavigateToChat }) => {

  // Role-based sidebar theming — vibrant light
  const roleTheme = {
    FARMER: {
      sidebar: 'bg-emerald-200 border-r border-emerald-300',
      logo: 'bg-emerald-400 text-white',
      roleText: 'text-emerald-800/70',
      title: 'text-gray-900',
      navActive: 'bg-emerald-300 text-emerald-950',
      navActiveIcon: 'bg-emerald-400/50',
      navInactive: 'text-emerald-900/60 hover:bg-emerald-300/60 hover:text-emerald-950',
      border: 'border-emerald-300/70',
      logout: 'text-emerald-800/50 hover:text-red-600 hover:bg-red-100',
      chevron: 'text-emerald-700/40',
    },
    BUYER: {
      sidebar: 'bg-indigo-200 border-r border-indigo-300',
      logo: 'bg-indigo-400 text-white',
      roleText: 'text-indigo-800/70',
      title: 'text-gray-900',
      navActive: 'bg-indigo-300 text-indigo-950',
      navActiveIcon: 'bg-indigo-400/50',
      navInactive: 'text-indigo-900/60 hover:bg-indigo-300/60 hover:text-indigo-950',
      border: 'border-indigo-300/70',
      logout: 'text-indigo-800/50 hover:text-red-600 hover:bg-red-100',
      chevron: 'text-indigo-700/40',
    },
    TRANSPORTER: {
      sidebar: 'bg-amber-200 border-r border-amber-300',
      logo: 'bg-amber-400 text-white',
      roleText: 'text-amber-800/70',
      title: 'text-gray-900',
      navActive: 'bg-amber-300 text-amber-950',
      navActiveIcon: 'bg-amber-400/50',
      navInactive: 'text-amber-900/60 hover:bg-amber-300/60 hover:text-amber-950',
      border: 'border-amber-300/70',
      logout: 'text-amber-800/50 hover:text-red-600 hover:bg-red-100',
      chevron: 'text-amber-700/40',
    },
  } as const;

  const theme = roleTheme[userRole as keyof typeof roleTheme] ?? {
    sidebar: 'bg-white border-r border-gray-100',
    logo: 'bg-green-200 text-green-800',
    roleText: 'text-gray-500',
    title: 'text-gray-900',
    navActive: 'bg-green-100 text-green-900',
    navActiveIcon: 'bg-green-200/60',
    navInactive: 'text-gray-500 hover:bg-green-100/50 hover:text-gray-700',
    border: 'border-gray-200/40',
    logout: 'text-gray-500 hover:text-red-500 hover:bg-red-50',
    chevron: 'text-green-600/40',
  };
  const { t, language } = useRoleTranslate();
  const { setLanguage } = useLanguage();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);



  const getNavItems = () => {
    switch (userRole) {
      case UserRole.FARMER:
        return [
          { id: 'home', icon: 'fa-house', label: t('common.home') },
          { id: 'orders', icon: 'fa-box', label: t('farmer.my_orders') || 'Orders' },
          { id: 'listings', icon: 'fa-wheat-awn', label: t('farmer.my_listings') },
          { id: 'chats', icon: 'fa-comments', label: 'Chats' },
          { id: 'prices', icon: 'fa-chart-line', label: t('farmer.market_prices') },
          { id: 'analytics', icon: 'fa-chart-pie', label: 'Analytics' },
          { id: 'earnings', icon: 'fa-wallet', label: t('farmer.earnings') },
          { id: 'account', icon: 'fa-user', label: t('farmer.profile') },
        ];
      case UserRole.BUYER:
        return [
          { id: 'home', icon: 'fa-search', label: t('common.home') },
          { id: 'orders', icon: 'fa-receipt', label: t('buyer.my_orders') },
          { id: 'payments', icon: 'fa-wallet', label: 'Payments' },
          { id: 'chats', icon: 'fa-comments', label: 'Chats' },
          { id: 'wishlist', icon: 'fa-heart', label: 'My Wishlist' },
          { id: 'profile', icon: 'fa-user', label: t('buyer.profile') },
        ];
      case UserRole.TRANSPORTER:
        return [
          { id: 'home', icon: 'fa-search-location', label: 'Find Loads' },
          { id: 'my_deliveries', icon: 'fa-truck-fast', label: 'My Deliveries' },
          { id: 'earnings', icon: 'fa-wallet', label: t('transporter.earnings') },
          { id: 'vehicle', icon: 'fa-car', label: t('transporter.profile') },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - Desktop Only */}
      <aside className={`hidden md:flex flex-col w-72 fixed h-full z-50 transition-all duration-300 ${theme.sidebar}`}>
        <div className={`p-8 border-b ${theme.border}`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${theme.logo}`}>
              <i className="fas fa-leaf text-2xl"></i>
            </div>
            <div>
              <h1 className={`font-black text-2xl tracking-tighter ${theme.title}`}>KisanSetu</h1>
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${theme.roleText}`}>{userRole ? t(`${userRole.toLowerCase()}.role_name`) : ''}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-1 overflow-y-auto">
          {getNavItems().map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
              }}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all group ${activeTab === item.id ? theme.navActive : theme.navInactive
                }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${activeTab === item.id ? theme.navActiveIcon : 'bg-transparent'
                }`}>
                <i className={`fas ${item.icon} text-base ${activeTab === item.id ? 'scale-110' : ''}`}></i>
              </div>
              <span className="font-black text-xs uppercase tracking-widest">{item.label}</span>
              {activeTab === item.id && (
                <i className={`fas fa-chevron-right ml-auto text-[10px] ${theme.chevron}`}></i>
              )}
            </button>
          ))}
        </nav>

        <div className={`p-6 border-t ${theme.border} mt-auto`}>
          <button
            onClick={onLogout}
            className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl transition-all font-black uppercase text-[10px] tracking-widest ${theme.logout}`}
          >
            <i className="fas fa-power-off"></i> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col md:ml-72 min-w-0 transition-all duration-300">

        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b px-4 py-3 flex justify-between items-center sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white shadow-md">
              <i className="fas fa-leaf text-xl"></i>
            </div>
            <div>
              <h1 className="font-black text-lg leading-tight tracking-tight">KisanSetu</h1>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em]">{userRole ? t(`${userRole.toLowerCase()}.role_name`) : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={`w-10 h-10 rounded-full ${userPhoto ? '' : 'bg-gray-100'} flex items-center justify-center text-gray-700 font-bold shadow-sm border border-gray-200 active:scale-95 transition-all overflow-hidden`}
              >
                {userPhoto ? (
                  <img src={userPhoto} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  userName?.charAt(0) || 'U'
                )}
              </button>

              {isProfileOpen && (
                <div className="absolute top-full right-0 mt-3 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl shadow-gray-200/50 border border-white/20 overflow-hidden z-[100] animate-in zoom-in-95 slide-in-from-top-2 duration-200 origin-top-right">
                  <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${userPhoto ? '' : 'bg-gray-200'} flex items-center justify-center text-[10px] font-black text-gray-500 overflow-hidden shrink-0`}>
                      {userPhoto ? (
                        <img src={userPhoto} alt={userName} className="w-full h-full object-cover" />
                      ) : (
                        userName?.charAt(0) || 'U'
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{userName || 'User'}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{userRole}</p>
                    </div>
                  </div>

                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => {
                        const tab = userRole === UserRole.FARMER ? 'account' : userRole === UserRole.BUYER ? 'profile' : 'vehicle';
                        setActiveTab(tab);
                        setIsProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                        <i className="fas fa-user-pen"></i>
                      </div>
                      Edit Profile
                    </button>

                    <button
                      onClick={() => setIsLangOpen(!isLangOpen)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                          <i className="fas fa-language"></i>
                        </div>
                        <span>Language</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <span className="uppercase text-[9px] tracking-wider font-extrabold">{language}</span>
                        <i className={`fas fa-chevron-right text-[9px] transition-transform ${isLangOpen ? 'rotate-90' : ''}`}></i>
                      </div>
                    </button>

                    {isLangOpen && (
                      <div className="bg-gray-50 rounded-xl mx-2 my-1 p-1 space-y-1">
                        {SUPPORTED_LANGUAGES.map((langItem) => (
                          <button
                            key={langItem.code}
                            onClick={() => {
                              setLanguage(langItem.code as Language);
                              setIsLangOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold rounded-lg transition-colors ${language === langItem.code ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200/50'}`}
                          >
                            {langItem.native}
                            {language === langItem.code && <i className="fas fa-check"></i>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-2 border-t border-gray-50 mt-1">
                    <button
                      onClick={onLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                        <i className="fas fa-power-off"></i>
                      </div>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Desktop Top Bar */}
        <header className="hidden md:flex bg-white/80 backdrop-blur-xl border-b border-gray-100 px-8 py-4 justify-between items-center sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-gray-800 tracking-tight">
              {getNavItems().find(i => i.id === activeTab)?.label || 'Dashboard'}
            </h2>
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer active:scale-95"
              >
                <i className="fas fa-globe text-gray-400 text-[10px]"></i>
                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
                  {SUPPORTED_LANGUAGES.find(l => l.code === language)?.name || 'English'}
                </span>
                <i className={`fas fa-chevron-down text-[8px] text-gray-400 transition-transform ${isLangOpen ? 'rotate-180' : ''}`}></i>
              </button>

              {isLangOpen && (
                <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fadeIn">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code as Language);
                        setIsLangOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-xs font-medium hover:bg-green-50 transition-colors flex items-center justify-between ${language === lang.code ? 'text-green-600 bg-green-50/50' : 'text-gray-600'
                        }`}
                    >
                      <span className="font-bold">{lang.native}</span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">{lang.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <NotificationCenter />
            <div className="text-right">
              <p className="text-sm font-black text-gray-900 leading-none mb-0.5">{userName}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{userLocation || 'Bharat'}</p>
            </div>
            <div className={`w-10 h-10 ${userPhoto ? '' : 'bg-gray-900'} text-white rounded-full flex items-center justify-center font-black shadow-lg shadow-gray-200 overflow-hidden`}>
              {userPhoto ? (
                <img src={userPhoto} alt={userName} className="w-full h-full object-cover" />
              ) : (
                userName?.charAt(0) || 'U'
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-grow p-2.5 md:p-8 overflow-x-hidden pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {/* Floating Action Button (Mobile) */}
      {userRole === UserRole.FARMER && (
        <div className="md:hidden fixed bottom-24 right-4 z-50 animate-slide-up delay-100">
          <button
            type="button"
            title="Add Listing"
            onClick={() => setActiveTab('listings')}
            className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full shadow-lg shadow-green-900/20 flex items-center justify-center text-white active:scale-90 hover:scale-105 transition-all duration-300 border border-green-400/30 backdrop-blur-sm"
          >
            <i className="fas fa-plus text-xl drop-shadow-md"></i>
          </button>
        </div>
      )}

      {/* Floating Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-6 left-2 right-2 h-16 bg-gradient-to-br from-white/85 via-white/70 to-[#e9ecef]/85 backdrop-blur-2xl border border-gray-200/60 rounded-full flex items-center justify-between px-3 z-50 shadow-2xl shadow-gray-900/10 overflow-hidden no-scrollbar gap-1 animate-slide-up">
        {
          getNavItems().filter(item => !(userRole === UserRole.FARMER && item.id === 'account')).map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative flex-shrink-0 flex flex-col items-center justify-center w-10 h-10 rounded-full transition-all duration-300 active:scale-90 ${isActive ? 'bg-gray-900/5 text-gray-900 shadow-[0_0_15px_rgba(17,24,39,0.08)]' : 'text-gray-500 hover:text-gray-800'
                  }`}
              >
                <i className={`fas ${item.icon} text-lg mb-0.5 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(17,24,39,0.12)]' : ''}`}></i>
                {isActive && (
                  <span className="absolute -bottom-1 w-1 h-1 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.6)]"></span>
                )}
              </button>
            )
          })
        }
      </nav>
    </div>
  );
};

export default Layout;
