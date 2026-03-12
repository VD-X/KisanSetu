import React, { useState, useEffect, useRef, useCallback } from 'react';
import { negotiationAPI } from '../services/api';
import { socketService } from '../services/socketService';
import { useToast } from '../context/ToastContext';
import { geminiService } from '../services/geminiService';

// ─── Types ───────────────────────────────────────────────────────────────────
interface NegotiationMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  type: 'TEXT' | 'OFFER';
  offerValue?: number;
  offerStatus?: string; // 'pending' | 'accepted' | 'rejected' | 'superseded'
  createdAt: string;
  sender?: {
    id: string;
    role: string;
    farmerProfile?: { fullName: string };
    buyerProfile?: { fullName: string };
  };
}

interface NegotiationChat {
  id: string;
  listingId: string;
  buyerId: string;
  farmerId: string;
  requestedQuantity: number;
  currentOffer: number;
  status: string;
  lastMessage?: string;
  createdAt: string;
  updatedAt: string;
  listing?: {
    id: string;
    quantity: number;
    expectedPrice: number;
    grade: string;
    crop?: { name: string; icon: string };
    farmer?: { farmerProfile?: { fullName: string } };
  };
  buyer?: { buyerProfile?: { fullName: string } };
  farmer?: { farmerProfile?: { fullName: string; phone?: string } };
  messages?: NegotiationMessage[];
}

