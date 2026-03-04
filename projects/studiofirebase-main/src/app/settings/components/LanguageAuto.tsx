'use client';

import { useEffect, useState } from 'react';

export function LanguageAuto() {
  const [lang, setLang] = useState<string>('pt-BR');

  useEffect(() => {
    const browserLang =
      navigator.languages?.[0] ||
      navigator.language ||
      'pt-BR';
    
    setLang(browserLang);
  }, []);

  const getDisplayLang = (locale: string) => {
    const parts = locale.split('-');
    const language = parts[0];
    const region = parts[1];

    const names: Record<string, string> = {
      'pt': region === 'BR' ? 'Português (Brasil)' : 'Português',
      'en': region === 'US' ? 'English (US)' : 'English',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
      'it': 'Italiano',
      'ja': '日本語',
      'zh': '中文',
      'ar': 'العربية',
      'ru': 'Русский',
    };

    return names[language] || locale;
  };

  return (
    <div className="ios-row">
      <span className="ios-label">Idioma</span>
      <span className="ios-value">{getDisplayLang(lang)}</span>
    </div>
  );
}
