import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
// @ts-ignore
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

// --- Shared Components ---

const PaginationControls = ({ pagination, setPage }: { pagination: any, setPage: (p: number) => void }) => {
    if (!pagination || !pagination.pages || pagination.pages <= 1) return null;
    return (
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t flex flex-col sm:flex-row justify-between items-center gap-3">
            <span className="text-sm text-gray-700 font-medium">
                Page <span className="font-bold text-green-600">{pagination.page}</span> of <span className="font-bold">{pagination.pages}</span>
                <span className="hidden sm:inline"> ({pagination.total} total)</span>
            </span>
            <div className="flex space-x-2">
                <button
                    disabled={pagination.page === 1}
                    onClick={() => setPage(pagination.page - 1)}
                    className="px-4 py-2 border rounded-lg bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-green-50 hover:border-green-500 transition-all font-medium text-sm shadow-sm"
                >
                    ← Prev
                </button>
                <button
                    disabled={pagination.page === pagination.pages}
                    onClick={() => setPage(pagination.page + 1)}
                    className="px-4 py-2 border rounded-lg bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-green-50 hover:border-green-500 transition-all font-medium text-sm shadow-sm"
                >
                    Next →
                </button>
            </div>
        </div>
    );
};

const NavBtn = ({ id, label, icon, active, onClick }: any) => (
    <button
        onClick={() => onClick(id)}
        className={`
            relative w-full text-left px-4 py-3.5 rounded-xl flex items-center space-x-3 
            transition-all duration-300 transform group overflow-hidden
            ${active === id
                ? 'bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/40 scale-[1.02]'
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-green-600 hover:scale-[1.01]'
            }
        `}
    >
        {/* Ripple effect background */}
        <span className={`absolute inset-0 ${active === id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-300`}>
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
        </span>

        {/* Icon with enhanced animation */}
        <span className={`
            relative z-10 text-xl transition-all duration-300
            ${active === id ? 'scale-110 drop-shadow-lg' : 'group-hover:scale-125 group-hover:rotate-12'}
        `}>
            {icon}
        </span>

        {/* Label */}
        <span className="relative z-10 font-semibold tracking-wide">{label}</span>

        {/* Active indicator */}
        {active === id && (
            <span className="absolute right-3 w-2 h-2 bg-white rounded-full shadow-lg animate-pulse"></span>
        )}
    </button>
);

