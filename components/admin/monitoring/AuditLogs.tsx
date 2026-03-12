import React, { useState, useEffect } from 'react';
import { adminService } from '../../../services/adminService';
import { ScrollText, Search, Shield, Clock, User, ArrowRight, Filter, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const AuditLogs: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<any>({});

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await adminService.getAuditLogs({ page, level: filter === 'ALL' ? '' : filter, search });
            setLogs(res.logs || res);
            setPagination(res.pagination || {});
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, filter]);

    const getLogLevelStyles = (level: string) => {
        switch (level) {
            case 'CRITICAL': return { color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle };
            case 'WARNING': return { color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertTriangle };
            case 'SUCCESS': return { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle };
            default: return { color: 'text-blue-600', bg: 'bg-blue-50', icon: Info };
        }
    };

    return (
        <div className="space-y-6">
            {/* Control Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0F172A] p-6 rounded-3xl shadow-xl text-white">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Shield className="w-5 h-5 text-emerald-500" />
                        System Audit Logs
                    </h2>
                    <p className="text-xs text-gray-400 font-medium mt-1">Immutable record of all administrative and sensitive actions</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Filter by action or ID..."
                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 text-white"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Logs List */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4">Action & Level</th>
                                <th className="px-6 py-4">Performed By</th>
                                <th className="px-6 py-4">Details</th>
                                <th className="px-6 py-4 text-right">IP Address</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sm">
                            {loading ? (
                                [...Array(8)].map((_, i) => (
                                    <tr key={i} className="animate-pulse"><td colSpan={5} className="px-6 py-6"><div className="h-4 bg-gray-50 rounded w-full" /></td></tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-20 text-center text-gray-400 italic">No system logs available for the selected criteria.</td></tr>
                            ) : logs.map((log) => {
                                const { color, bg, icon: Icon } = getLogLevelStyles(log.level || 'INFO');
                                return (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="space-y-0.5">
                                                <p className="font-bold text-gray-900">{new Date(log.createdAt).toLocaleDateString()}</p>
                                                <p className="text-[10px] text-gray-400 font-bold">{new Date(log.createdAt).toLocaleTimeString()}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${bg} ${color}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <p className="font-bold text-gray-800">{log.action}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                                    {log.createdBy?.name?.charAt(0) || 'S'}
                                                </div>
                                                <p className="font-medium text-gray-700">{log.createdBy?.name || 'System Auto'}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs text-gray-500 font-medium line-clamp-1 max-w-xs">{log.description}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-[10px] font-bold text-gray-300 font-mono tracking-wider">{log.ipAddress || '127.0.0.1'}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between bg-gray-50/30">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Showing platform history</p>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                            className="px-4 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-white disabled:opacity-40 transition-all shadow-sm"
                        >
                            Previous
                        </button>
                        <button
                            disabled={page >= (pagination.pages || 1)}
                            onClick={() => setPage(page + 1)}
                            className="px-4 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-white disabled:opacity-40 transition-all shadow-sm"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuditLogs;
