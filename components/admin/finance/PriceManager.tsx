import React, { useState, useEffect } from 'react';
import { adminService } from '../../../services/adminService';
import { IndianRupee, TrendingUp, TrendingDown, Wheat, Search, Filter, RefreshCw, Plus, Edit3, Save, X } from 'lucide-react';

const PriceManager: React.FC = () => {
    const [prices, setPrices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPrice, setEditingPrice] = useState<any>(null);
    const [form, setForm] = useState({
        cropId: '',
        variety: '',
        district: '',
        state: '',
        minPrice: 0,
        maxPrice: 0,
        modalPrice: 0
    });
    const [crops, setCrops] = useState<any[]>([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [priceData, cropData] = await Promise.all([
                adminService.getMarketPrices({}),
                adminService.getCrops()
            ]);
            setPrices(priceData);
            setCrops(cropData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleRefresh = async () => {
        setLoading(true);
        try {
            await adminService.refreshPrices();
            loadData();
        } catch (err) {
            alert("Refresh failed");
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingPrice) {
                await adminService.updateMarketPrice(editingPrice.id, form);
            } else {
                await adminService.createMarketPrice(form);
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            alert("Save failed");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <IndianRupee className="w-5 h-5 text-emerald-500" />
                        Market Price Control
                    </h2>
                    <p className="text-xs text-gray-500 font-medium mt-1">Manage MSP and daily market rates across regions</p>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={handleRefresh}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-200 transition-all"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Sync APC Markets
                    </button>
                    <button
                        onClick={() => { setEditingPrice(null); setShowModal(true); }}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Manual Update
                    </button>
                </div>
            </div>

            {/* Price Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? (
                    [...Array(8)].map((_, i) => <div key={i} className="h-48 bg-gray-100 rounded-3xl animate-pulse" />)
                ) : prices.map((p) => {
                    const trend = Math.random() > 0.5 ? 'UP' : 'DOWN';
                    return (
                        <div key={p.id} className="group bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-emerald-500/20 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                        {p.crop?.icon || '🌾'}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900">{p.crop?.name}</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{p.district}, {p.state}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setEditingPrice(p); setForm(p); setShowModal(true); }}
                                    className="p-1.5 text-gray-300 hover:text-emerald-500 transition-colors"
                                >
                                    <Edit3 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Modal Price</p>
                                        <p className="text-lg font-black text-gray-900">₹{p.modalPrice.toLocaleString()}</p>
                                    </div>
                                    <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${trend === 'UP' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                        {trend === 'UP' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                        {trend === 'UP' ? '+2.4%' : '-1.8%'}
                                    </div>
                                </div>

                                <div className="flex justify-between text-center px-2">
                                    <div>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase">Min</p>
                                        <p className="text-xs font-bold text-gray-700">₹{p.minPrice.toLocaleString()}</p>
                                    </div>
                                    <div className="w-px h-6 bg-gray-100 self-center" />
                                    <div>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase">Max</p>
                                        <p className="text-xs font-bold text-gray-700">₹{p.maxPrice.toLocaleString()}</p>
                                    </div>
                                    <div className="w-px h-6 bg-gray-100 self-center" />
                                    <div>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase">Unit</p>
                                        <p className="text-xs font-bold text-gray-700">Quintal</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl font-black text-gray-900">{editingPrice ? 'Edit Market Price' : 'New Price Entry'}</h3>
                                <button onClick={() => setShowModal(false)} className="p-2 rounded-full hover:bg-gray-100 transition-all">
                                    <X className="w-6 h-6 text-gray-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Crop</label>
                                        <select
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20"
                                            value={form.cropId}
                                            onChange={(e) => setForm({ ...form, cropId: e.target.value })}
                                        >
                                            <option value="">Select Crop</option>
                                            {crops.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">State</label>
                                        <input
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20"
                                            value={form.state}
                                            onChange={(e) => setForm({ ...form, state: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">District</label>
                                        <input
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20"
                                            value={form.district}
                                            onChange={(e) => setForm({ ...form, district: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-50">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Min Price</label>
                                        <input
                                            type="number"
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 text-center"
                                            value={form.minPrice}
                                            onChange={(e) => setForm({ ...form, minPrice: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Max Price</label>
                                        <input
                                            type="number"
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 text-center"
                                            value={form.maxPrice}
                                            onChange={(e) => setForm({ ...form, maxPrice: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Modal Price</label>
                                        <input
                                            type="number"
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-black text-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-center"
                                            value={form.modalPrice}
                                            onChange={(e) => setForm({ ...form, modalPrice: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Save className="w-5 h-5" /> {editingPrice ? 'Update Entry' : 'Publish Price'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PriceManager;
