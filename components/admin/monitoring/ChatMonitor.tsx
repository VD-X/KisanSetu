import React, { useState, useEffect } from 'react';
import { adminService } from '../../../services/adminService';
import { MessageSquare, ShieldAlert, Search, Filter, Ban, Trash2, User, ExternalLink, Clock } from 'lucide-react';

const ChatMonitor: React.FC = () => {
    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('FLAGGED');

    useEffect(() => {
        // Mocking chat monitoring data for now
        const mockChats = [
            { id: '1', users: ['Farmer Ramesh', 'Buyer Gupta'], lastMessage: 'Call me on 9988776655 to settle this.', status: 'FLAGGED', reason: 'Phone Sharing', timestamp: new Date().toISOString() },
            { id: '2', users: ['Farmer Sunita', 'Transporter Amit'], lastMessage: 'Please provide exact pickup location.', status: 'NORMAL', timestamp: new Date(Date.now() - 3600000).toISOString() },
            { id: '3', users: ['Buyer Singh', 'Farmer Kumar'], lastMessage: 'Payment will be done via external link: randomlink.com', status: 'FLAGGED', reason: 'External Link', timestamp: new Date(Date.now() - 7200000).toISOString() },
        ];
        setChats(mockChats);
        setLoading(false);
    }, []);

    const filteredChats = filter === 'ALL' ? chats : chats.filter(c => c.status === filter);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-emerald-500" />
                        Chat & Negotiation Monitor
                    </h2>
                    <p className="text-xs text-gray-500 font-medium mt-1">AI-assisted monitoring for platform policy violations</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        {['FLAGGED', 'ALL'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {loading ? (
                    [...Array(4)].map((_, i) => <div key={i} className="h-48 bg-gray-100 rounded-3xl animate-pulse" />)
                ) : filteredChats.map((chat) => (
                    <div key={chat.id} className={`bg-white p-6 rounded-3xl border-2 transition-all group ${chat.status === 'FLAGGED' ? 'border-red-50 hover:border-red-500/20' : 'border-gray-50 hover:border-emerald-500/20'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${chat.status === 'FLAGGED' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                    <ShieldAlert className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-gray-800">{chat.users[0]}</p>
                                        <ArrowRight className="w-3 h-3 text-gray-300" />
                                        <p className="text-sm font-bold text-gray-800">{chat.users[1]}</p>
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 flex items-center gap-2"><Clock className="w-3 h-3" /> {new Date(chat.timestamp).toLocaleTimeString()}</p>
                                </div>
                            </div>
                            {chat.status === 'FLAGGED' && (
                                <span className="px-2 py-1 rounded-lg bg-red-100 text-red-600 text-[9px] font-black uppercase tracking-widest animate-pulse">Flagged: {chat.reason}</span>
                            )}
                        </div>

                        <div className="bg-gray-50/50 p-4 rounded-2xl relative mb-6">
                            <p className="text-xs text-gray-600 italic leading-relaxed">"{chat.lastMessage}"</p>
                            <div className="absolute -top-2 left-4 w-4 h-4 bg-gray-50 rotate-45" />
                        </div>

                        <div className="flex gap-2">
                            <button className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all flex items-center justify-center gap-2">
                                <ExternalLink className="w-3.5 h-3.5" /> View Conversation
                            </button>
                            <button className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2">
                                <Ban className="w-3.5 h-3.5" /> Suspend
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ArrowRight = ({ className }: { className?: string }) => (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
);

export default ChatMonitor;
