import React from 'react';
import { LucideIcon, LayoutDashboard, Users, UserCog, Truck, Wheat, Banknote, ShieldAlert, Package, TrendingUp, Settings, ScrollText, ChevronLeft, LogOut, Bell, Globe } from 'lucide-react';

interface SidebarItemProps {
    id: string;
    label: string;
    icon: LucideIcon;
    active: string;
    onClick: (id: string) => void;
    isCollapsed: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ id, label, icon: Icon, active, onClick, isCollapsed }) => {
    const isActive = active === id;

    return (
        <button
            onClick={() => onClick(id)}
            className={`
                relative w-full group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                ${isActive
                    ? 'bg-emerald-600/10 text-emerald-500 shadow-sm shadow-emerald-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
            `}
        >
            {isActive && (
                <div className="absolute left-0 w-1 h-6 bg-emerald-500 rounded-r-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            )}

            <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />

            {!isCollapsed && (
                <span className="font-medium whitespace-nowrap overflow-hidden transition-all duration-300">
                    {label}
                </span>
            )}

            {/* Tooltip for collapsed state */}
            {isCollapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                    {label}
                </div>
            )}
        </button>
    );
};

interface AdminSidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeTab, setActiveTab, isCollapsed, setIsCollapsed }) => {
    const mainNav = [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'farmers', label: 'Farmers', icon: Users },
        { id: 'buyers', label: 'Buyers', icon: UserCog },
        { id: 'transporters', label: 'Transporters', icon: Truck },
        { id: 'crops', label: 'Crop Master', icon: Wheat },
        { id: 'prices', label: 'Market Prices', icon: Banknote },
        { id: 'listings', label: 'Moderation', icon: ShieldAlert },
        { id: 'orders', label: 'Orders', icon: Package },
        { id: 'finance', label: 'Earnings', icon: Banknote },
        { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    ];

    const bottomNav = [
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'audit', label: 'Audit Logs', icon: ScrollText },
    ];

    return (
        <aside className={`
            flex flex-col h-screen bg-[#0F172A] text-gray-300 transition-all duration-300 border-r border-white/5 relative
            ${isCollapsed ? 'w-20' : 'w-64'}
        `}>
            {/* Logo Section */}
            <div className="p-6 flex items-center justify-between">
                {!isCollapsed && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Wheat className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white tracking-tight">KisanSetu</span>
                    </div>
                )}
                {isCollapsed && (
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                        <Wheat className="w-5 h-5 text-white" />
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar py-4">
                {mainNav.map((item) => (
                    <SidebarItem
                        key={item.id}
                        {...item}
                        active={activeTab}
                        onClick={setActiveTab}
                        isCollapsed={isCollapsed}
                    />
                ))}

                <div className="my-6 mx-4 border-t border-white/5" />

                {bottomNav.map((item) => (
                    <SidebarItem
                        key={item.id}
                        {...item}
                        active={activeTab}
                        onClick={setActiveTab}
                        isCollapsed={isCollapsed}
                    />
                ))}
            </nav>

            {/* Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-12 w-6 h-6 bg-white rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:text-emerald-500 hover:border-emerald-500 transition-all shadow-sm z-50"
            >
                <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
            </button>

            {/* User Profile Mini */}
            <div className="p-4 mt-auto border-t border-white/5 bg-white/2 cursor-pointer hover:bg-white/5 transition-all">
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-lg">
                        A
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">Administrator</p>
                            <p className="text-xs text-gray-500 truncate">Super Admin</p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default AdminSidebar;
