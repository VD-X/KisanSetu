import React, { useState, useEffect } from 'react';
import { adminService } from '../../../services/adminService';
import { Search, Filter, MoreVertical, ShieldCheck, ShieldAlert, Ban, CheckCircle, User, Phone, Mail, MapPin, Eye, ChevronRight } from 'lucide-react';

interface UserManagementProps {
    initialRole?: 'FARMER' | 'BUYER' | 'TRANSPORTER';
}

const UserManagement: React.FC<UserManagementProps> = ({ initialRole = 'FARMER' }) => {
    const [role, setRole] = useState(initialRole);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<any>({});
    const [selectedUser, setSelectedUser] = useState<any>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            let res;
            if (role === 'TRANSPORTER') {
                res = await adminService.getTransporters({ status: statusFilter === 'ALL' ? '' : statusFilter, page });
                setUsers(res.transporters);
            } else {
                res = await adminService.getUsers({ role, search, page, status: statusFilter === 'ALL' ? '' : statusFilter });
                setUsers(res.users);
            }
            setPagination(res.pagination || {});
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [role, statusFilter, page]);

    const handleStatusUpdate = async (userId: string, newStatus: string) => {
        try {
            if (role === 'TRANSPORTER' && (newStatus === 'APPROVED' || newStatus === 'REJECTED')) {
                await adminService.verifyTransporter(userId, newStatus as any);
            } else {
                await adminService.updateUserStatus(userId, newStatus);
            }
            fetchUsers();
        } catch (err) {
            alert("Action failed");
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const colors: any = {
            'ACTIVE': 'bg-emerald-100 text-emerald-700',
            'SUSPENDED': 'bg-red-100 text-red-700',
            'PENDING': 'bg-amber-100 text-amber-700',
            'APPROVED': 'bg-emerald-100 text-emerald-700',
            'REJECTED': 'bg-red-100 text-red-700',
        };
        return (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex bg-gray-100 p-1 rounded-2xl">
                    {['FARMER', 'BUYER', 'TRANSPORTER'].map((r) => (
                        <button
                            key={r}
                            onClick={() => { setRole(r as any); setPage(1); }}
                            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${role === r ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {r.charAt(0) + r.slice(1).toLowerCase()}s
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                        />
                    </div>
                    <select
                        className="bg-gray-50 border-none rounded-xl text-sm px-4 py-2 focus:ring-2 focus:ring-emerald-500/20"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="SUSPENDED">Suspended</option>
                        {role === 'TRANSPORTER' && (
                            <>
                                <option value="PENDING">Pending Approval</option>
                                <option value="REJECTED">Rejected</option>
                            </>
                        )}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">User Profile</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contact & Location</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Performance</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-gray-50 rounded w-full" /></td>
                                    </tr>
                                ))
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">No users found match your criteria.</td>
                                </tr>
                            ) : users.map((u) => (
                                <tr key={u.id} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 font-bold group-hover:scale-110 transition-transform">
                                                {u.profilePhoto ? <img src={u.profilePhoto} alt="" className="w-full h-full object-cover rounded-2xl" /> : u.name?.charAt(0) || u.fullName?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{u.name || u.fullName || 'N/A'}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{role}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <Mail className="w-3 h-3 text-gray-400" /> {u.email}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <Phone className="w-3 h-3 text-gray-400" /> {u.phone || u.user?.phone || 'N/A'}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                                <MapPin className="w-3 h-3 text-gray-400" /> {u.location?.district || 'Generic'}, {u.location?.state || 'India'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            {role === 'FARMER' && (
                                                <p className="text-xs font-bold text-emerald-600">₹{(u.stats?.totalEarnings || 0).toLocaleString()} <span className="text-gray-400 font-medium">Earned</span></p>
                                            )}
                                            {role === 'BUYER' && (
                                                <p className="text-xs font-bold text-blue-600">₹{(u.stats?.totalEarnings || 0).toLocaleString()} <span className="text-gray-400 font-medium">Spent</span></p>
                                            )}
                                            {role === 'TRANSPORTER' && (
                                                <p className="text-xs font-bold text-purple-600">₹{(u.stats?.totalEarnings || 0).toLocaleString()} <span className="text-gray-400 font-medium">Earned</span></p>
                                            )}
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">{u.stats?.totalOrders || 0} Orders Processed</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={role === 'TRANSPORTER' ? u.approvalStatus : u.status} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setSelectedUser(u)}
                                                className="p-2 rounded-xl text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            {u.status === 'ACTIVE' || u.approvalStatus === 'APPROVED' ? (
                                                <button
                                                    onClick={() => handleStatusUpdate(u.id, 'SUSPENDED')}
                                                    className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                                    title="Suspend User"
                                                >
                                                    <Ban className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleStatusUpdate(u.id, 'ACTIVE')}
                                                    className="p-2 rounded-xl text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all"
                                                    title="Activate User"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                            {role === 'TRANSPORTER' && (u.approvalStatus === 'PENDING' || u.approvalStatus === 'REJECTED') && (
                                                <button
                                                    onClick={() => handleStatusUpdate(u.id, 'APPROVED')}
                                                    className="p-2 rounded-xl text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all"
                                                    title="Approve KYC"
                                                >
                                                    <ShieldCheck className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Page {pagination.page || 1} of {pagination.pages || 1}
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={pagination.page <= 1}
                            onClick={() => setPage(page - 1)}
                            className="px-4 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-white disabled:opacity-40 transition-all shadow-sm"
                        >
                            Previous
                        </button>
                        <button
                            disabled={pagination.page >= pagination.pages}
                            onClick={() => setPage(page + 1)}
                            className="px-4 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-white disabled:opacity-40 transition-all shadow-sm"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* KYC / User Detail Modal would go here */}
            {selectedUser && (
                <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-600 flex items-end px-8 pb-4 relative">
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/40 transition-all"
                            >
                                <ChevronRight className="w-5 h-5 rotate-90" />
                            </button>
                            <div className="w-24 h-24 rounded-3xl bg-white p-1 shadow-xl translate-y-8">
                                <div className="w-full h-full rounded-[20px] bg-gray-100 flex items-center justify-center text-3xl font-bold text-gray-300">
                                    {selectedUser.profilePhoto ? <img src={selectedUser.profilePhoto} alt="" className="w-full h-full object-cover rounded-[20px]" /> : (selectedUser.name || selectedUser.fullName || "?").charAt(0)}
                                </div>
                            </div>
                        </div>

                        <div className="pt-12 px-8 pb-8 space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedUser.name || selectedUser.fullName}</h2>
                                    <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest">{role}</p>
                                </div>
                                <StatusBadge status={role === 'TRANSPORTER' ? selectedUser.approvalStatus : selectedUser.status} />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contact Details</h3>
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium flex items-center gap-3"><Mail className="w-4 h-4 text-gray-400" /> {selectedUser.email}</p>
                                        <p className="text-sm font-medium flex items-center gap-3"><Phone className="w-4 h-4 text-gray-400" /> {selectedUser.phone || selectedUser.user?.phone}</p>
                                        <p className="text-sm font-medium flex items-center gap-3"><MapPin className="w-4 h-4 text-gray-400" /> {selectedUser.village}, {selectedUser.district}</p>
                                    </div>
                                </div>
                                {role === 'TRANSPORTER' && (
                                    <div className="space-y-4">
                                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vehicle Information</h3>
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium">Type: <span className="text-gray-600">{selectedUser.vehicleType}</span></p>
                                            <p className="text-sm font-medium">Number: <span className="text-gray-600 uppercase">{selectedUser.vehicleNumber}</span></p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 border-t border-gray-50 flex gap-4">
                                <button className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all">Verify Documents</button>
                                <button className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all">Contact User</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
