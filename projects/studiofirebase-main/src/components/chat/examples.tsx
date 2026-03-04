/**
 * Exemplo: Integração Completa de Tradução no Chat
 * 
 * Este arquivo demonstra como integrar o sistema de tradução
 * em diferentes cenários e componentes.
 */

// ============================================================================
// EXEMPLO 1: Uso Simples em Componente Existente
// ============================================================================

import React from 'react';
import { ChatMessage } from '@/components/chat/ChatMessage';

export function SimpleChatExample() {
  const messages = [
    {
      id: 'msg-001',
      text: 'Hello! How are you?',
      sender: 'John Doe',
      senderAvatar: 'https://...',
      timestamp: new Date(),
      channel: 'Site',
    },
    {
      id: 'msg-002',
      text: 'I am doing great, thanks!',
      sender: 'Jane Smith',
      senderAvatar: 'https://...',
      timestamp: new Date(),
      channel: 'Site',
    },
  ];

  return (
    <div className="space-y-4 p-4">
      {messages.map((msg) => (
        <ChatMessage
          key={msg.id}
          id={msg.id}
          text={msg.text}
          sender={msg.sender}
          senderAvatar={msg.senderAvatar}
          timestamp={msg.timestamp}
          channel={msg.channel}
          enableTranslation={true} // ← Habilita tradução
          targetLanguage="pt" // ← Português
        />
      ))}
    </div>
  );
}

// ============================================================================
// EXEMPLO 2: Com Seletor de Idioma
// ============================================================================

import { useState } from 'react';
import { LanguageSelector } from '@/components/chat/LanguageSelector';
import { Button } from '@/components/ui/button';