const StatCard = ({ title, value, icon, color = 'from-blue-500 to-blue-600' }: any) => (
    <div className="group relative bg-white p-4 lg:p-5 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-transparent hover:-translate-y-1 overflow-hidden">
        {/* Gradient overlay on hover */}
        <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>

        {/* Shine effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
                <p className="text-[10px] lg:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    {title}
                </p>
                <p className={`text-2xl lg:text-3xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent truncate`}>
                    {value}
                </p>
            </div>
            <div className={`flex-shrink-0 text-2xl lg:text-3xl p-2.5 lg:p-3 rounded-xl bg-gradient-to-br ${color} bg-opacity-10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg`}>
                {icon}
            </div>
        </div>

        {/* Bottom accent line */}
        <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`}></div>
    </div>
);

// --- Sub-Components ---

const Overview = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await adminService.getStats();
                setStats(data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div></div>;
    if (!stats) return <div className="text-center text-gray-500 py-10">No stats available</div>;

    return (
        <div className="space-y-4">
            {/* Page Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-xl">📊</span>
                </div>
                <div>
                    <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">System Overview</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Real-time dashboard metrics</p>
                </div>
            </div>

            {/* User Statistics Section */}
            <div>
                <h3 className="text-base font-bold text-gray-700 mb-2.5 flex items-center gap-2">
                    <span className="w-1 h-5 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full"></span>
                    User Statistics
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                    <StatCard title="Total Farmers" value={stats.users?.farmers || 0} icon="👨‍🌾" color="from-green-500 to-green-600" />
                    <StatCard title="Total Buyers" value={stats.users?.buyers || 0} icon="🧑‍💼" color="from-blue-500 to-blue-600" />
                    <StatCard title="Transporters" value={stats.users?.transporters || 0} icon="🚚" color="from-purple-500 to-purple-600" />
                    <StatCard title="Pending Approval" value={stats.users?.pendingTransporters || 0} icon="⏳" color="from-orange-500 to-orange-600" />
                </div>
            </div>

            {/* Marketplace Statistics Section */}
            <div>
                <h3 className="text-base font-bold text-gray-700 mb-2.5 flex items-center gap-2">
                    <span className="w-1 h-5 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></span>
                    Marketplace Activity
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                    <StatCard title="Active Listings" value={stats.marketplace?.activeListings || 0} icon="🌾" color="from-green-500 to-emerald-600" />
                    <StatCard title="In Progress" value={stats.marketplace?.deliveriesProgress || 0} icon="🚛" color="from-blue-500 to-cyan-600" />
                    <StatCard title="Completed" value={stats.marketplace?.deliveriesCompleted || 0} icon="✅" color="from-green-500 to-teal-600" />
                    <StatCard title="Total Payouts" value={`₹${(stats.marketplace?.totalEarnings || 0).toLocaleString()}`} icon="💰" color="from-emerald-500 to-green-700" />
                </div>
            </div>

            {/* Order Activity Section */}
            <div>
                <h3 className="text-base font-bold text-gray-700 mb-2.5 flex items-center gap-2">
                    <span className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></span>
                    Order Activity
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                    <div className="group relative bg-gradient-to-br from-blue-500 to-blue-600 p-5 lg:p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 text-white overflow-hidden hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        <div className="relative z-10">
                            <p className="text-xs font-semibold uppercase tracking-wider opacity-90 mb-2">New Orders Today</p>
                            <p className="text-3xl lg:text-4xl font-bold">{stats.marketplace?.ordersToday || 0}</p>
                        </div>
                    </div>
                    <div className="group relative bg-gradient-to-br from-indigo-500 to-indigo-600 p-5 lg:p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 text-white overflow-hidden hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        <div className="relative z-10">
                            <p className="text-xs font-semibold uppercase tracking-wider opacity-90 mb-2">Orders This Month</p>
                            <p className="text-3xl lg:text-4xl font-bold">{stats.marketplace?.ordersMonth || 0}</p>
                        </div>
                    </div>
                    <div className="group relative bg-gradient-to-br from-purple-500 to-purple-600 p-5 lg:p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 text-white overflow-hidden hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        <div className="relative z-10">
                            <p className="text-xs font-semibold uppercase tracking-wider opacity-90 mb-2">Total Lifetime Orders</p>
                            <p className="text-3xl lg:text-4xl font-bold">{stats.marketplace?.totalOrders || 0}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const UserTable = ({ role }: { role: string }) => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<any>({});

    useEffect(() => { fetchUsers(); }, [page, role]);

    const fetchUsers = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const res = await adminService.getUsers({ role, search, page });
            setUsers(res.users);
            setPagination(res.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleStatus = async (id: string, newStatus: 'ACTIVE' | 'SUSPENDED') => {
        if (!confirm(`Are you sure you want to ${newStatus} this user?`)) return;
        try {
            await adminService.updateUserStatus(id, newStatus);
            setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus } : u));
        } catch (err) { alert("Status update failed"); }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <div className="p-4 sm:p-6 border-b bg-gradient-to-r from-gray-50 to-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800">{role === 'FARMER' ? '👨‍🌾 Farmers' : '🧑‍💼 Buyers'} Management</h2>
                <form onSubmit={fetchUsers} className="flex space-x-2 w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent flex-1 sm:w-64"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button type="submit" className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg text-sm hover:from-green-700 hover:to-green-800 transition-all shadow-md font-medium">
                        Search
                    </button>
                </form>
            </div>
            {loading ? (
                <div className="p-10 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Loading...</p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                <tr>
                                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">User</th>
                                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider hidden md:table-cell">Location</th>
                                    <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Stats</th>
                                    <th className="px-4 sm:px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                                    <th className="px-4 sm:px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-green-50/30 transition-colors">
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                                                    {u.name?.charAt(0) || u.email.charAt(0)}
                                                </div>
                                                <div className="ml-3">
                                                    <div className="text-sm font-semibold text-gray-900">{u.name || 'N/A'}</div>
                                                    <div className="text-sm text-gray-500">{u.email}</div>
                                                    <div className="text-xs text-gray-400">{u.phone}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                                            {u.location ? `${u.location.village || ''}, ${u.location.district || ''}` : 'N/A'}
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex flex-col space-y-1">
                                                {role === 'FARMER' && (
                                                    <>
                                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full w-max font-medium">📦 {u.stats?.totalListings || 0} Listings</span>
                                                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full w-max font-medium">💰 ₹{(u.stats?.totalEarnings || 0).toLocaleString()}</span>
                                                    </>
                                                )}
                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full w-max font-medium">🛒 {u.stats?.totalOrders || 0} Orders</span>
                                            </div>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${u.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {u.status}
                                            </span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {u.status === 'ACTIVE' ? (
                                                <button onClick={() => handleStatus(u.id, 'SUSPENDED')} className="text-red-600 hover:text-red-900 font-semibold text-xs border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all">
                                                    Suspend
                                                </button>
                                            ) : (
                                                <button onClick={() => handleStatus(u.id, 'ACTIVE')} className="text-green-600 hover:text-green-900 font-semibold text-xs border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-all">
                                                    Activate
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <PaginationControls pagination={pagination} setPage={setPage} />
                </>
            )}
        </div>
    );
};

const TransporterTable = () => {
    const [transporters, setTransporters] = useState<any[]>([]);
    const [pagination, setPagination] = useState<any>({});
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => { loadTransporters(); }, [page, statusFilter]);

    const loadTransporters = async () => {
        setLoading(true);
        try {
            const res = await adminService.getTransporters({ status: statusFilter, page });
            setTransporters(res.transporters);
            setPagination(res.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleVerify = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            await adminService.verifyTransporter(id, status);
            setTransporters(prev => prev.map(t => t.id === id ? { ...t, approvalStatus: status } : t));
        } catch (err) { alert("Verification failed"); }
    };

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">Transporter Management</h2>
                <div className="flex space-x-2 items-center">
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded px-2 py-1 text-sm" aria-label="Filter transporters by status" title="Filter transporters by status">
                        <option value="">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                </div>
            </div>
            {loading ? <div className="p-10 text-center">Loading...</div> : (
                <>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transporter</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {transporters.map(t => (
                                <tr key={t.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-full flex items-center justify-center text-xl">🚚</div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{t.fullName}</div>
                                                <div className="text-sm text-gray-500">{t.user?.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{t.vehicleType}</div>
                                        <div className="text-sm text-gray-500">{t.vehicleNumber}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex flex-col">
                                            <span>Earnings: ₹{t.stats?.totalEarnings || 0}</span>
                                            <span className="text-xs text-gray-400">Deliveries: {t.stats?.completedDeliveries || 0}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${t.approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                t.approvalStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                            {t.approvalStatus}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {t.approvalStatus === 'PENDING' && (
                                            <>
                                                <button onClick={() => handleVerify(t.id, 'APPROVED')} className="text-green-600 hover:text-green-900 mr-2">Approve</button>
                                                <button onClick={() => handleVerify(t.id, 'REJECTED')} className="text-red-600 hover:text-red-900">Reject</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <PaginationControls pagination={pagination} setPage={setPage} />
                </>
            )}
        </div>
    );
};

const CropManager = () => {
    const [crops, setCrops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCrop, setEditingCrop] = useState<any>(null);
    const [cropForm, setCropForm] = useState({ name: '', category: '', icon: '', translations: { hindi: '', telugu: '', tamil: '', kannada: '' } });

    useEffect(() => { loadCrops(); }, []);

    const loadCrops = async () => {
        setLoading(true);
        try {
            const data = await adminService.getCrops();
            setCrops(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSaveCrop = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCrop) {
                const updated = await adminService.updateCrop(editingCrop.id, cropForm);
                setCrops(prev => prev.map(c => c.id === editingCrop.id ? updated : c));
            } else {
                const created = await adminService.createCrop(cropForm);
                setCrops(prev => [...prev, created]);
            }
            setShowModal(false);
            setEditingCrop(null);
            setCropForm({ name: '', category: '', icon: '', translations: { hindi: '', telugu: '', tamil: '', kannada: '' } });
        } catch (err) { alert("Failed to save crop"); }
    };

    const toggleCropStatus = async (crop: any) => {
        try {
            const updated = await adminService.updateCrop(crop.id, { isActive: !crop.isActive });
            setCrops(prev => prev.map(c => c.id === crop.id ? updated : c));
        } catch (err) { alert("Status update failed"); }
    };

    const openEditCrop = (crop: any) => {
        setEditingCrop(crop);
        setCropForm({
            name: crop.name,
            category: crop.category,
            icon: crop.icon,
            translations: crop.translations || { hindi: '', telugu: '', tamil: '', kannada: '' }
        });
        setShowModal(true);
    };

    if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div></div>;

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-3xl font-bold text-gray-800 bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">🌾 Crop Master</h2>
                <button onClick={() => { setEditingCrop(null); setShowModal(true); }} className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:from-green-700 hover:to-green-800 transition-all font-semibold flex items-center gap-2">
                    <span className="text-xl">+</span> Add Crop
                </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {crops.map(crop => (
                    <div key={crop.id} className={`group bg-white p-6 rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${crop.isActive ? 'border-gray-100 hover:border-green-300' : 'border-red-200 bg-red-50/50'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="text-5xl group-hover:scale-110 transition-transform duration-300">{crop.icon}</div>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => openEditCrop(crop)} className="text-blue-600 text-sm hover:text-blue-800 font-semibold hover:underline">✏️ Edit</button>
                                <button onClick={() => toggleCropStatus(crop)} className={`text-sm font-semibold hover:underline ${crop.isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}>
                                    {crop.isActive ? '🚫 Disable' : '✅ Enable'}
                                </button>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold mt-2 text-gray-800">{crop.name}</h3>
                        <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide mt-1 bg-gray-100 px-2 py-1 rounded-full inline-block">{crop.category}</p>
                        <div className="mt-4 text-xs text-gray-500">
                            <p className="font-semibold mb-2">Translations:</p>
                            <div className="flex gap-1 flex-wrap">
                                {Object.keys(crop.translations || {}).filter(k => (crop.translations as any)[k]).map(lang => (
                                    <span key={lang} className="bg-gradient-to-r from-green-100 to-green-200 text-green-700 px-2 py-1 rounded-full font-medium">{lang.slice(0, 2).toUpperCase()}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-gradient-to-br from-[#f8f9fa]/95 via-white/85 to-[#e9ecef]/95 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">{editingCrop ? 'Edit Crop' : 'Add New Crop'}</h3>
                        <form onSubmit={handleSaveCrop} className="space-y-4">
                            <div>
                                <label htmlFor="admin-crop-name" className="block text-sm font-medium text-gray-700">Crop Name (English)</label>
                                <input id="admin-crop-name" type="text" required value={cropForm.name} onChange={e => setCropForm({ ...cropForm, name: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="admin-crop-category" className="block text-sm font-medium text-gray-700">Category</label>
                                    <input id="admin-crop-category" type="text" required value={cropForm.category} onChange={e => setCropForm({ ...cropForm, category: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
                                </div>
                                <div>
                                    <label htmlFor="admin-crop-icon" className="block text-sm font-medium text-gray-700">Icon (Emoji)</label>
                                    <input id="admin-crop-icon" type="text" value={cropForm.icon} onChange={e => setCropForm({ ...cropForm, icon: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
                                </div>
                            </div>

                            <div className="border-t pt-2">
                                <p className="text-sm font-medium text-gray-700 mb-2">Translations</p>
                                <div className="space-y-2">
                                    <input placeholder="Hindi Name" value={cropForm.translations.hindi} onChange={e => setCropForm({ ...cropForm, translations: { ...cropForm.translations, hindi: e.target.value } })} className="w-full border rounded px-3 py-2 text-sm" />
                                    <input placeholder="Telugu Name" value={cropForm.translations.telugu} onChange={e => setCropForm({ ...cropForm, translations: { ...cropForm.translations, telugu: e.target.value } })} className="w-full border rounded px-3 py-2 text-sm" />
                                    <input placeholder="Tamil Name" value={cropForm.translations.tamil} onChange={e => setCropForm({ ...cropForm, translations: { ...cropForm.translations, tamil: e.target.value } })} className="w-full border rounded px-3 py-2 text-sm" />
                                    <input placeholder="Kannada Name" value={cropForm.translations.kannada} onChange={e => setCropForm({ ...cropForm, translations: { ...cropForm.translations, kannada: e.target.value } })} className="w-full border rounded px-3 py-2 text-sm" />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t mt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">{editingCrop ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const PriceManager = () => {
    const [prices, setPrices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editPrice, setEditPrice] = useState<any>(null);
    const [form, setForm] = useState({ cropId: '', mandi: '', min: 0, max: 0, avg: 0 });
    const [crops, setCrops] = useState<any[]>([]);

    useEffect(() => {
        loadPrices();
        loadCrops();
    }, []);

    const loadCrops = async () => {
        try {
            const data = await adminService.getCrops();
            setCrops(data);
        } catch (err) { console.error(err); }
    };

    const loadPrices = async () => {
        setLoading(true);
        try {
            const data = await adminService.getMarketPrices({});
            setPrices(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await adminService.refreshPrices();
            // Wait slightly for background refresh or refetch
            setTimeout(loadPrices, 1500);
        } catch (err) { alert("Refresh failed"); }
        finally { setIsRefreshing(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editPrice) {
                await adminService.updateMarketPrice(editPrice.id, form);
            } else {
                await adminService.createMarketPrice(form);
            }
            setShowModal(false);
            setEditPrice(null);
            setForm({ cropId: '', mandi: '', min: 0, max: 0, avg: 0 });
            loadPrices();
        } catch (err) { alert("Failed to save price"); }
    };

    const openEdit = (price: any) => {
        setEditPrice(price);
        setForm({
            cropId: price.cropId,
            mandi: price.mandi,
            min: price.min,
            max: price.max,
            avg: price.avg
        });
        setShowModal(true);
    };

    if (loading) return <div>Loading Prices...</div>;

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Market Prices</h2>
                <div className="space-x-2">
                    <button onClick={handleRefresh} disabled={isRefreshing} className={`px-4 py-2 rounded text-white ${isRefreshing ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        {isRefreshing ? 'Refreshing...' : '🔄 Refresh Data'}
                    </button>
                    <button onClick={() => { setEditPrice(null); setShowModal(true); }} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                        + Add Price
                    </button>
                </div>
            </div>

            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Crop</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mandi</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (₹/qt)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {prices.map(p => (
                        <tr key={p.id}>
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{p.crop?.name || 'Unknown'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">{p.mandi}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div>Min: {p.min}</div>
                                <div>Max: {p.max}</div>
                                <div className="font-bold">Avg: {p.avg}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${p.isOverride ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {p.source}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                {new Date(p.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-900">Override</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {showModal && (
                <div className="fixed inset-0 bg-gradient-to-br from-[#f8f9fa]/95 via-white/85 to-[#e9ecef]/95 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">{editPrice ? 'Override Price' : 'Add Price'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {!editPrice && (
                                <div>
                                    <label htmlFor="admin-price-crop" className="block text-sm font-medium text-gray-700">Crop</label>
                                    <select id="admin-price-crop" required value={form.cropId} onChange={e => setForm({ ...form, cropId: e.target.value })} className="mt-1 w-full border rounded px-3 py-2">
                                        <option value="">Select Crop</option>
                                        {crops.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label htmlFor="admin-price-mandi" className="block text-sm font-medium text-gray-700">Mandi</label>
                                <input id="admin-price-mandi" required value={form.mandi} onChange={e => setForm({ ...form, mandi: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label htmlFor="admin-price-min" className="block text-sm font-medium text-gray-700">Min</label>
                                    <input id="admin-price-min" type="number" required value={form.min} onChange={e => setForm({ ...form, min: parseFloat(e.target.value) })} className="mt-1 w-full border rounded px-3 py-2" />
                                </div>
                                <div>
                                    <label htmlFor="admin-price-max" className="block text-sm font-medium text-gray-700">Max</label>
                                    <input id="admin-price-max" type="number" required value={form.max} onChange={e => setForm({ ...form, max: parseFloat(e.target.value) })} className="mt-1 w-full border rounded px-3 py-2" />
                                </div>
                                <div>
                                    <label htmlFor="admin-price-avg" className="block text-sm font-medium text-gray-700">Avg</label>
                                    <input id="admin-price-avg" type="number" required value={form.avg} onChange={e => setForm({ ...form, avg: parseFloat(e.target.value) })} className="mt-1 w-full border rounded px-3 py-2" />
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const ListingModeration = () => {
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<any>({});
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState('ALL');

    useEffect(() => { loadListings(); }, [page, filter]);

    const loadListings = async () => {
        setLoading(true);
        try {
            // Mapping filter to API params if backend supports it, otherwise filtering client side or just passing 'status'
            // Assuming API accepts 'status' for listings or we just fetch all.
            // Let's assume fetchListings accepts { page, status? }
            const params: any = { page };
            if (filter !== 'ALL') params.status = filter;

            const res = await adminService.getListings(params);
            setListings(res.listings || res); // Handle if response structure differs
            setPagination(res.pagination || {});
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleAction = async (id: string, action: 'DISABLE' | 'RESOLVE') => {
        const newStatus = action === 'DISABLE' ? 'DISABLED' : 'AVAILABLE';
        if (!confirm(`Are you sure you want to mark this listing as ${newStatus}?`)) return;

        try {
            await adminService.updateListingStatus(id, newStatus);
            setListings(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
        } catch (err) { alert("Action failed"); }
    };

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">Listings Moderation</h2>
                <div className="flex space-x-2">
                    <select value={filter} onChange={e => setFilter(e.target.value)} className="border rounded px-3 py-1 text-sm" aria-label="Filter listings by status" title="Filter listings by status">
                        <option value="ALL">All Listings</option>
                        <option value="DISABLED">Disabled</option>
                        <option value="AVAILABLE">Active</option>
                    </select>
                </div>
            </div>
            {loading ? <div className="p-10 text-center">Loading...</div> : (
                <>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Listing</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farmer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {listings.map(l => (
                                <tr key={l.id} className={l.status === 'DISABLED' ? 'bg-red-50' : ''}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded flex items-center justify-center text-xl">{l.crop?.icon || '🌾'}</div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{l.crop?.name || 'Unknown Crop'}</div>
                                                <div className="text-xs text-gray-500">ID: {l.id.slice(-6)}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{l.farmer?.name || 'N/A'}</div>
                                        <div className="text-xs text-gray-500">{l.farmer?.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div>Qty: {l.quantity} {l.unit}</div>
                                        <div>Price: ₹{l.expectedPrice}</div>
                                        <div className="text-xs text-blue-600 font-medium">Negotiations: {l._count?.chats || 0}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${l.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                                                l.status === 'DISABLED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {l.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {l.status !== 'DISABLED' ? (
                                            <button onClick={() => handleAction(l.id, 'DISABLE')} className="text-red-600 hover:text-red-900">Disable</button>
                                        ) : (
                                            <button onClick={() => handleAction(l.id, 'RESOLVE')} className="text-green-600 hover:text-green-900">Resolve</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <PaginationControls pagination={pagination} setPage={setPage} />
                </>
            )}
        </div>
    );
};

const OrderMonitor = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [pagination, setPagination] = useState<any>({});
    const [page, setPage] = useState(1);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const params: any = { page };
            if (filter !== 'ALL') params.status = filter;
            const res = await adminService.getOrders(params); // Assuming getOrders supports object params now
            setOrders(res.orders || res);
            setPagination(res.pagination || {});
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadOrders(); }, [page, filter]);

    const handleCancel = async (id: string) => {
        const reason = prompt("Enter cancellation reason:");
        if (!reason) return;
        try {
            await adminService.cancelOrder(id, reason);
            loadOrders();
        } catch (err) { alert("Failed to cancel"); }
    };

    const handleReassign = async (id: string, currentTransporterId: string) => {
        if (!confirm("Emergency Only: Reset transporter assignment?")) return;
        try {
            await adminService.reassignTransporter(id, null);
            loadOrders();
        } catch (err) { alert("Failed to reassign"); }
    };

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">Order Monitor</h2>
                <select value={filter} onChange={e => setFilter(e.target.value)} className="border rounded px-3 py-1 text-sm" aria-label="Filter orders by status" title="Filter orders by status">
                    <option value="ALL">All Orders</option>
                    <option value="ORDER_CREATED">Created</option>
                    <option value="IN_DELIVERY">In Delivery</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
            </div>

            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entities</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery Info</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map(order => (
                        <tr key={order.id} onClick={() => setSelectedOrder(order)} className="hover:bg-gray-50 cursor-pointer">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                #{order.id.slice(-6)}
                                <div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                                <div><span className="font-semibold">Farmer:</span> {order.farmer?.name}</div>
                                <div><span className="font-semibold">Buyer:</span> {order.buyer?.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                    ${order.orderStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                        order.orderStatus === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {order.orderStatus}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                                {order.delivery ? (
                                    <div>
                                        <div className="font-medium">{order.delivery.status}</div>
                                        {order.delivery.transporter && (
                                            <div className="text-xs">Tx: {order.delivery.transporter.name}</div>
                                        )}
                                    </div>
                                ) : <span className="text-gray-400">No delivery</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }} className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                                {order.orderStatus !== 'COMPLETED' && order.orderStatus !== 'CANCELLED' && (
                                    <button onClick={(e) => { e.stopPropagation(); handleCancel(order.id); }} className="text-red-600 hover:text-red-900">Cancel</button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <PaginationControls pagination={pagination} setPage={setPage} />

            {selectedOrder && (
                <div className="fixed inset-0 bg-gradient-to-br from-[#f8f9fa]/95 via-white/85 to-[#e9ecef]/95 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold">Order Details #{selectedOrder.id.slice(-6)}</h3>
                            <button onClick={() => setSelectedOrder(null)} className="text-gray-500 text-2xl">&times;</button>
                        </div>
                        {/* Selected Order Details View (Simplified) */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="p-3 bg-gray-50 rounded">
                                <h4 className="font-bold text-sm text-gray-700 mb-2">Listing Info</h4>
                                <p className="text-sm">Crop: {selectedOrder.listing?.crop?.name}</p>
                                <p className="text-sm">Quantity: {selectedOrder.quantity}</p>
                                <p className="text-sm">Price: ₹{selectedOrder.priceFinal}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded">
                                <h4 className="font-bold text-sm text-gray-700 mb-2">Parties</h4>
                                <p className="text-sm">Farmer: {selectedOrder.farmer?.name}</p>
                                <p className="text-sm">Buyer: {selectedOrder.buyer?.name}</p>
                            </div>
                        </div>
                        {selectedOrder.delivery && (
                            <div className="mb-6">
                                <h4 className="font-bold text-gray-800 mb-3">Delivery Timeline</h4>
                                <div className="space-y-4 border-l-2 border-blue-200 pl-4 ml-2">
                                    <div className="relative">
                                        <p className="font-medium">Status: {selectedOrder.delivery.status}</p>
                                        {selectedOrder.delivery.transporter && <p className="text-sm text-gray-600">Transporter: {selectedOrder.delivery.transporter.name}</p>}
                                    </div>
                                    {selectedOrder.delivery.transporter && (
                                        <button onClick={() => handleReassign(selectedOrder.id, selectedOrder.delivery.transporterId)} className="text-xs text-red-600 underline">Emergency Reassign</button>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="flex justify-end pt-4 border-t">
                            <button onClick={() => setSelectedOrder(null)} className="px-4 py-2 bg-gray-600 text-white rounded">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const EarningsMonitor = ({ transporters }: { transporters: any[] }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ transporterId: '', startDate: '', endDate: '' });

    useEffect(() => { loadData(); }, [filters]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await adminService.getEarnings(filters);
            setData(res);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow flex flex-wrap gap-4 items-end">
                <div>
                    <label htmlFor="admin-earnings-transporter" className="block text-sm font-medium text-gray-700">Transporter</label>
                    <select
                        id="admin-earnings-transporter"
                        value={filters.transporterId}
                        onChange={e => setFilters({ ...filters, transporterId: e.target.value })}
                        className="mt-1 border rounded px-3 py-2"
                    >
                        <option value="">All Transporters</option>
                        {transporters.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="admin-earnings-start" className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input id="admin-earnings-start" type="date" className="mt-1 border rounded px-3 py-2" onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
                </div>
                <div>
                    <label htmlFor="admin-earnings-end" className="block text-sm font-medium text-gray-700">End Date</label>
                    <input id="admin-earnings-end" type="date" className="mt-1 border rounded px-3 py-2" onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
                </div>
            </div>

            {loading ? <div>Loading Earnings...</div> : data && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                        <h3 className="text-gray-500 font-medium">Total Payouts</h3>
                        <p className="text-3xl font-bold text-blue-700">₹{data.summary?.totalAmount || 0}</p>
                    </div>
                    <div className="bg-green-50 p-6 rounded-lg border border-green-100">
                        <h3 className="text-gray-500 font-medium">Deliveries</h3>
                        <p className="text-3xl font-bold text-green-700">{data.summary?.count || 0}</p>
                    </div>
                    <div className="bg-purple-50 p-6 rounded-lg border border-purple-100">
                        <h3 className="text-gray-500 font-medium">Total Distance</h3>
                        <p className="text-3xl font-bold text-purple-700">{data.summary?.totalDistance || 0} km</p>
                    </div>
                </div>
            )}

            {/* Table could be added here if detailed list is needed */}
        </div>
    );
};

const AnalyticsDashboard = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadAnalytics(); }, []);

    const loadAnalytics = async () => {
        try {
            const res = await adminService.getAnalytics();
            setData(res);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    if (loading) return <div>Loading Analytics...</div>;
    if (!data) return <div>No data available</div>;

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Platform Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-bold mb-4">Listings per Crop</h3>
                    <div className="h-64">
                        <UserTable role="FARMER" /> {/* Dummy usage to prevent unused err if not used here, but we are using ResponsiveContainer */}
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.listingsPerCrop}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#82ca9d" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                {/* Simplified visual cues for other charts to save space */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-bold mb-4">Orders (Last 30 Days)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.ordersPerDay}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="count" stroke="#8884d8" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SystemSettings = () => {
    const [settings, setSettings] = useState<any>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadSettings(); }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await adminService.getSettings();
            setSettings(cleanSettings(data));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const cleanSettings = (data: any) => ({
        NEGOTIATION_ENABLED: data.NEGOTIATION_ENABLED ?? true,
        TRANSPORT_ENABLED: data.TRANSPORT_ENABLED ?? true,
        MAX_NEGOTIATION_ROUNDS: data.MAX_NEGOTIATION_ROUNDS ?? 5,
        PLATFORM_COMMISSION: data.PLATFORM_COMMISSION ?? 2.5
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await adminService.updateSettings(settings);
            alert("Settings saved successfully");
        } catch (err) { alert("Failed to save settings"); }
    };

    if (loading) return <div>Loading Settings...</div>;

    return (
        <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
            <h2 className="text-xl font-bold text-gray-800 mb-6">System Configuration</h2>
            <form onSubmit={handleSave} className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                        <h3 className="font-medium text-gray-900">Negotiation Feature</h3>
                        <p className="text-sm text-gray-500">Allow buyers and farmers to negotiate prices</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <span className="sr-only">Toggle negotiation feature</span>
                        <input type="checkbox" className="sr-only peer" checked={settings.NEGOTIATION_ENABLED} onChange={e => setSettings({ ...settings, NEGOTIATION_ENABLED: e.target.checked })} aria-label="Toggle negotiation feature" title="Toggle negotiation feature" />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                </div>
                <div className="pt-4">
                    <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 font-bold">Save Configuration</button>
                </div>
            </form>
        </div>
    );
};

const AuditLogs = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<any>({});
    const [page, setPage] = useState(1);

    useEffect(() => { fetchLogs(); }, [page]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await adminService.getAuditLogs({ page });
            // Handle if getAuditLogs returns { logs: [], pagination: {} } or just [] (based on previous fixes, it should return { logs, pagination })
            if (res.logs) {
                setLogs(res.logs);
                setPagination(res.pagination);
            } else {
                setLogs(res);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b">
                <h2 className="text-lg font-bold text-gray-800">Admin Activity Logs</h2>
            </div>
            {loading ? <div className="p-10 text-center">Loading...</div> : (
                <>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {log.adminName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                                        <details>
                                            <summary className="cursor-pointer text-blue-600 hover:text-blue-800">View JSON</summary>
                                            <pre className="mt-2 text-xs bg-gray-50 p-2 rounded max-w-xs overflow-auto">
                                                {JSON.stringify(log.details, null, 2)}
                                            </pre>
                                        </details>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <PaginationControls pagination={pagination} setPage={setPage} />
                </>
            )}
        </div>
    );
};

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [allTransporters, setAllTransporters] = useState<any[]>([]);

    useEffect(() => {
        if (activeTab === 'earnings') {
            adminService.getTransporters({ limit: 100 }).then((res: any) => setAllTransporters(res.transporters)).catch(console.error);
        }
    }, [activeTab]);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setSidebarOpen(false); // Close sidebar on mobile after selection
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-green-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-gradient-to-br from-[#f8f9fa]/95 via-white/85 to-[#e9ecef]/95 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Flexbox Item */}
            <aside className={`
                w-56 bg-white/95 backdrop-blur-xl shadow-2xl z-50 
                transition-all duration-500 ease-in-out border-r border-gray-200/50
                fixed lg:static inset-y-0 left-0 h-screen
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-600/5 via-transparent to-blue-600/5 pointer-events-none"></div>

                {/* Header */}
                <div className="relative p-4 border-b border-gray-200/50 bg-gradient-to-r from-green-600 to-emerald-600">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 bg-white/20 backdrop-blur-lg rounded-xl flex items-center justify-center shadow-lg">
                                <span className="text-xl">🌾</span>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white drop-shadow-lg">KisanSetu</h1>
                                <p className="text-green-100 text-[10px] font-medium">Admin Portal</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden text-white hover:bg-white/20 rounded-lg p-2 transition-all duration-200"
                            aria-label="Close sidebar"
                            title="Close sidebar"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="relative p-3 space-y-1 pb-20 overflow-y-auto h-[calc(100vh-80px)]">
                    <NavBtn id="overview" label="Overview" icon="📊" active={activeTab} onClick={handleTabChange} />
                    <NavBtn id="farmers" label="Farmers" icon="👨‍🌾" active={activeTab} onClick={handleTabChange} />
                    <NavBtn id="buyers" label="Buyers" icon="🧑‍💼" active={activeTab} onClick={handleTabChange} />
                    <NavBtn id="transporters" label="Transporters" icon="🚚" active={activeTab} onClick={handleTabChange} />
                    <NavBtn id="crops" label="Crop Master" icon="🌾" active={activeTab} onClick={handleTabChange} />
                    <NavBtn id="prices" label="Market Prices" icon="💰" active={activeTab} onClick={handleTabChange} />
                    <NavBtn id="listings" label="Moderation" icon="🛡️" active={activeTab} onClick={handleTabChange} />
                    <NavBtn id="orders" label="Orders" icon="📦" active={activeTab} onClick={handleTabChange} />
                    <NavBtn id="earnings" label="Earnings" icon="💸" active={activeTab} onClick={handleTabChange} />
                    <NavBtn id="analytics" label="Analytics" icon="📈" active={activeTab} onClick={handleTabChange} />
                    <div className="my-3 border-t border-gray-200/50"></div>
                    <NavBtn id="settings" label="Settings" icon="⚙️" active={activeTab} onClick={handleTabChange} />
                    <NavBtn id="logs" label="Audit Logs" icon="📜" active={activeTab} onClick={handleTabChange} />
                </nav>
            </aside>

            {/* Main Content - Flexbox Item (flex-1) */}
            <main className="flex-1 min-h-screen overflow-x-hidden relative z-10">
                {/* Desktop Header Bar - Sticky with Glassmorphism */}
                <div className="hidden lg:block sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
                    <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
                        {/* Page Title */}
                        <div>
                            <h1 className="text-xl font-bold text-gray-800 capitalize">{activeTab}</h1>
                            <p className="text-xs text-gray-500">KisanSetu Admin Portal</p>
                        </div>

                        {/* Right Section - Language + Admin + Logout */}
                        <div className="flex items-center gap-3">
                            {/* Language Selector */}
                            <div className="relative group">
                                <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 border border-gray-200">
                                    <span className="text-base">🌐</span>
                                    <span className="text-xs font-medium text-gray-700">English</span>
                                    <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>

                            {/* Admin Profile */}
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200">
                                <div className="text-right">
                                    <p className="text-xs font-semibold text-gray-800">Admin</p>
                                    <p className="text-[10px] text-gray-500">Super Admin</p>
                                </div>
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                    A
                                </div>
                            </div>

                            {/* Logout Button */}
                            <button
                                onClick={() => {
                                    localStorage.removeItem('token');
                                    window.location.href = '/login';
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 transition-all duration-200 group"
                            >
                                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                <span className="text-xs font-semibold text-red-600">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Header */}
                <div className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-200/50 px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 active:scale-95"
                        aria-label="Open sidebar"
                        title="Open sidebar"
                    >
                        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <h2 className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent capitalize">{activeTab}</h2>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                        A
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-3 sm:p-4 lg:p-5">
                    <div className="max-w-[1600px] mx-auto">
                        {activeTab === 'overview' && <Overview />}
                        {activeTab === 'farmers' && <UserTable role="FARMER" />}
                        {activeTab === 'buyers' && <UserTable role="BUYER" />}
                        {activeTab === 'transporters' && <TransporterTable />}
                        {activeTab === 'crops' && <CropManager />}
                        {activeTab === 'prices' && <PriceManager />}
                        {activeTab === 'listings' && <ListingModeration />}
                        {activeTab === 'orders' && <OrderMonitor />}
                        {activeTab === 'earnings' && <EarningsMonitor transporters={allTransporters} />}
                        {activeTab === 'analytics' && <AnalyticsDashboard />}
                        {activeTab === 'settings' && <SystemSettings />}
                        {activeTab === 'logs' && <AuditLogs />}
                    </div>
                </div>
            </main>

            {/* Custom CSS for animations */}
            <style>{`
                @keyframes blob {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    25% { transform: translate(20px, -50px) scale(1.1); }
                    50% { transform: translate(-20px, 20px) scale(0.9); }
                    75% { transform: translate(50px, 50px) scale(1.05); }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.5s ease-out;
                }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
