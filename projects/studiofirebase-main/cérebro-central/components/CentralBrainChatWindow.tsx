import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { Message } from '../types';
import { sendMessageToAI } from '../services/aiService';

interface CentralBrainChatWindowProps {
  messages: Message[];
  onMessagesChange: (messages: Message[]) => void;
  isLoading: boolean;
  onLoadingChange: (isLoading: boolean) => void;
  currentModelId: string;
  isSearchEnabled: boolean;
}

export const CentralBrainChatWindow: React.FC<CentralBrainChatWindowProps> = ({
  messages,
  onMessagesChange,
  isLoading,
  onLoadingChange,
  currentModelId,
  isSearchEnabled,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: new Date(),
    };

    onMessagesChange([...messages, userMessage]);
    onLoadingChange(true);

    try {
      const { text, groundingMetadata } = await sendMessageToAI(
        messages,
        userText,
        currentModelId,
        isSearchEnabled
      );

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: text,
        timestamp: new Date(),
        modelId: currentModelId,
        groundingMetadata: groundingMetadata,
      };

      onMessagesChange([...messages, userMessage, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: 'Hmm, algo deu errado na nossa conexão neural. Talvez estejamos quentes demais? Tente novamente.',
        timestamp: new Date(),
        modelId: currentModelId,
      };
      onMessagesChange([...messages, userMessage, errorMessage]);
    } finally {
      onLoadingChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-full h-full flex flex-col animate-in fade-in-0 zoom-in-95 duration-500 border border-white/20 bg-white/10 backdrop-blur-[24px] shadow-[0_25px_60px_rgba(0,0,0,0.45)] md:rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-row items-center justify-between relative border-b border-white/20 bg-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-white/80" />
          <h3 className="text-xl text-white/95 tracking-tight font-semibold">Cérebro Central</h3>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/60">
            <Sparkles className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-center">Bem-vindo ao Cérebro Central</p>
            <p className="text-sm opacity-75 max-w-xs text-center mt-2">
              Faça uma pergunta ou compartilhe seus pensamentos para começar
            </p>
          </div>
        ) : (
          messages.map((message) => <ChatMessage key={message.id} message={message} />)
        )}

        {isLoading && (
          <div className="flex justify-start mb-6 w-full">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Loader2 className="h-4 w-4 text-white/80 animate-spin" />
              </div>
              <div className="bg-white/20 text-white px-4 py-3 rounded-2xl rounded-tl-none border border-white/15">
                <div className="flex space-x-1">
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-white/20 bg-white/5 p-4">
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="flex-1 bg-white/10 border border-white/20 text-white placeholder-white/50 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-white/20 text-white hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed p-3 rounded-lg transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CentralBrainChatWindow;
