/**
 * Hook melhorado para Tradução de Chat com intégração à API
 * Gerencia cache, estado de carregamento e erros
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { chatTranslationClient } from '@/lib/chat-translation-client';

export interface TranslationCache {
  [messageId: string]: {
    original: string;
    translated: string;
    language: string;
    timestamp: number;
  };
}

export interface useChatTranslationOptions {
  provider?: 'google' | 'deepl';
  cacheSize?: number;
  cacheDuration?: number; // em ms
}

export function useChatTranslation(options: useChatTranslationOptions = {}) {
  const {
    provider = 'google',
    cacheSize = 100,
    cacheDuration = 24 * 60 * 60 * 1000, // 24 horas
  } = options;

  const [translatedMessages, setTranslatedMessages] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState<Map<string, boolean>>(new Map());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const cacheRef = useRef<TranslationCache>({});
  const requestQueueRef = useRef<Map<string, Promise<string>>>(new Map());

  // Inicializar provider
  useEffect(() => {
    chatTranslationClient.setProvider(provider);
  }, [provider]);

  /**
   * Limpa cache expirado
   */
  const cleanExpiredCache = useCallback(() => {
    const now = Date.now();
    Object.entries(cacheRef.current).forEach(([key, entry]) => {
      if (now - entry.timestamp > cacheDuration) {
        delete cacheRef.current[key];
      }
    });
  }, [cacheDuration]);

  /**
   * Traduz uma mensagem com cache
   */
  const translateMessage = useCallback(
    async (messageId: string, text: string, targetLang: string) => {
      // Verificar cache
      cleanExpiredCache();
      if (cacheRef.current[messageId]?.language === targetLang) {
        setTranslatedMessages(prev => new Map(prev).set(messageId, cacheRef.current[messageId].translated));
        return cacheRef.current[messageId].translated;
      }

      // Verificar se já há requisição em progresso
      if (requestQueueRef.current.has(messageId)) {
        return requestQueueRef.current.get(messageId);
      }

      // Criar nova requisição
      const promise = (async () => {
        try {
          setLoading(prev => new Map(prev).set(messageId, true));
          setErrors(prev => {
            const next = new Map(prev);
            next.delete(messageId);
            return next;
          });

          const translated = await chatTranslationClient.translate({
            text,
            targetLang,
            provider,
          });

          // Adicionar ao cache
          cacheRef.current[messageId] = {
            original: text,
            translated,
            language: targetLang,
            timestamp: Date.now(),
          };

          // Limitar tamanho do cache
          if (Object.keys(cacheRef.current).length > cacheSize) {
            const oldestKey = Object.entries(cacheRef.current).sort(
              ([, a], [, b]) => a.timestamp - b.timestamp
            )[0][0];
            delete cacheRef.current[oldestKey];
          }

          setTranslatedMessages(prev => new Map(prev).set(messageId, translated));
          return translated;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro ao traduzir';
          setErrors(prev => new Map(prev).set(messageId, errorMessage));
          throw error;
        } finally {
          setLoading(prev => {
            const next = new Map(prev);
            next.delete(messageId);
            return next;
          });
          requestQueueRef.current.delete(messageId);
        }
      })();

      requestQueueRef.current.set(messageId, promise);
      return promise;
    },
    [provider, cacheSize, cacheDuration, cleanExpiredCache]
  );

  /**
   * Detecta o idioma de um texto
   */
  const detectLanguage = useCallback(async (text: string) => {
    try {
      return await chatTranslationClient.detectLanguage({
        text,
        provider,
      });
    } catch (error) {
      console.error('Erro ao detectar idioma:', error);
      return 'auto';
    }
  }, [provider]);

  /**
   * Toggle tradução de uma mensagem
   */
  const toggleTranslation = useCallback(
    (messageId: string) => {
      setTranslatedMessages(prev => {
        const next = new Map(prev);
        if (next.has(messageId)) {
          next.delete(messageId);
        }
        return next;
      });
    },
    []
  );

  /**
   * Limpar cache
   */
  const clearCache = useCallback(() => {
    cacheRef.current = {};
    setTranslatedMessages(new Map());
  }, []);

  /**
   * Limpar erros
   */
  const clearErrors = useCallback((messageId?: string) => {
    if (messageId) {
      setErrors(prev => {
        const next = new Map(prev);
        next.delete(messageId);
        return next;
      });
    } else {
      setErrors(new Map());
    }
  }, []);

  return {
    // Estado
    translatedMessages,
    loading,
    errors,

    // Métodos
    translateMessage,
    detectLanguage,
    toggleTranslation,
    clearCache,
    clearErrors,

    // Utilitários
    getTranslation: (messageId: string) => translatedMessages.get(messageId),
    isLoading: (messageId: string) => loading.get(messageId) ?? false,
    getError: (messageId: string) => errors.get(messageId),
    cacheSize: Object.keys(cacheRef.current).length,
  };
}

/**
 * Hook simples para tradução de mensagem única
 */
export function useMessageTranslation(
  text: string,
  enabled: boolean = false,
  targetLanguage: string = 'pt'
) {
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !text) {
      setTranslatedText(null);
      return;
    }

    const translate = async () => {
      setIsTranslating(true);
      setError(null);
      try {
        const result = await chatTranslationClient.translate({
          text,
          targetLang: targetLanguage,
        });
        setTranslatedText(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao traduzir');
      } finally {
        setIsTranslating(false);
      }
    };

    translate();
  }, [text, enabled, targetLanguage]);

  return { translatedText, isTranslating, error };
}