interface ChatNegotiationProps {
  chatId: string;
  userId: string;
  userRole: 'FARMER' | 'BUYER';
  onClose: () => void;
  onStatusChange?: (chatId: string, status: string) => void;
  onProceedToCheckout?: (data: { listingId: string, quantity: number, price: number, negotiationId: string }) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const shouldShowDateSeparator = (curr: string, prev?: string) => {
  if (!prev) return true;
  return new Date(curr).toDateString() !== new Date(prev).toDateString();
};

// ─── Component ───────────────────────────────────────────────────────────────
const ChatNegotiation: React.FC<ChatNegotiationProps> = ({
  chatId,
  userId,
  userRole,
  onClose,
  onStatusChange,
  onProceedToCheckout
}) => {
  const { success, error, info } = useToast();
  const [chat, setChat] = useState<NegotiationChat | null>(null);
  const [messages, setMessages] = useState<NegotiationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [showOfferInput, setShowOfferInput] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isFarmer = userRole === 'FARMER';
  const accentColor = isFarmer ? 'emerald' : 'blue';

  // ─── Scroll to bottom ───────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // ─── Load chat data ─────────────────────────────────────────────────
  useEffect(() => {
    const loadChat = async () => {
      try {
        setLoading(true);
        const chatData = await negotiationAPI.getById(chatId);
        setChat(chatData);
        const msgs = await negotiationAPI.getMessages(chatId);
        setMessages(Array.isArray(msgs) ? msgs : []);
      } catch (err) {
        console.error('Failed to load negotiation:', err);
      } finally {
        setLoading(false);
      }
    };
    loadChat();
  }, [chatId]);

  // ─── Countdown Timer ──────────────────────────────────────────────
  useEffect(() => {
    if (chat?.status !== 'ACCEPTED') {
      setTimeLeft(null);
      setIsExpired(false);
      return;
    }

    const updateTimer = () => {
      const acceptedAt = new Date(chat.updatedAt).getTime();
      const expiryTime = acceptedAt + (2 * 60 * 60 * 1000); // 2 hours
      const now = new Date().getTime();
      const diff = expiryTime - now;

      if (diff <= 0) {
        setTimeLeft('EXPIRED');
        setIsExpired(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      setIsExpired(false);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [chat?.status, chat?.updatedAt]);

  // ─── Socket listeners ──────────────────────────────────────────────
  useEffect(() => {
    socketService.joinNegotiationRoom(chatId);

    const handleMessage = (msg: NegotiationMessage) => {
      if (msg.chatId === chatId) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    const handleStatus = (data: { chatId: string; status: string; offer?: number }) => {
      if (data.chatId === chatId) {
        setChat(prev => {
          if (!prev) return prev;
          // Notify buyer if accepted
          if (data.status === 'ACCEPTED' && prev.status !== 'ACCEPTED' && userRole === 'BUYER') {
            success('Offer Accepted! 2-hour checkout window started.');
            geminiService.speak('The farmer has accepted your offer. You have 2 hours to complete the purchase at the negotiated price.');
          }
          return { ...prev, status: data.status, currentOffer: data.offer ?? prev.currentOffer, updatedAt: new Date().toISOString() };
        });
        onStatusChange?.(chatId, data.status);
      }
    };

    socketService.onNegotiationMessage(handleMessage);
    socketService.onNegotiationStatus(handleStatus);

    return () => {
      socketService.offNegotiationMessage(handleMessage);
      socketService.offNegotiationStatus(handleStatus);
      socketService.leaveNegotiationRoom(chatId);
    };
  }, [chatId, onStatusChange]);

  // ─── Auto-scroll on new messages ───────────────────────────────────
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ─── Send text message ─────────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!inputText.trim() || sending) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const newMsg = await negotiationAPI.sendMessage(chatId, text);
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      scrollToBottom();
    } catch (err) {
      console.error('Failed to send message:', err);
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  // ─── Send offer ────────────────────────────────────────────────────
  const handleSendOffer = async () => {
    const amount = parseFloat(offerAmount);
    if (isNaN(amount) || amount <= 0 || sending) return;
    setOfferAmount('');
    setShowOfferInput(false);
    setSending(true);

    try {
      const newMsg = await negotiationAPI.counter(chatId, amount);
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      scrollToBottom();
    } catch (err) {
      console.error('Failed to send offer:', err);
    } finally {
      setSending(false);
    }
  };

  // ─── Accept / Reject ──────────────────────────────────────────────
  const handleAccept = async () => {
    try {
      await negotiationAPI.accept(chatId);
      setChat(prev => prev ? { ...prev, status: 'ACCEPTED' } : prev);
      onStatusChange?.(chatId, 'ACCEPTED');
    } catch (err) {
      console.error('Failed to accept:', err);
    }
  };

  const handleReject = async () => {
    try {
      await negotiationAPI.reject(chatId);
      setChat(prev => prev ? { ...prev, status: 'REJECTED' } : prev);
      onStatusChange?.(chatId, 'REJECTED');
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  };

  // ─── Send Contact Info ──────────────────────────────────────────────
  const handleSendInfo = async () => {
    if (sending || !isFarmer || !chat?.farmer?.farmerProfile) return;

    const { fullName, phone } = chat.farmer.farmerProfile;
    if (!phone) {
      error('Phone number not found in profile');
      return;
    }

    const infoText = `📞 **Farmer Contact Details**\n\nNamaste! I am **${fullName}**.\nYou can call me at **${phone}** to discuss this deal directly.\n\nLet's connect! 🤝`;

    setInputText('');
    setSending(true);

    try {
      const newMsg = await negotiationAPI.sendMessage(chatId, infoText);
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      scrollToBottom();
      success('Contact info sent!');
    } catch (err) {
      console.error('Failed to send info:', err);
      error('Failed to send contact info');
    } finally {
      setSending(false);
    }
  };

  // ─── Derived values ───────────────────────────────────────────────
  const partnerName = isFarmer
    ? chat?.buyer?.buyerProfile?.fullName || 'Buyer'
    : chat?.farmer?.farmerProfile?.fullName || 'Farmer';
  const cropName = chat?.listing?.crop?.name || 'Crop';
  const isOpen = chat?.status === 'OPEN' || chat?.status === 'COUNTER';
  const lastOfferMsg = [...messages].reverse().find(m => m.type === 'OFFER');
  const canRespond = lastOfferMsg && lastOfferMsg.senderId !== userId && isOpen;

  // ─── Loading state ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-white rounded-[40px] p-12 shadow-2xl text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-gray-400 mb-4"></i>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading chat...</p>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 md:p-6">
      <div className="bg-white w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[95vh] sm:rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">

        {/* ─── Header ─────────────────────────────────────────────── */}
        <div className={`bg-gradient-to-r ${isFarmer ? 'from-emerald-600 to-green-700' : 'from-blue-600 to-indigo-700'} px-5 py-4 flex items-center gap-4 shrink-0`}>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <i className="fas fa-arrow-left text-sm"></i>
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-black text-sm truncate">{partnerName}</h3>
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest truncate">
              {cropName} • {chat?.listing?.grade} • {chat?.requestedQuantity} kg
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Status Badge */}
            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${chat?.status === 'ACCEPTED' ? 'bg-green-400/30 text-green-100' :
              chat?.status === 'REJECTED' ? 'bg-red-400/30 text-red-100' :
                'bg-white/20 text-white'
              }`}>
              {chat?.status}
            </span>
          </div>
        </div>

        {/* ─── Offer Summary Bar ──────────────────────────────────── */}
        <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl bg-${accentColor}-100 flex items-center justify-center`}>
              <i className={`fas fa-tag text-${accentColor}-600 text-xs`}></i>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Current Offer</p>
              <p className="text-lg font-black text-gray-900">₹{chat?.currentOffer?.toLocaleString()}<span className="text-[10px] text-gray-400 font-bold">/kg</span></p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Listed Price</p>
            <p className="text-sm font-bold text-gray-500">₹{chat?.listing?.expectedPrice?.toLocaleString()}/kg</p>
          </div>
        </div>

        {/* ─── Closed Banner ──────────────────────────────────────── */}
        {chat?.status === 'ACCEPTED' && (
          <div className={`${isExpired ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'} border-b px-5 py-3 text-center shrink-0 transition-colors duration-500`}>
            <div className="flex flex-col items-center gap-1">
              <p className={`text-xs font-bold ${isExpired ? 'text-red-700' : 'text-green-700'}`}>
                <i className={`fas ${isExpired ? 'fa-clock' : 'fa-check-circle'} mr-2`}></i>
                {isExpired ? 'The 2-hour checkout window has expired.' : `Deal accepted at ₹${chat.currentOffer}/kg! 🎉`}
              </p>
              {!isExpired && timeLeft && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-green-600/60">Expires in:</span>
                  <span className="bg-green-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-sm shadow-green-200 animate-pulse font-mono">
                    {timeLeft}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        {chat?.status === 'REJECTED' && (
          <div className="bg-red-50 border-b border-red-100 px-5 py-3 text-center shrink-0">
            <p className="text-xs font-bold text-red-600">
              <i className="fas fa-times-circle mr-2"></i>
              Negotiation was declined.
            </p>
          </div>
        )}

        {/* ─── Messages ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" style={{ scrollBehavior: 'smooth' }}>
          {messages.map((msg, idx) => {
            const isMe = msg.senderId === userId;
            const showDate = shouldShowDateSeparator(msg.createdAt, messages[idx - 1]?.createdAt);
            // Determine if this offer is the latest one (for showing status + buttons)
            const isLatestOffer = msg.type === 'OFFER' && msg.id === lastOfferMsg?.id;
            // Offer status from per-message field (falls back to chat-level for backward compat)
            const offerStatus = msg.type === 'OFFER'
              ? (msg.offerStatus || (isLatestOffer
                ? (chat?.status === 'ACCEPTED' ? 'accepted' : chat?.status === 'REJECTED' ? 'rejected' : 'pending')
                : 'superseded'))
              : null;
            // Show Accept/Reject only if: it's the latest offer, I'm the receiver, and chat is still open
            const showOfferActions = isLatestOffer && !isMe && isOpen;

            return (
              <React.Fragment key={msg.id}>
                {/* Date Separator */}
                {showDate && (
                  <div className="flex items-center justify-center py-3">
                    <span className="bg-gray-100 text-gray-500 text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
                      {formatDate(msg.createdAt)}
                    </span>
                  </div>
                )}

                {/* Message Bubble container with animation */}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`max-w-[80%] ${msg.type === 'OFFER' ? 'w-full max-w-[85%]' : ''}`}>
                    {/* ─── Offer Card ─── */}
                    {msg.type === 'OFFER' ? (
                      <div className={`rounded-[24px] overflow-hidden shadow-sm border ${isMe
                        ? `bg-gradient-to-br from-${accentColor}-50 to-${accentColor}-100/50 border-${accentColor}-200`
                        : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
                        }`}>
                        <div className="px-5 py-4">
                          {/* Header row */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <i className={`fas fa-tag text-xs ${isMe ? `text-${accentColor}-600` : 'text-amber-600'}`}></i>
                              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">
                                {isMe ? 'Your Offer' : 'Their Offer'}
                              </span>
                            </div>
                            {/* Status Badge */}
                            {msg.type === 'OFFER' && (
                              <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${msg.offerStatus === 'accepted' ? 'bg-green-100 text-green-700' :
                                msg.offerStatus === 'rejected' ? 'bg-red-100 text-red-600' :
                                  msg.offerStatus === 'superseded' ? 'bg-gray-100 text-gray-400' :
                                    'bg-amber-100 text-amber-700'
                                }`}>
                                {msg.offerStatus === 'superseded' ? 'Countered' :
                                  msg.offerStatus === 'accepted' ? 'Accepted' :
                                    msg.offerStatus === 'rejected' ? 'Rejected' : 'Pending'}
                              </span>
                            )}
                          </div>

                          {/* Offer Amount */}
                          <p className="text-2xl font-black text-gray-900">
                            ₹{msg.offerValue?.toLocaleString()}<span className="text-sm text-gray-400 font-bold">/kg</span>
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1">{formatTime(msg.createdAt)}</p>

                          {/* Accept / Reject Buttons (only for receiver on latest offer) */}
                          {showOfferActions && (
                            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200/60">
                              <button
                                onClick={handleReject}
                                className="flex-1 px-4 py-2.5 rounded-2xl bg-red-100 text-red-600 text-[10px] font-black uppercase tracking-wider hover:bg-red-200 transition-all active:scale-95"
                              >
                                <i className="fas fa-times mr-1.5"></i>Reject
                              </button>
                              <button
                                onClick={handleAccept}
                                className="flex-1 px-4 py-2.5 rounded-2xl bg-green-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-green-700 transition-all active:scale-95 shadow-lg shadow-green-200"
                              >
                                <i className="fas fa-check mr-1.5"></i>Accept
                              </button>
                            </div>
                          )}

                          {/* Accepted inline confirmation */}
                          {isLatestOffer && offerStatus === 'accepted' && (
                            <div className="mt-3 pt-3 border-t border-green-200/60 text-center">
                              <p className="text-xs font-bold text-green-700 mb-2">
                                <i className="fas fa-check-circle mr-1"></i> Offer Accepted
                              </p>
                              {userRole === 'BUYER' && onProceedToCheckout && (
                                <button
                                  onClick={() => onProceedToCheckout({
                                    listingId: chat?.listingId || '',
                                    quantity: chat?.requestedQuantity || 0,
                                    price: msg.offerValue || 0,
                                    negotiationId: chat?.id || ''
                                  })}
                                  disabled={isExpired}
                                  className={`w-full py-2 ${isExpired ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 active:scale-95 shadow-green-100'} text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md`}
                                >
                                  {isExpired ? 'Offer Expired' : 'Proceed to Checkout'}
                                </button>
                              )}
                            </div>
                          )}
                          {isLatestOffer && offerStatus === 'rejected' && (
                            <div className="mt-3 pt-3 border-t border-red-200/60 text-center">
                              <p className="text-xs font-bold text-red-500">
                                <i className="fas fa-times-circle mr-1"></i> Offer Rejected
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* ─── Text Bubble ─── */
                      <div className={`px-4 py-2.5 rounded-[20px] transition-all hover:scale-[1.02] active:scale-[0.98] ${isMe
                        ? `bg-${accentColor}-600 text-white rounded-br-md shadow-md shadow-${accentColor}-100`
                        : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-md'
                        }`}>
                        <p className="text-[13px] leading-relaxed select-text">{msg.text}</p>
                        <div className="flex items-center justify-end gap-1.5 mt-1">
                          <p className={`text-[9px] ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                            {formatTime(msg.createdAt)}
                          </p>
                          {isMe && (
                            <i className="fas fa-check-double text-[8px] text-white/40"></i>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* ─── Input Area ────────────────────────────────────────── */}
        {isOpen ? (
          <div className="shrink-0 border-t border-gray-100 bg-white p-3">
            {showOfferInput ? (
              /* Offer Input */
              <div className="flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
                <button onClick={() => setShowOfferInput(false)} className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors">
                  <i className="fas fa-times text-sm"></i>
                </button>
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    placeholder="Enter price per kg"
                    className="w-full h-11 pl-8 pr-4 rounded-2xl bg-gray-50 border border-gray-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-all"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOffer()}
                  />
                </div>
                <button
                  onClick={handleSendOffer}
                  disabled={!offerAmount || parseFloat(offerAmount) <= 0 || sending}
                  className="h-11 px-5 rounded-2xl bg-amber-500 text-white font-black text-[10px] uppercase tracking-wider hover:bg-amber-600 transition-colors active:scale-95 shadow-lg shadow-amber-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-paper-plane mr-1"></i> Send
                </button>
              </div>
            ) : (
              /* Text Input */
              <div className="flex items-center gap-2">
                {/* Farmer Info Button */}
                {isFarmer && (
                  <button
                    onClick={handleSendInfo}
                    disabled={sending}
                    className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 hover:bg-green-100 transition-colors active:scale-95 border border-green-100"
                    title="Share Contact Info"
                  >
                    <i className="fas fa-address-card text-sm"></i>
                  </button>
                )}

                <button
                  onClick={() => setShowOfferInput(true)}
                  className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 hover:bg-amber-100 transition-colors active:scale-95"
                  title="Make an offer"
                >
                  <i className="fas fa-tag text-sm"></i>
                </button>
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full h-11 px-4 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || sending}
                  className={`w-11 h-11 rounded-2xl bg-${accentColor}-600 text-white flex items-center justify-center hover:bg-${accentColor}-700 transition-colors active:scale-95 shadow-lg shadow-${accentColor}-200 disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {sending ? <i className="fas fa-spinner fa-spin text-sm"></i> : <i className="fas fa-paper-plane text-sm"></i>}
                </button>
              </div>
            )}
          </div>
        ) : chat?.status === 'ACCEPTED' && userRole === 'BUYER' && (
          <div className="shrink-0 border-t border-gray-100 bg-white p-4">
            <button
              onClick={() => onProceedToCheckout?.({
                listingId: chat?.listingId || '',
                quantity: chat?.requestedQuantity || 0,
                price: chat?.currentOffer || 0,
                negotiationId: chat?.id || ''
              })}
              disabled={isExpired}
              className={`w-full ${isExpired ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 hover:scale-[1.02] shadow-green-100 active:scale-[0.98]'} text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all flex items-center justify-center gap-2`}
            >
              <i className={`fas ${isExpired ? 'fa-clock' : 'fa-shopping-cart'}`}></i>
              {isExpired ? 'Negotiation Expired' : 'Proceed to Checkout'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatNegotiation;
