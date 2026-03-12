import React, { useState, useEffect } from 'react';
import { adminService } from '../../../services/adminService';
import { Wheat, Plus, Search, Edit3, Trash2, Globe, CheckCircle, Ban, X } from 'lucide-react';

const CropManager: React.FC = () => {
    const [crops, setCrops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCrop, setEditingCrop] = useState<any>(null);
    const [form, setForm] = useState({
        name: '',
        category: '',
        icon: '🌾',
        translations: { hindi: '', telugu: '', tamil: '', kannada: '' }
    });

    const loadCrops = async () => {
        setLoading(true);
        try {
            const data = await adminService.getCrops();
            setCrops(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadCrops(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCrop) {
                await adminService.updateCrop(editingCrop.id, form);
            } else {
                await adminService.createCrop(form);
            }
            setShowModal(false);
            setEditingCrop(null);
            setForm({ name: '', category: '', icon: '🌾', translations: { hindi: '', telugu: '', tamil: '', kannada: '' } });
            loadCrops();
        } catch (err) {
            alert("Failed to save crop");
        }
    };

    const toggleStatus = async (crop: any) => {
        try {
            await adminService.updateCrop(crop.id, { isActive: !crop.isActive });
            loadCrops();
        } catch (err) {
            alert("Status update failed");
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900">Crop Master Database</h2>
                    <p className="text-sm font-medium text-gray-500 mt-1">Manage global crop catalog and translations</p>
                </div>
                <button
                    onClick={() => { setEditingCrop(null); setForm({ name: '', category: '', icon: '🌾', translations: { hindi: '', telugu: '', tamil: '', kannada: '' } }); setShowModal(true); }}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> Add New Crop
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {loading ? (
                    [...Array(8)].map((_, i) => <div key={i} className="h-64 bg-gray-100 rounded-3xl animate-pulse" />)
                ) : crops.map((crop) => (
                    <div key={crop.id} className={`group bg-white p-6 rounded-3xl border-2 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 ${crop.isActive ? 'border-gray-50 hover:border-emerald-500/20' : 'border-red-50 bg-red-50/20'}`}>
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-4xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                                {crop.icon}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => { setEditingCrop(crop); setForm({ ...crop, translations: crop.translations || {} }); setShowModal(true); }}
                                    className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                                >
                                    <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => toggleStatus(crop)}
                                    className={`p-2 rounded-xl transition-all ${crop.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                >
                                    {crop.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-gray-900">{crop.name}</h3>
                            <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{crop.category}</span>
                        </div>

                        <div className="mt-6 space-y-3 pt-6 border-t border-gray-50 text-xs">
                            <p className="font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Globe className="w-3 h-3" /> Translations
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(crop.translations || {}).map(([lang, val]: any) => val && (
                                    <div key={lang} className="bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 flex items-center gap-2">
                                        <span className="font-black text-emerald-600 uppercase text-[9px]">{lang.slice(0, 2)}</span>
                                        <span className="font-bold text-gray-700">{val}</span>
                                    </div>
                                ))}
                                {!Object.values(crop.translations || {}).some(v => v) && <span className="text-gray-400 italic">No translations added.</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl font-black text-gray-900">{editingCrop ? 'Edit Crop Details' : 'Add New Master Crop'}</h3>
                                <button onClick={() => setShowModal(false)} className="p-2 rounded-full hover:bg-gray-100 transition-all">
                                    <X className="w-6 h-6 text-gray-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Crop Name (English)</label>
                                        <input
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20"
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Category</label>
                                        <input
                                            required
                                            placeholder="Grains, Vegetables..."
                                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20"
                                            value={form.category}
                                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Emoji Icon</label>
                                        <input
                                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-lg text-center focus:ring-2 focus:ring-emerald-500/20"
                                            value={form.icon}
                                            onChange={(e) => setForm({ ...form, icon: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-gray-50">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Regional Translations</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        {['hindi', 'telugu', 'tamil', 'kannada'].map((lang) => (
                                            <div key={lang}>
                                                <label className="block text-[10px] font-bold text-gray-500 capitalize mb-1.5 ml-1">{lang}</label>
                                                <input
                                                    className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500/20"
                                                    value={(form.translations as any)[lang]}
                                                    onChange={(e) => setForm({ ...form, translations: { ...form.translations, [lang]: e.target.value } })}
                                                />
                                            </div>
                                        ))}
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
                                        className="flex-1 py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
                                    >
                                        {editingCrop ? 'Update Master Crop' : 'Create Master Crop'}
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

export default CropManager;
