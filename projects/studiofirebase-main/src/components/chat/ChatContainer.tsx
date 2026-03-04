/**
 * Container da Janela de Chat Isolado
 * Gerencia o estado de mensagens e tradução
 */

"use client";

import React, { useCallback, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe, Send, Loader2, Settings } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { useChatTranslation } from '@/hooks/use-chat-translation';
import { cn } from '@/lib/utils';

interface ChatContainerMessage {
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
}

interface ChatContainerProps {
  conversationId: string;
  messages: ChatContainerMessage[];
  participant: {
    name: string;
    avatar?: string;
  };
  channel?: string;
  onSendMessage?: (text: string, messageId?: string) => Promise<void>;
  onLoadMore?: () => Promise<void>;
  isLoading?: boolean;
  hasMore?: boolean;
  enableTranslation?: boolean;
}

interface MessageWithTranslation extends ChatContainerMessage {
  translated?: string;
  isTranslating?: boolean;
  showTranslation?: boolean;
}

export function ChatContainer({
  conversationId,
  messages,
  participant,
  channel = 'site',
  onSendMessage,
  onLoadMore,
  isLoading = false,
  hasMore = false,
  enableTranslation = false,
}: ChatContainerProps) {
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messagesWithTranslation, setMessagesWithTranslation] = useState<
    MessageWithTranslation[]
  >(messages);
  const [showTranslationSettings, setShowTranslationSettings] = useState(false);

  const {
    isEnabled: translationEnabled,
    currentTargetLanguage,
    translateMessage,
    toggleTranslation,
    updateTargetLanguage,
    updateConfig,
  } = useChatTranslation(enableTranslation, 'pt');

  // Atualizar mensagens quando receives novas
  React.useEffect(() => {
    setMessagesWithTranslation(messages);
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim()) return;

    setIsSending(true);
    try {
      const tempId = `temp-${Date.now()}`;
      
      // Adicionar mensagem temporária
      setMessagesWithTranslation((prev) => [
        ...prev,
        {
          id: tempId,
          text: messageText,
          sender: 'Você',
          timestamp: new Date(),
          isOwn: true,
          channel,
        },
      ]);

      if (onSendMessage) {
        await onSendMessage(messageText, tempId);
      }

      setMessageText('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setIsSending(false);
    }
  }, [messageText, channel, onSendMessage]);

  const handleTranslateMessage = useCallback(
    async (messageId: string) => {
      setMessagesWithTranslation((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, isTranslating: true } : msg
        )
      );

      try {
        const message = messagesWithTranslation.find((m) => m.id === messageId);
        if (message) {
          const result = await translateMessage(message.text);
          setMessagesWithTranslation((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    translated: result?.translated,
                    isTranslating: false,
                    showTranslation: true,
                  }
                : msg
            )
          );
        }
      } catch (error) {
        console.error('Erro ao traduzir:', error);
        setMessagesWithTranslation((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, isTranslating: false } : msg
          )
        );
      }
    },
    [messagesWithTranslation, translateMessage]
  );

  const handleTranslationToggle = useCallback(
    (messageId: string, showTranslation: boolean) => {
      setMessagesWithTranslation((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, showTranslation } : msg
        )
      );
    },
    []
  );

  return (
    <Card className="h-full flex flex-col border-0 bg-muted/20">
      {/* Header */}
      <CardHeader className="border-b bg-card/50 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {participant.avatar && (
              <img
                src={participant.avatar}
                alt={participant.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            )}
            <div>
              <CardTitle className="text-lg">{participant.name}</CardTitle>
              {channel && <p className="text-xs text-muted-foreground">{channel}</p>}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTranslationSettings(!showTranslationSettings)}
            className={translationEnabled ? 'text-blue-500' : ''}
          >
            <Globe className="w-4 h-4" />
          </Button>
        </div>

        {/* Translation Settings */}
        {showTranslationSettings && (
          <div className="mt-4 p-3 bg-muted rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="translation-toggle"
                checked={translationEnabled}
                onChange={() => toggleTranslation()}
                className="rounded"
              />
              <label htmlFor="translation-toggle" className="text-sm">
                Habilitar Tradução
              </label>
            </div>

            {translationEnabled && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Idioma Alvo:</label>
                <Select value={currentTargetLanguage} onValueChange={updateTargetLanguage}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt">Português</SelectItem>
                    <SelectItem value="en">Inglês</SelectItem>
                    <SelectItem value="es">Espanhol</SelectItem>
                    <SelectItem value="fr">Francês</SelectItem>
                    <SelectItem value="de">Alemão</SelectItem>
                    <SelectItem value="it">Italiano</SelectItem>
                    <SelectItem value="ja">Japonês</SelectItem>
                    <SelectItem value="zh">Chinês</SelectItem>
                  </SelectContent>
                </Select>

                <label className="text-sm font-medium">Provedor:</label>
                <Select value="google" onValueChange={(val) => updateConfig(val as any)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google">Google Translate</SelectItem>
                    <SelectItem value="deepl">DeepL</SelectItem>
                    <SelectItem value="none">Desabilitar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading && (
          <div className="flex justify-center items-center h-20">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}

        {hasMore && (
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoading}
            className="w-full"
          >
            Carregar mais mensagens
          </Button>
        )}

        {messagesWithTranslation.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Nenhuma mensagem ainda
          </div>
        )}

        {messagesWithTranslation.map((msg) => (
          <ChatMessage
            key={msg.id}
            {...msg}
            onTranslate={translationEnabled ? handleTranslateMessage : undefined}
            onTranslationToggle={handleTranslationToggle}
            showTranslation={msg.showTranslation}
            isTranslating={msg.isTranslating}
          />
        ))}
      </CardContent>

      {/* Input Area */}
      <div className="border-t bg-card/50 backdrop-blur p-4 space-y-2">
        <div className="flex gap-2">
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="resize-none"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleSendMessage();
              }
            }}
            disabled={isSending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isSending || !messageText.trim()}
            className="self-end"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Pressione Ctrl+Enter para enviar
        </p>
      </div>
    </Card>
  );
}

export type { ChatContainerProps, ChatContainerMessage };
