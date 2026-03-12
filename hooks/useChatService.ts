import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  type: 'TEXT' | 'OFFER';
  offerAmount?: number;
  offerStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

interface ChatServiceHook {
  socket: Socket | null;
  isConnected: boolean;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  sendMessage: (data: {
    chatId: string;
    senderId: string;
    text: string;
    type?: string;
    offerAmount?: number;
  }) => void;
  respondToOffer: (data: {
    messageId: string;
    userId: string;
    status: 'ACCEPTED' | 'REJECTED';
  }) => void;
  onNewMessage: (callback: (message: Message) => void) => () => void;
  onOfferResponse: (callback: (data: {
    messageId: string;
    status: string;
    updatedMessage: Message;
  }) => void) => () => void;
  onError: (callback: (error: { message: string }) => void) => () => void;
}

export const useChatService = (): ChatServiceHook => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to chat server');
      setIsConnected(true);
      
      // Identify user
      if (user?.id) {
        newSocket.emit('identify', user.id);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user?.id]);

  const joinChat = (chatId: string) => {
    if (socket && isConnected) {
      socket.emit('joinChat', chatId);
    }
  };

  const leaveChat = (chatId: string) => {
    if (socket && isConnected) {
      socket.emit('leaveChat', chatId);
    }
  };

  const sendMessage = (data: {
    chatId: string;
    senderId: string;
    text: string;
    type?: string;
    offerAmount?: number;
  }) => {
    if (socket && isConnected) {
      socket.emit('sendMessage', data);
    }
  };

  const respondToOffer = (data: {
    messageId: string;
    userId: string;
    status: 'ACCEPTED' | 'REJECTED';
  }) => {
    if (socket && isConnected) {
      socket.emit('respondToOffer', data);
    }
  };

  const onNewMessage = (callback: (message: Message) => void) => {
    if (!socket) return () => {};
    
    socket.on('newMessage', callback);
    
    return () => {
      socket.off('newMessage', callback);
    };
  };

  const onOfferResponse = (callback: (data: {
    messageId: string;
    status: string;
    updatedMessage: Message;
  }) => void) => {
    if (!socket) return () => {};
    
    socket.on('offerResponse', callback);
    
    return () => {
      socket.off('offerResponse', callback);
    };
  };

  const onError = (callback: (error: { message: string }) => void) => {
    if (!socket) return () => {};
    
    socket.on('error', callback);
    
    return () => {
      socket.off('error', callback);
    };
  };

  return {
    socket,
    isConnected,
    joinChat,
    leaveChat,
    sendMessage,
    respondToOffer,
    onNewMessage,
    onOfferResponse,
    onError
  };
};

export default useChatService;
