"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSubscriptionSettings } from '@/hooks/use-subscription-settings';
import { LOCALIZATION_ENTRIES, LOCALIZATION_ENTRY_MAP } from '@/localization/entries';

export type LanguageOption = {
  code: string;
  label: string;
  locale: string;
};

export type CurrencyState = {
  amount: number;
  currencyCode: string;
  currencySymbol: string;
};

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'pt', label: 'Português (Original)', locale: 'pt-BR' },
  { code: 'en', label: 'English', locale: 'en-US' },
  { code: 'es', label: 'Español', locale: 'es-ES' },
  { code: 'fr', label: 'Français', locale: 'fr-FR' },
  { code: 'de', label: 'Deutsch', locale: 'de-DE' },
  { code: 'it', label: 'Italiano', locale: 'it-IT' },
  { code: 'ja', label: '日本語', locale: 'ja-JP' },
  { code: 'ko', label: '한국어', locale: 'ko-KR' },
  { code: 'zh-CN', label: '中文', locale: 'zh-CN' },
  { code: 'ru', label: 'Русский', locale: 'ru-RU' },
  { code: 'ar', label: 'العربية', locale: 'ar-SA' },
];

const DEFAULT_LANGUAGE = LANGUAGE_OPTIONS[0];
const DEFAULT_CURRENCY: CurrencyState = {
  amount: 99,
  currencyCode: 'BRL',
  currencySymbol: 'R$',
};
const STORAGE_KEY = 'studio.localization.preferences.v1';
const RTL_LANGUAGES = new Set(['ar']);

const BASE_TRANSLATIONS = Object.values(LOCALIZATION_ENTRY_MAP).reduce<Record<string, string>>((acc, entry) => {
  acc[entry.id] = entry.defaultText;
  return acc;
}, {});

interface LocalizationContextValue {
  language: string;
  locale: string;
  translations: Record<string, string>;
  changeLanguage: (code: string) => Promise<void>;
  resetLanguage: () => void;
  isTranslating: boolean;
  availableLanguages: LanguageOption[];
  currency: CurrencyState;
  baseAmount: number;
  error: string | null;
}

