import React from 'react';
import Image from 'next/image';
import { Message } from '../types';
import { User, Flame, Globe, ExternalLink } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[90%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-zinc-700' : 'bg-gradient-to-br from-velvet-red to-purple-900'
        }`}>
          {isUser ? (
            <User size={16} className="text-zinc-300" />
          ) : (
            <Flame size={16} className="text-white" />
          )}
        </div>

        {/* Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full`}>
          
          {/* Text Bubble */}
          {message.text && (
            <div
              className={`px-5 py-3 rounded-2xl text-sm md:text-base leading-relaxed shadow-md ${
                isUser
                  ? 'bg-zinc-800 text-zinc-100 rounded-tr-none border border-zinc-700'
                  : 'bg-velvet-card text-zinc-200 rounded-tl-none border border-velvet-red/20'
              }`}
            >
              {message.text.split('\n').map((line, i) => (
                <p key={i} className="mb-1 last:mb-0">
                  {line.split('**').map((part, j) => 
                    j % 2 === 1 ? <strong key={j} className="text-velvet-red font-semibold">{part}</strong> : part
                  )}
                </p>
              ))}
            </div>
          )}

          {/* Attachment (Image/Video) */}
          {message.attachment && (
            <div className={`mt-2 rounded-xl overflow-hidden border border-white/10 shadow-lg max-w-full ${isUser ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
              {message.attachment.type === 'image' ? (
                <Image 
                  src={message.attachment.url} 
                  alt="Generated content" 
                  width={800}
                  height={450}
                  sizes="(max-width: 768px) 90vw, 600px"
                  className="w-full h-auto max-h-[400px] object-cover"
                  unoptimized
                />
              ) : (
                <video 
                  src={message.attachment.url} 
                  controls 
                  className="w-full h-auto max-h-[400px] bg-black"
                />
              )}
              <div className="bg-black/50 p-2 text-[10px] text-zinc-400 flex justify-between items-center backdrop-blur-sm">
                <span>Gerado por IA ({message.attachment.type === 'image' ? 'Imagen' : 'Veo'})</span>
              </div>
            </div>
          )}

          {/* Grounding Sources (Google Search) */}
          {message.groundingMetadata && message.groundingMetadata.groundingChunks && message.groundingMetadata.groundingChunks.length > 0 && (
            <div className="mt-2 bg-zinc-900/50 border border-white/5 rounded-lg p-3 w-full max-w-md">
              <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2 uppercase tracking-wider font-semibold">
                <Globe size={12} />
                Fontes do Google
              </div>
              <div className="space-y-1">
                {message.groundingMetadata.groundingChunks.map((chunk, idx) => (
                  chunk.web ? (
                    <a 
                      key={idx} 
                      href={chunk.web.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 rounded bg-white/5 hover:bg-white/10 transition-colors group"
                    >
                      <span className="text-xs text-zinc-300 truncate max-w-[200px]">{chunk.web.title}</span>
                      <ExternalLink size={10} className="text-zinc-500 group-hover:text-velvet-red" />
                    </a>
                  ) : null
                ))}
              </div>
            </div>
          )}

          <span className="text-[10px] text-zinc-600 mt-1 px-1">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};
