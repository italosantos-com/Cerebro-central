/**
 * Componente de Mensagem de Chat Isolado
 * Permite renderizar mensagens com suporte a tradução integrada à API
 */

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Loader2, Copy, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatTranslation } from '@/hooks/use-chat-translation';

interface ChatMessageProps {
  id: string;
  text: string;
  sender: string;
  senderAvatar?: string;
  timestamp: Date;
  isOwn?: boolean;
  channel?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'file';
  fileName?: string;
  showTranslation?: boolean;
  onTranslationChange?: (messageId: string, showTranslation: boolean) => void;
  targetLanguage?: string;
  enableTranslation?: boolean;
}

export function ChatMessage({
  id,
  text,
  sender,
  senderAvatar,
  timestamp,
  isOwn = false,
  channel,
  mediaUrl,
  mediaType,
  fileName,
  translated,
  showTranslation = false,
  onTranslationChange,
  targetLanguage = 'pt',
  enableTranslation = true,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [localShowTranslation, setLocalShowTranslation] = useState(showTranslation);
  
  // Hook de tradução
  const {
    translatedMessages,
    loading,
    errors,
    translateMessage,
    clearErrors,
  } = useChatTroggleTranslation = async () => {
    const newState = !localShowTranslation;
    setLocalShowTranslation(newState);
    
    if (newState && !translatedMessages.has(id)) {
      // Se está ativando tradução e não tem tradução em cache, traduzir
      try {
        await translateMessage(id, text, targetLanguage);
      } catch (error) {
        console.error('Erro ao traduzir:', error);
      }
    }
    
    if (onTranslationChange) {
      onTranslationChange(id, newState);
    }
  };

  const handleCopyText = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const translated = translatedMessages.get(id);
  const isTranslating = loading.get(id) ?? false;
  const error = errors.get(id);
  
  const handleTranslateClick = () => {
    if (onTranslate) {
      onTranslate(id);
    }
  };

  const handleToggleTranslation = () => {
    const newState = !localShowTranslation;
    setLocalShowTranslation(newState);
    if (onTranslationToggle) {
      onTranslationToggle(id, newState);
    }
  };

  const handleCopyText = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayText = localShowTranslation && translated ? translated : text;
  const isTranslated = localShowTranslation && translated;

  return (
    <div className={cn('flex gap-3 mb-4', isOwn ? 'flex-row-reverse' : '')}>
      {/* Avatar */}
      {!isOwn && senderAvatar && (
        <img
          src={senderAvatar}
          alt={sender}
          className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
        />
      )}

      <div className={cn('flex flex-col gap-2 max-w-[80%]', isOwn ? 'items-end' : 'items-start')}>
        {/* Header com sender e timestamp */}
        <div className="flex items-center gap-2 text-xs">
          {!isOwn && <span className="font-semibold text-foreground">{sender}</span>}
          {channel && (
            <Badge variant="outline" className="text-xs">
              {channel}
            </Badge>
          )}
          <span className="text-muted-foreground">{formattedTime}</span>
        </div>

        {/* Mensagem */}
        <div
          className={cn(
            'px-4 py-2 rounded-lg break-words',
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-none'
              : 'bg-muted text-foreground rounded-bl-none'
          )}
        >
          {/* Mídia */}
          {mediaUrl && mediaType === 'image' && (
            <img
              src={mediaUrl}
              alt="Imagem da mensagem"
              className="max-w-xs rounded mb-2"
              loading="lazy"
            />
          )}

          {mediaUrl && mediaType === 'video' && (
            <video
              src={mediaUrl}
              controls
              className="max-w-xs rounded mb-2"
              style={{ maxHeight: '300px' }}
            />
          )}

          {mediaUrl && mediaType === 'audio' && (
            <audio src={mediaUrl} controls className="max-w-xs mb-2" />
          )}

          {mediaUrl && mediaType === 'file' && (
            <a
              href={mediaUrl}
              download={fileName}
              className="flex items-center gap-2 text-blue-500 hover:underline mb-2"
            >
              📎 {fileName || 'Arqe erros */}
        {isTranslated && (
          <div className="text-xs text-muted-foreground italic flex items-center gap-1">
            <Globe className="w-3 h-3" />
            Traduzido para {targetLanguage.toUpperCase()}
          </div>
        )}

        {error && (
          <div className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </div>
        )}

        {/* Controles de tradução */}
        {enableTranslation && (
          <div className="flex gap-2 items-center flex-wrap mt-1">
            {(translated || isTranslating) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 text-xs"
                onClick={handleToggleTranslation}
                disabled={isTranslating}
              >
                <Globe className="w-3 h-3 mr-1" />
                {localShowTranslation ? 'Original' : 'Tradução'}
              </Button>
            )}

            {!translated && !isTranslating && !error && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 text-xs"
                onClick={handleToggleTranslation}
              >
                <Globe className="w-3 h-3 mr-1" />
                Traduzir
              </Button>
            )}

            {isTranslating && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Traduzindo...
              </div>
            )}

            {error && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 text-xs"
                onClick={() => {
                  clearErrors(id);
                  handleToggleTranslation();
                }}
              >
                Tentar novamente
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1"
              onClick={() => handleCopyText(displayText)}
            >
              {copied ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          </div>
        )}Click={() => handleCopyText(displayText)}
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export type { ChatMessageProps };
