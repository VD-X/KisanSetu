import React, { useState, useEffect } from 'react';
import { adminService } from '../../../services/adminService';
import { Search, Filter, Ban, CheckCircle, Package, User, IndianRupee, Scale, Calendar, ChevronRight, Eye, ShieldAlert, Wheat } from 'lucide-react';

const ListingModeration: React.FC = () => {
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<any>({});
    const [selectedListing, setSelectedListing] = useState<any>(null);

    const fetchListings = async () => {
        setLoading(true);
        try {
            const params: any = { page };
            if (statusFilter !== 'ALL') params.status = statusFilter;

            const res = await adminService.getListings(params);
            setListings(res.listings || res);
            setPagination(res.pagination || {});
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchListings();
    }, [statusFilter, page]);

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            await adminService.updateListingStatus(id, newStatus);
            fetchListings();
        } catch (err) {
            alert("Action failed");
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const colors: any = {
            'AVAILABLE': 'bg-emerald-100 text-emerald-700 font-bold',
            'DISABLED': 'bg-red-100 text-red-700 font-bold',
            'SOLD': 'bg-blue-100 text-blue-700 font-bold',
        };
        return (
            <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-emerald-500" />
                        Listing Moderation
                    </h2>
                    <p className="text-xs text-gray-500 font-medium mt-1">Review and manage platform crop listings</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by crop or farmer..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="bg-gray-50 border-none rounded-xl text-sm px-4 py-2 focus:ring-2 focus:ring-emerald-500/20"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">All Status</option>
                        <option value="AVAILABLE">Active</option>
                        <option value="DISABLED">Flagged/Disabled</option>
                        <option value="SOLD">Sold Out</option>
                    </select>
                </div>
            </div>

            {/* Content Tabler */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Crop Listing</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Farmer</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inventory & Price</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse"><td colSpan={5} className="px-6 py-8"><div className="h-4 bg-gray-50 rounded w-full" /></td></tr>
                                ))
                            ) : listings.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">No listings found.</td></tr>
                            ) : listings.map((l) => (
                                <tr key={l.id} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-3xl transition-transform group-hover:rotate-12">
                                                {l.crop?.icon || '🌾'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{l.crop?.name}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Variety: {l.variety || 'Standard'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-gray-800 flex items-center gap-2"><User className="w-3 h-3 text-gray-400" /> {l.farmer?.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{l.location?.district}, {l.location?.state}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                                                <Scale className="w-3 h-3 text-emerald-500" /> {l.quantity} {l.unit}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm font-black text-gray-900">
                                                <IndianRupee className="w-3.5 h-3.5 text-gray-400" /> {l.expectedPrice.toLocaleString()} <span className="text-[10px] text-gray-400 font-bold">/ {l.unit}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={l.status} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setSelectedListing(l)}
                                                className="p-2 rounded-xl text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            {l.status !== 'DISABLED' ? (
                                                <button
                                                    onClick={() => handleUpdateStatus(l.id, 'DISABLED')}
                                                    className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                                    title="Flag / Disable Listing"
                                                >
                                                    <Ban className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleUpdateStatus(l.id, 'AVAILABLE')}
                                                    className="p-2 rounded-xl text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all"
                                                    title="Resolve / Activate"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedListing && (
                <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="h-40 bg-gray-50 relative flex items-center justify-center overflow-hidden">
                            {selectedListing.images?.[0] ? (
                                <img src={selectedListing.images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <Wheat className="w-20 h-20 text-gray-200" />
                            )}
                            <button
                                onClick={() => setSelectedListing(null)}
                                className="absolute top-4 right-4 p-2 rounded-full bg-black/20 text-white backdrop-blur-md hover:bg-black/40 transition-all"
                            >
                                <ChevronRight className="w-5 h-5 rotate-90" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900">{selectedListing.crop?.name}</h2>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Listing ID: {selectedListing.id.slice(-8).toUpperCase()}</p>
                                </div>
                                <StatusBadge status={selectedListing.status} />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expected Price</p>
                                    <p className="text-lg font-black text-emerald-600">₹{selectedListing.expectedPrice} / {selectedListing.unit}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Available Qty</p>
                                    <p className="text-lg font-black text-gray-800">{selectedListing.quantity} {selectedListing.unit}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Harvested On</p>
                                    <p className="text-sm font-bold text-gray-800 flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" /> {new Date(selectedListing.expiryDate).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-2xl">
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Farmer Information</h3>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center font-bold text-gray-400">
                                            {selectedListing.farmer?.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{selectedListing.farmer?.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400">{selectedListing.farmer?.email}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-gray-800">{selectedListing.location?.village}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">{selectedListing.location?.district}, {selectedListing.location?.state}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 flex gap-4">
                                {selectedListing.status === 'AVAILABLE' ? (
                                    <button
                                        onClick={() => { handleUpdateStatus(selectedListing.id, 'DISABLED'); setSelectedListing(null); }}
                                        className="flex-1 px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Ban className="w-4 h-4" /> Disable Listing
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => { handleUpdateStatus(selectedListing.id, 'AVAILABLE'); setSelectedListing(null); }}
                                        className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle className="w-4 h-4" /> Activate Listing
                                    </button>
                                )}
                                <button className="px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all">Report Issue</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ListingModeration;
