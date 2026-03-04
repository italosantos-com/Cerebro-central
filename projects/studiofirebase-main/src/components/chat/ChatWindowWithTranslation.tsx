/**
 * Chat Window com Suporte a Tradução Integrado
 * Wrapper que adiciona funcionalidade de tradução ao UnifiedChatWindow
 */

"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { useChatTranslation } from '@/hooks/use-chat-translation';
import { UnifiedChatWindow, type UnifiedChatWindowProps } from '@/components/UnifiedChatWindow';
import { LanguageSelector } from '@/components/chat/LanguageSelector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatWindowWithTranslationProps extends UnifiedChatWindowProps {
  /**
   * Habilitar tradução
   */
  enableTranslation?: boolean;

  /**
   * Idioma padrão para tradução
   */
  defaultTargetLanguage?: string;

  /**
   * Mostrar UI de seletor de idioma
   */
  showLanguageSelector?: boolean;

  /**
   * Posição do seletor de idioma
   */
  languageSelectorPosition?: 'header' | 'footer';

  /**
   * Callback quando idioma alvo muda
   */
  onLanguageChange?: (languageCode: string) => void;

  /**
   * Provider de tradução
   */
  translationProvider?: 'google' | 'deepl';
}

export function ChatWindowWithTranslation({
  enableTranslation = true,
  defaultTargetLanguage = 'pt',
  showLanguageSelector = true,
  languageSelectorPosition = 'header',
  onLanguageChange,
  translationProvider = 'google',
  className,
  children,
  ...props
}: ChatWindowWithTranslationProps) {
  const [targetLanguage, setTargetLanguage] = useState(defaultTargetLanguage);
  const [translationEnabled, setTranslationEnabled] = useState(enableTranslation);
  const [showSettings, setShowSettings] = useState(false);

  const {
    translatedMessages,
    loading,
    errors,
    clearCache,
  } = useChatTranslation({
    provider: translationProvider,
    cacheSize: 100,
  });

  const handleLanguageChange = useCallback((lang: string) => {
    setTargetLanguage(lang);
    onLanguageChange?.(lang);
  }, [onLanguageChange]);

  // Estatísticas de tradução
  const stats = useMemo(() => ({
    translated: translatedMessages.size,
    loading: Array.from(loading.values()).filter(Boolean).length,
    errors: errors.size,
  }), [translatedMessages, loading, errors]);

  const LanguageSelectorComponent = (
    <div className="flex items-center gap-2">
      {showLanguageSelector && (
        <LanguageSelector
          currentLanguage={targetLanguage}
          onLanguageChange={handleLanguageChange}
          variant="dropdown"
        />
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTranslationEnabled(!translationEnabled)}
        className={cn(
          'gap-2',
          translationEnabled && 'bg-primary/10'
        )}
      >
        <Globe className="w-4 h-4" />
        {translationEnabled ? 'Tradução ON' : 'Tradução OFF'}
      </Button>

      {stats.translated > 0 && (
        <Badge variant="secondary" className="text-xs">
          {stats.translated} traduzidas
        </Badge>
      )}

      {stats.loading > 0 && (
        <Badge variant="outline" className="text-xs animate-pulse">
          {stats.loading} traduzindo...
        </Badge>
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowSettings(!showSettings)}
      >
        <Settings className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header com controles de tradução */}
      {languageSelectorPosition === 'header' && (
        <div className="p-4 border-b space-y-2">
          {LanguageSelectorComponent}

          {/* Settings expandível */}
          {showSettings && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-3">
              <div className="text-sm font-medium">Configurações de Tradução</div>

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Mensagens traduzidas: <strong>{stats.translated}</strong>
                </div>

                {stats.loading > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Traduzindo: <strong>{stats.loading}</strong>
                  </div>
                )}

                {stats.errors > 0 && (
                  <div className="text-xs text-red-500">
                    Erros: <strong>{stats.errors}</strong>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  clearCache();
                  alert('Cache de tradução limpo');
                }}
              >
                Limpar Cache
              </Button>

              <div className="text-xs text-muted-foreground bg-background p-2 rounded">
                <strong>Dica:</strong> Use o botão "Traduzir" em cada mensagem para traduzir sob demanda.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chat Window */}
      <div className="flex-1 overflow-hidden">
        <UnifiedChatWindow
          className={cn(
            enableTranslation && 'chat-window-with-translation',
            className
          )}
          {...props}
        >
          {children}
        </UnifiedChatWindow>
      </div>

      {/* Footer com controles de tradução */}
      {languageSelectorPosition === 'footer' && (
        <div className="p-4 border-t">
          {LanguageSelectorComponent}
        </div>
      )}
    </div>
  );
}

export type { ChatWindowWithTranslationProps };