export function ChatWithLanguageSelector() {
  const [targetLanguage, setTargetLanguage] = useState('pt');
  const [messages, setMessages] = useState([
    // ... seus mensagens
  ]);

  return (
    <div className="flex flex-col h-full">
      {/* Header com seletor */}
      <div className="p-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <h2>Chat - Tradução em {targetLanguage.toUpperCase()}</h2>
          <LanguageSelector
            currentLanguage={targetLanguage}
            onLanguageChange={setTargetLanguage}
            variant="dropdown"
          />
        </div>
      </div>

      {/* Lista de mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            id={msg.id}
            text={msg.text}
            sender={msg.sender}
            timestamp={msg.timestamp}
            enableTranslation={true}
            targetLanguage={targetLanguage} // ← Usa seleção do usuário
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EXEMPLO 3: Integração com UnifiedChatWindow Existente
// ============================================================================

import { ChatWindowWithTranslation } from '@/components/chat/ChatWindowWithTranslation';

export function MainChatInterface() {
  return (
    <ChatWindowWithTranslation
      enableTranslation={true}
      defaultTargetLanguage="pt"
      showLanguageSelector={true}
      languageSelectorPosition="header"
      translationProvider="google"
      onLanguageChange={(lang) => {
        console.log(`Idioma alterado para: ${lang}`);
        // Salvar preferência do usuário em banco de dados
        // await updateUserLanguagePreference(lang);
      }}
      // ... outras props do UnifiedChatWindow
    />
  );
}

// ============================================================================
// EXEMPLO 4: Tradução Programática com Hook
// ============================================================================

import { useChatTranslation } from '@/hooks/use-chat-translation';
import { AlertCircle, Loader2 } from 'lucide-react';

export function AdvancedTranslationExample() {
  const {
    translatedMessages,
    loading,
    errors,
    translateMessage,
    detectLanguage,
    toggleTranslation,
    clearCache,
    getTranslation,
    isLoading,
    getError,
  } = useChatTranslation({
    provider: 'google',
    cacheSize: 200,
    cacheDuration: 24 * 60 * 60 * 1000, // 24 horas
  });

  const [messages, setMessages] = useState([
    { id: '1', text: 'Hello world' },
    { id: '2', text: 'Good morning' },
  ]);

  const handleTranslateMessage = async (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    try {
      // Detectar idioma primeiro (opcional)
      const detectedLang = await detectLanguage(message.text);
      console.log(`Idioma detectado: ${detectedLang}`);

      // Traduzir
      await translateMessage(messageId, message.text, 'pt');
    } catch (error) {
      console.error('Erro ao traduzir:', error);
    }
  };

  return (
    <div className="space-y-4">
      {messages.map((msg) => {
        const translated = getTranslation(msg.id);
        const isTranslating = isLoading(msg.id);
        const error = getError(msg.id);

        return (
          <div key={msg.id} className="p-4 border rounded-lg">
            {/* Texto original */}
            <p className="font-medium">{msg.text}</p>

            {/* Tradução */}
            {translated && (
              <p className="text-muted-foreground italic mt-2">
                {translated}
              </p>
            )}

            {/* Estado */}
            {isTranslating && (
              <div className="flex items-center gap-2 text-sm mt-2 text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Traduzindo...
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm mt-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-2 mt-3">
              {!translated && !isTranslating && !error && (
                <Button size="sm" onClick={() => handleTranslateMessage(msg.id)}>
                  Traduzir
                </Button>
              )}

              {translated && (
                <Button size="sm" variant="outline" onClick={() => toggleTranslation(msg.id)}>
                  Ocultar
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {/* Botão para limpar cache */}
      <Button variant="ghost" size="sm" onClick={clearCache}>
        Limpar Cache
      </Button>
    </div>
  );
}

// ============================================================================
// EXEMPLO 5: Tradução em Multi-canal (Facebook, Instagram, etc)
// ============================================================================

import { UnifiedMessage } from '@/types/chat';

export function MultiChannelChatWithTranslation() {
  const [targetLanguage, setTargetLanguage] = useState('pt');
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);

  const {
    translateMessage,
    translatedMessages,
    loading,
  } = useChatTranslation({ provider: 'google' });

  const handleNewMessage = async (message: UnifiedMessage) => {
    // Adicionar mensagem
    setMessages((prev) => [...prev, message]);

    // Traduzir automaticamente se recebida de outro idioma
    if (message.channel !== 'Site') {
      // Mensagens de redes sociais podem estar em outro idioma
      setTimeout(() => {
        translateMessage(message.id, message.content.text || '', targetLanguage).catch(
          (error) => console.error(`Erro ao traduzir ${message.id}:`, error)
        );
      }, 500);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-4 border-b">
        <span className="font-medium">Conversa Multi-canal</span>
        <LanguageSelector
          currentLanguage={targetLanguage}
          onLanguageChange={setTargetLanguage}
        />
      </div>

      <div className="space-y-3 p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="p-3 bg-muted rounded-lg border-l-4 border-primary"
          >
            <div className="flex items-center justify-between mb-2">
              <strong>{msg.sender.name}</strong>
              <span className="text-xs text-muted-foreground">{msg.channel}</span>
            </div>

            <p>{msg.content.text}</p>

            {translatedMessages.has(msg.id) && (
              <p className="text-sm text-muted-foreground italic mt-2">
                Tradução: {translatedMessages.get(msg.id)}
              </p>
            )}

            {loading.get(msg.id) && (
              <p className="text-sm text-blue-600 mt-2">Traduzindo...</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EXEMPLO 6: Configuração de Tradução Persistente
// ============================================================================

import { useCallback, useEffect } from 'react';
import { translationConfig } from '@/lib/translation-config';

export function ChatWithPersistentSettings() {
  const [userLanguage, setUserLanguage] = useState(
    localStorage.getItem('userTargetLanguage') ||
      translationConfig.defaultTargetLanguage
  );

  // Salvar preferência quando mudar
  const handleLanguageChange = useCallback((lang: string) => {
    setUserLanguage(lang);
    localStorage.setItem('userTargetLanguage', lang);

    // Opcionalmente, sincronizar com servidor
    // await updateUserLanguagePreference(lang);
  }, []);

  // Carregar preferências ao montar
  useEffect(() => {
    const saved = localStorage.getItem('userTargetLanguage');
    if (saved) {
      setUserLanguage(saved);
    }
  }, []);

  return (
    <ChatWindowWithTranslation
      enableTranslation={true}
      defaultTargetLanguage={userLanguage}
      showLanguageSelector={true}
      onLanguageChange={handleLanguageChange}
    />
  );
}

// ============================================================================
// EXEMPLO 7: Tratamento de Erros Customizado
// ============================================================================

export function ChatWithErrorHandling() {
  const { errors, clearErrors, translateMessage } = useChatTranslation();

  const [errorNotifications, setErrorNotifications] = useState<string[]>([]);

  useEffect(() => {
    // Monitorar novos erros
    const newErrors = Array.from(errors.values());
    if (newErrors.length > 0) {
      setErrorNotifications((prev) => [
        ...prev,
        `Erro de tradução: ${newErrors[0]}`,
      ]);

      // Auto-remover notificação após 5 segundos
      setTimeout(() => {
        setErrorNotifications((prev) => prev.slice(1));
      }, 5000);
    }
  }, [errors]);

  return (
    <div className="space-y-4">
      {/* Notificações de erro */}
      <div className="fixed top-4 right-4 space-y-2">
        {errorNotifications.map((notif, idx) => (
          <div key={idx} className="p-3 bg-red-500 text-white rounded-lg">
            {notif}
          </div>
        ))}
      </div>

      {/* Chat */}
      <div className="p-4">
        <button
          onClick={() => {
            translateMessage('test', 'Hello', 'pt').catch((err) => {
              console.error('Erro:', err);
            });
          }}
        >
          Testar Tradução
        </button>

        <button onClick={() => clearErrors()} className="ml-2">
          Limpar Erros
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTAR EXEMPLO PARA TESTE
// ============================================================================

export default {
  SimpleChatExample,
  ChatWithLanguageSelector,
  MainChatInterface,
  AdvancedTranslationExample,
  MultiChannelChatWithTranslation,
  ChatWithPersistentSettings,
  ChatWithErrorHandling,
};
