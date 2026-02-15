import React, { useState, useEffect, useRef } from 'react';
import { Send, Image, FileText, X, Smile, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Quick Reply Templates
const QUICK_REPLIES = [
  { id: 'qr1', text: 'Namaste! Main aapki kaise madad kar sakta hoon?', category: 'greeting' },
  { id: 'qr2', text: 'Please share the case number for reference.', category: 'legal_terms' },
  { id: 'qr3', text: 'Aapko FIR ki copy ki zarurat hogi.', category: 'legal_terms' },
  { id: 'qr4', text: 'Ek minute, main check karta hoon.', category: 'general' },
  { id: 'qr5', text: 'Documents email kar dijiye.', category: 'closing' },
  { id: 'qr6', text: 'Thank you for consulting!', category: 'closing' },
];

const CallChat = ({ sessionId, userId, userName, userRole, isOpen, onClose, otherPartyName }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (sessionId && isOpen) {
      connectWebSocket();
      fetchChatHistory();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [sessionId, isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectWebSocket = () => {
    const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    wsRef.current = new WebSocket(`${wsUrl}/api/chat/ws/${sessionId}`);
    
    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages(prev => [...prev, message]);
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const fetchChatHistory = async () => {
    try {
      const res = await axios.get(`${API}/chat/history/${sessionId}`);
      setMessages(res.data.messages || []);
    } catch (e) {
      console.error('Failed to fetch chat history');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (content, type = 'text', fileUrl = null, fileName = null) => {
    if (!content.trim() && type === 'text') return;
    
    const messageData = {
      sender_id: userId,
      sender_name: userName,
      sender_role: userRole,
      message_type: type,
      content: content,
      file_url: fileUrl,
      file_name: fileName
    };
    
    // Send via WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(messageData));
    } else {
      // Fallback to REST API
      try {
        await axios.post(`${API}/chat/send`, {
          session_id: sessionId,
          ...messageData
        });
        // Add to local state
        setMessages(prev => [...prev, {
          ...messageData,
          timestamp: new Date().toISOString()
        }]);
      } catch (e) {
        console.error('Failed to send message');
      }
    }
    
    setNewMessage('');
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await axios.post(`${API}/chat/upload-file/${sessionId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const isImage = file.type.startsWith('image/');
      await sendMessage(
        isImage ? '📷 Image' : `📄 ${file.name}`,
        isImage ? 'image' : 'document',
        res.data.file_url,
        file.name
      );
    } catch (e) {
      console.error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuickReply = (text) => {
    sendMessage(text, 'quick_reply');
    setShowQuickReplies(false);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-4 bottom-24 w-96 h-[500px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-white/20">
            <AvatarFallback className="bg-amber-500 text-slate-900 text-sm font-bold">
              {otherPartyName?.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-sm">{otherPartyName}</h3>
            <p className="text-xs text-slate-300">In Call Chat</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  msg.sender_id === userId
                    ? 'bg-amber-500 text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                }`}
              >
                {msg.message_type === 'image' && msg.file_url && (
                  <img
                    src={`${BACKEND_URL}${msg.file_url}`}
                    alt="Shared"
                    className="max-w-full rounded-lg mb-2 cursor-pointer"
                    onClick={() => window.open(`${BACKEND_URL}${msg.file_url}`, '_blank')}
                  />
                )}
                {msg.message_type === 'document' && msg.file_url && (
                  <a
                    href={`${BACKEND_URL}${msg.file_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm underline mb-1"
                  >
                    <FileText className="h-4 w-4" />
                    {msg.file_name || 'Document'}
                  </a>
                )}
                <p className="text-sm">{msg.content}</p>
                <p className={`text-xs mt-1 ${msg.sender_id === userId ? 'text-slate-700' : 'text-slate-500'}`}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Quick Replies */}
      {showQuickReplies && (
        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Quick Replies</span>
            <Button variant="ghost" size="sm" onClick={() => setShowQuickReplies(false)}>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_REPLIES.map(qr => (
              <Badge
                key={qr.id}
                variant="outline"
                className="cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900 text-xs py-1.5 px-3"
                onClick={() => handleQuickReply(qr.text)}
              >
                {qr.text.slice(0, 25)}...
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => setShowQuickReplies(!showQuickReplies)}
            title="Quick Replies"
          >
            <Smile className="h-5 w-5 text-slate-500" />
          </Button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
          />
          
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Upload File"
          >
            <Image className="h-5 w-5 text-slate-500" />
          </Button>
          
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage(newMessage)}
            placeholder="Type a message..."
            className="flex-1 rounded-full border-slate-300 dark:border-slate-600"
          />
          
          <Button
            size="icon"
            className="h-10 w-10 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900"
            onClick={() => sendMessage(newMessage)}
            disabled={!newMessage.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CallChat;
