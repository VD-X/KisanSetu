import React, { useState, useEffect } from 'react';
import { adminService } from '../../../services/adminService';
import { Settings, Percent, Bell, Globe, Shield, Save, Plus, Trash2, Megaphone, CheckCircle } from 'lucide-react';

const SettingsView: React.FC = () => {
    const [settings, setSettings] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('platform');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await adminService.getSettings();
                setSettings(res || {});
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        try {
            await adminService.updateSettings(settings);
            alert("Settings saved successfully!");
        } catch (err) {
            alert("Save failed");
        }
    };

    if (loading) return <div className="h-96 bg-gray-100 rounded-3xl animate-pulse" />;

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Controls */}
            <div className="w-full lg:w-72 space-y-2">
                {[
                    { id: 'platform', label: 'Platform Fees', icon: Percent },
                    { id: 'announcements', label: 'Announcements', icon: Megaphone },
                    { id: 'roles', label: 'Admin Roles', icon: Shield },
                    { id: 'localization', label: 'Localization', icon: Globe },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${activeSection === item.id ? 'bg-[#0F172A] text-white shadow-xl' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                    >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm min-h-[600px] flex flex-col">
                <div className="flex justify-between items-center mb-10">
                    <h2 className="text-2xl font-black text-gray-900 capitalize">{activeSection.replace('-', ' ')}</h2>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
                    >
                        <Save className="w-4 h-4" /> Save Changes
                    </button>
                </div>

                {activeSection === 'platform' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-gray-700">Platform Commission (%)</label>
                                <div className="relative">
                                    <Percent className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="number"
                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl font-black text-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                                        value={settings.commission || 12.5}
                                        onChange={(e) => setSettings({ ...settings, commission: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <p className="text-xs text-gray-400 font-medium">Standard fee applied to all successful transactions.</p>
                            </div>
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-gray-700">TDS / Tax Rate (%)</label>
                                <div className="relative">
                                    <Percent className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="number"
                                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl font-black text-gray-900 focus:ring-2 focus:ring-emerald-500/20"
                                        value={settings.taxRate || 5.0}
                                        onChange={(e) => setSettings({ ...settings, taxRate: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-gray-50 space-y-6">
                            <h3 className="font-bold text-gray-800">Withdrawal Limits</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                                    <p className="text-xs font-bold text-emerald-600 uppercase mb-2">Minimum Payout</p>
                                    <p className="text-2xl font-black text-emerald-700">₹500.00</p>
                                </div>
                                <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                                    <p className="text-xs font-bold text-blue-600 uppercase mb-2">Max Single Payout</p>
                                    <p className="text-2xl font-black text-blue-700">₹50,000.00</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'announcements' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 flex-1 flex flex-col">
                        <div className="flex-1 space-y-4">
                            {[1, 2].map((i) => (
                                <div key={i} className="p-5 border border-gray-100 rounded-3xl group relative hover:border-emerald-500/20 transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            <h4 className="font-bold text-gray-800">Update on Wheat Procurement Prices</h4>
                                        </div>
                                        <button className="p-1.5 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 font-medium">Dear Farmers, the market prices for premium grade Sharbati Wheat have been updated. Please check the market section.</p>
                                    <div className="mt-3 flex gap-2">
                                        <span className="px-2 py-0.5 bg-gray-100 rounded-md text-[9px] font-bold text-gray-400 uppercase">FARMERS</span>
                                        <span className="px-2 py-0.5 bg-emerald-50 rounded-md text-[9px] font-bold text-emerald-600 uppercase flex items-center gap-1"><CheckCircle className="w-2 h-2" /> ACTIVE</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full py-4 bg-gray-50 text-gray-500 font-bold rounded-2xl border-2 border-dashed border-gray-200 hover:bg-gray-100 hover:border-emerald-500/20 transition-all flex items-center justify-center gap-2">
                            <Plus className="w-5 h-5" /> New Announcement
                        </button>
                    </div>
                )}

                {activeSection === 'roles' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 flex-1">
                        <div className="bg-[#0F172A] p-6 rounded-3xl text-white mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-2xl font-bold shadow-lg shadow-emerald-500/20">A</div>
                                <div>
                                    <h4 className="text-lg font-black italic">Super Administration</h4>
                                    <p className="text-xs text-gray-400 font-medium">Full access to all modules and configurations</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {['Platform Moderator', 'Support Executive', 'Finance Auditor'].map(role => (
                                <div key={role} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-emerald-50/30 transition-all border border-transparent hover:border-emerald-100">
                                    <div className="flex items-center gap-3">
                                        <Shield className="w-4 h-4 text-emerald-600" />
                                        <span className="text-sm font-bold text-gray-700">{role}</span>
                                    </div>
                                    <button className="text-xs font-bold text-emerald-600 hover:underline">Config Permissions</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeSection === 'localization' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-gray-700">Default Platform Language</label>
                            <select className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500/20">
                                <option>English (International)</option>
                                <option>Hindi (भारत)</option>
                                <option>Telugu (తెలుగు)</option>
                            </select>
                        </div>
                        <div className="pt-6 border-t border-gray-50">
                            <h4 className="text-sm font-bold text-gray-800 mb-4">Supported Regional Dialects</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {['Hindi', 'Marathi', 'Gujarati', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Punjabi'].map(lang => (
                                    <div key={lang} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-xs font-bold font-medium text-gray-600">{lang}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsView;