const LocalizationContext = createContext<LocalizationContextValue | undefined>(undefined);

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const { pixValue, loading: subscriptionLoading } = useSubscriptionSettings();
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE.code);
  const [locale, setLocale] = useState(DEFAULT_LANGUAGE.locale);
  const [translations, setTranslations] = useState<Record<string, string>>({ ...BASE_TRANSLATIONS });
  const [currency, setCurrency] = useState<CurrencyState>(DEFAULT_CURRENCY);
  const [baseAmount, setBaseAmount] = useState(DEFAULT_CURRENCY.amount);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasBootstrapped = useRef(false);

  const persistState = useCallback(
    (nextState: Partial<{ language: string; locale: string; translations: Record<string, string>; currency: CurrencyState }>) => {
      if (typeof window === 'undefined') {
        return;
      }
      if (nextState.language === DEFAULT_LANGUAGE.code) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      const payload = {
        ...nextState,
        updatedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    },
    []
  );

  const applyDefaultState = useCallback(() => {
    setTranslations({ ...BASE_TRANSLATIONS });
    setLanguage(DEFAULT_LANGUAGE.code);
    setLocale(DEFAULT_LANGUAGE.locale);
    setCurrency({ amount: baseAmount, currencyCode: 'BRL', currencySymbol: 'R$' });
    setError(null);
    persistState({ language: DEFAULT_LANGUAGE.code });
  }, [baseAmount, persistState]);

  useEffect(() => {
    setBaseAmount(pixValue);
    if (language === DEFAULT_LANGUAGE.code) {
      setCurrency(curr => ({ ...curr, amount: pixValue, currencyCode: 'BRL', currencySymbol: 'R$' }));
    }
  }, [pixValue, language]);

  useEffect(() => {
    if (typeof window === 'undefined' || hasBootstrapped.current) {
      return;
    }

    hasBootstrapped.current = true;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setCurrency(curr => ({ ...curr, amount: pixValue }));
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<LocalizationContextValue> & { translations?: Record<string, string>; currency?: CurrencyState };
      if (parsed.language && parsed.translations) {
        const storedLanguage = LANGUAGE_OPTIONS.find(option => option.code === parsed.language) ?? DEFAULT_LANGUAGE;
        setLanguage(storedLanguage.code);
        setLocale(storedLanguage.locale);
        setTranslations({ ...BASE_TRANSLATIONS, ...parsed.translations });
        if (parsed.currency) {
          setCurrency(parsed.currency);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [pixValue]);

  const performChange = useCallback(
    async (code: string, opts?: { force?: boolean }) => {
      const option = LANGUAGE_OPTIONS.find(item => item.code === code) ?? DEFAULT_LANGUAGE;
      const isDefault = option.code === DEFAULT_LANGUAGE.code;

      if (!opts?.force && option.code === language) {
        return;
      }

      if (isDefault) {
        applyDefaultState();
        return;
      }

      setIsTranslating(true);
      setError(null);

      try {
        const response = await fetch('/api/localization', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            targetLanguage: option.code,
            targetLocale: option.locale,
            baseAmount,
            textBlocks: LOCALIZATION_ENTRIES.map(entry => ({
              id: entry.id,
              text: entry.defaultText,
              maxLength: entry.maxLength,
            })),
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? 'Não foi possível traduzir o conteúdo agora. Tente novamente.');
        }

        const data = (await response.json()) as {
          translations?: { id: string; text: string }[];
          currency?: CurrencyState;
        };

        const sanitize = (id: string, raw: string, fallback: string) => {
          if (!raw) return fallback;
          // Remove possíveis aspas extras geradas pelo prompt
          let txt = raw.replace(/^"|"$/g, '');
          // Remove qualquer marcação HTML para evitar quebra de layout
          txt = txt.replace(/<[^>]*>/g, '');
          // Colapsa espaços múltiplos
          txt = txt.replace(/\s+/g, ' ').trim();
          // Limite de tamanho (por entry quando definido) para evitar "explosão" de texto
          const entryMax = LOCALIZATION_ENTRY_MAP[id]?.maxLength;
          const maxLen = entryMax ?? Math.max(120, fallback.length * 3);
          if (txt.length > maxLen) {
            txt = txt.slice(0, maxLen - 3).trim() + '…';
          }
          // Evita texto vazio após sanitização
            if (!txt) return fallback;
          return txt;
        };

        const nextTranslations = { ...BASE_TRANSLATIONS };
        data.translations?.forEach(item => {
          const base = BASE_TRANSLATIONS[item.id] ?? item.id;
          nextTranslations[item.id] = sanitize(item.id, item.text, base);
        });

        // Aplicar estados de forma agrupada para reduzir re-renders em cadeia
        setTranslations(nextTranslations);
        setLanguage(option.code);
        setLocale(option.locale);
        setCurrency(data.currency ?? { amount: baseAmount, currencyCode: 'BRL', currencySymbol: 'R$' });
        persistState({
          language: option.code,
          locale: option.locale,
          translations: nextTranslations,
          currency: data.currency ?? { amount: baseAmount, currencyCode: 'BRL', currencySymbol: 'R$' },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro inesperado ao traduzir.');
      } finally {
        setIsTranslating(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language, baseAmount, persistState] // applyDefaultState é estável
  );

  useEffect(() => {
    if (subscriptionLoading) {
      return;
    }

    if (language !== DEFAULT_LANGUAGE.code) {
      performChange(language, { force: true });
    }
  }, [pixValue, subscriptionLoading, language, performChange]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.lang = locale;
    document.documentElement.dir = RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr';
  }, [language, locale]);

  const changeLanguage = useCallback(
    async (code: string) => {
      await performChange(code);
    },
    [performChange]
  );

  const resetLanguage = useCallback(() => {
    applyDefaultState();
  }, [applyDefaultState]);

  const contextValue = useMemo<LocalizationContextValue>(
    () => ({
      language,
      locale,
      translations,
      changeLanguage,
      resetLanguage,
      isTranslating,
      availableLanguages: LANGUAGE_OPTIONS,
      currency,
      baseAmount,
      error,
    }),
    [language, locale, translations, changeLanguage, resetLanguage, isTranslating, currency, baseAmount, error]
  );

  return <LocalizationContext.Provider value={contextValue}>{children}</LocalizationContext.Provider>;
}

export function useLocalization(): LocalizationContextValue {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
}

export { LANGUAGE_OPTIONS };
