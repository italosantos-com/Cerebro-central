/**
 * Seletor de Idiomas para Tradução de Chat
 * Componente para escolher idioma alvo das traduções
 */

"use client";

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Globe, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSupportedLanguages, getDefaultTargetLanguage } from '@/lib/translation-config';

interface LanguageSelectorProps {
  onLanguageChange: (languageCode: string) => void;
  currentLanguage?: string;
  variant?: 'dropdown' | 'inline';
  className?: string;
}

export function LanguageSelector({
  onLanguageChange,
  currentLanguage,
  variant = 'dropdown',
  className,
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(currentLanguage || getDefaultTargetLanguage());
  const languages = getSupportedLanguages();

  const handleSelect = useCallback((langCode: string) => {
    setSelected(langCode);
    onLanguageChange(langCode);
    setIsOpen(false);
  }, [onLanguageChange]);

  const selectedLanguage = languages.find(lang => lang.code === selected);

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2 flex-wrap', className)}>
        {languages.slice(0, 5).map((lang) => (
          <Button
            key={lang.code}
            variant={selected === lang.code ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSelect(lang.code)}
            className="text-xs"
          >
            {lang.code.toUpperCase()}
          </Button>
        ))}
        {languages.length > 5 && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            +{languages.length - 5} mais
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background hover:bg-accent text-sm"
      >
        <Globe className="w-4 h-4" />
        <span>{selectedLanguage?.name || 'Selecionar idioma'}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-background border border-input rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-accent text-left',
                  selected === lang.code && 'bg-accent font-medium'
                )}
              >
                <div>
                  <div className="font-medium">{lang.name}</div>
                  <div className="text-xs text-muted-foreground">{lang.code}</div>
                </div>
                {selected === lang.code && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
