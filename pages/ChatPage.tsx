import React, { useState, useEffect } from 'react';
import ChatList, { ChatType } from '../components/ChatList';
import Chat from '../components/Chat';
import { useChatService } from '../hooks/useChatService';
import { socketService } from '../services/socketService';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  type: 'TEXT' | 'OFFER';
  offerAmount?: number;
  offerStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    role: string;
  };
}

interface Chat {
  id: string;
  orderId: string;
  participants: string[];
  lastMessage?: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
  title?: string;
  subtitle?: string;
  image?: string;
}

const ChatPage: React.FC = () => {
  const location = useLocation();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedChatType, setSelectedChatType] = useState<ChatType>('ORDER');
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const {
    socket,
    isConnected,
    joinChat,
    leaveChat,
    sendMessage,
    respondToOffer,
    onNewMessage,
    onOfferResponse,
    onError
  } = useChatService();

  const handleChatSelect = (chatId: string, type: ChatType) => {
    setSelectedChatId(chatId);
    setSelectedChatType(type);
  };

  const fetchChats = async () => {
    try {
      const data = await api.chat.getUserChats();
      setChats(data);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId: string, type: ChatType) => {
    try {
      if (type === 'ORDER') {
        const data = await api.chat.getMessages(chatId);
        setMessages(data);
      } else {
        const res = await api.negotiation.getMessages(chatId);
        setMessages(res.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async (messageData: {
    text: string;
    type?: string;
    offerAmount?: number
  }) => {
    if (!user || !selectedChatId) return;

    // Also send via API for persistence (socket already does this, but this ensures backup)
    try {
      if (selectedChatType === 'ORDER') {
        const data = {
          chatId: selectedChatId,
          senderId: user.id,
          text: messageData.text,
          type: messageData.type || 'TEXT',
          offerAmount: messageData.offerAmount
        };
        await api.chat.sendMessage(data);
      } else {
        // Negotiation
        if (messageData.type === 'OFFER' && messageData.offerAmount) {
          await api.negotiation.counter(selectedChatId, messageData.offerAmount);
        } else {
          await api.negotiation.sendMessage(selectedChatId, messageData.text);
        }
      }
    } catch (error) {
      console.error('Error sending message via API:', error);
    }
  };

  const handleRespondToOffer = async (messageId: string, status: 'ACCEPTED' | 'REJECTED') => {
    if (!user) return;

    const data = {
      messageId,
      userId: user.id,
      status
    };

    // Send via socket for real-time
    respondToOffer(data);

    // Also send via API for persistence
    try {
      await api.chat.respondToOffer(messageId, status);
    } catch (error) {
      console.error('Error responding to offer via API:', error);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);


  useEffect(() => {
    if (location.state?.chatId) {
      setSelectedChatId(location.state.chatId);
      if (location.state.type) {
        setSelectedChatType(location.state.type);
      }
    }
  }, [location.state]);

  // ... (existing UseEffects)

  const selectedChat = chats.find(c => c.id === selectedChatId);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* ... (Connection Status & Chat List) */}

      {/* Chat List */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white">
        <ChatList
          onChatSelect={handleChatSelect}
          selectedChatId={selectedChatId || undefined}
        />
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-slate-50 relative">
        {selectedChatId ? (
          <>
            {/* Chat Header */}
            <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-200 flex items-center justify-center text-emerald-700 font-bold border-2 border-white shadow-sm">
                    {selectedChat?.image ? (
                      <img src={selectedChat.image} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      selectedChat?.title?.charAt(0) || '?'
                    )}
                  </div>
                  {/* Online Status Dot (Mocked for now or use socket status if available) */}
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 leading-tight">
                    {selectedChat?.title || 'Chat'}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                    <span className={`px-2 py-0.5 rounded-full ${selectedChatType === 'ORDER' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {selectedChatType === 'ORDER' ? 'Order Support' : 'Negotiation'}
                    </span>
                    <span>•</span>
                    <span>{selectedChat?.subtitle || 'Tap for info'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                  <i className="fas fa-phone-alt text-sm"></i>
                </button>
                <button className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                  <i className="fas fa-video text-sm"></i>
                </button>
                <button
                  onClick={() => { /* Info sidebar toggle logic could go here */ }}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <i className="fas fa-info-circle text-sm"></i>
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-hidden relative">
              <Chat
                chatId={selectedChatId}
                messages={messages}
                onSendMessage={handleSendMessage}
                onRespondToOffer={handleRespondToOffer}
                isNegotiation={selectedChatType === 'NEGOTIATION'}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-80">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <i className="fas fa-comments text-4xl text-blue-200"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Your Messages
            </h2>
            <p className="text-gray-500 max-w-sm">
              Select a chat from the sidebar to view your conversation history or continue a negotiation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
