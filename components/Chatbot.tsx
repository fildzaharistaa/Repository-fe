'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { useChatbot } from '@/hooks/useChatbot';
import { formatDate } from '@/lib/utils/formatters';

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, loading, sendMessage, clearMessages } = useChatbot();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async () => {
    if (!inputMessage.trim() || loading) return;
    
    const message = inputMessage.trim();
    setInputMessage('');
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-r from-orange-600 to-orange-700 text-white shadow-lg transition-all hover:from-orange-700 hover:to-orange-800 hover:scale-110 hover:shadow-xl"
          title="Chatbot"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-150 w-100 flex-col rounded-xl border border-gray-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-linear-to-r from-orange-600 to-orange-700 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-white" />
              <h3 className="text-base font-semibold text-white">Chatbot Assistant</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearMessages}
                className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/20"
                title="Clear Chat"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/20"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Bot className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">Halo! Saya chatbot assistant</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Tanyakan tentang folder di sistem repository
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    Contoh: &quot;dimana folder ijasah?&quot;
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${
                      msg.isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {!msg.isUser && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                        <Bot className="h-4 w-4 text-blue-600" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.isUser
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-900 shadow-sm'
                      }`}
                    >
                      {msg.isUser ? (
                        <p className="text-sm">{msg.message}</p>
                      ) : (
                        <div>
                          <p className="whitespace-pre-wrap text-sm">{msg.response}</p>
                          <p className="mt-1 text-xs opacity-70">
                            {formatDate(msg.timestamp)}
                          </p>
                        </div>
                      )}
                    </div>
                    {msg.isUser && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200">
                        <User className="h-4 w-4 text-gray-600" />
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                      <Bot className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="rounded-lg bg-white px-4 py-2 shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 bg-white p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Tanyakan tentang folder..."
                disabled={loading}
                className="text-black placeholder:text-gray-400 flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSend}
                disabled={loading || !inputMessage.trim()}
                className="flex items-center justify-center rounded-lg bg-linear-to-r from-orange-600 to-orange-700 px-4 py-2 text-white transition-all hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Tekan Enter untuk mengirim
            </p>
          </div>
        </div>
      )}
    </>
  );
}

