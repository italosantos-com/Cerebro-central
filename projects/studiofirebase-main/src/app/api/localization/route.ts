import { NextRequest, NextResponse } from 'next/server';
import { translateText } from '@/ai/flows/translation-flow';
import { convertCurrency } from '@/ai/flows/currency-conversion-flow';

const LANGUAGE_LOCALE_FALLBACK: Record<string, string> = {
  pt: 'pt-BR',
  'pt-BR': 'pt-BR',
  en: 'en-US',
  'en-US': 'en-US',
  es: 'es-ES',
  'es-ES': 'es-ES',
  fr: 'fr-FR',
  'fr-FR': 'fr-FR',
  de: 'de-DE',
  'de-DE': 'de-DE',
  it: 'it-IT',
  'it-IT': 'it-IT',
  ja: 'ja-JP',
  'ja-JP': 'ja-JP',
  ko: 'ko-KR',
  'ko-KR': 'ko-KR',
  'zh-CN': 'zh-CN',
  zh: 'zh-CN',
  ru: 'ru-RU',
  'ru-RU': 'ru-RU',
  ar: 'ar-SA',
  'ar-SA': 'ar-SA',
};

const DEFAULT_LOCALE = 'en-US';

type TextBlock = {
  id: string;
  text: string;
  maxLength?: number;
};

type LocalizationResponse = {
  translations: { id: string; text: string }[];
  currency: {
    amount: number;
    currencyCode: string;
    currencySymbol: string;
  } | null;
  locale: string;
};

type TranslationAttempt = {
  id: string;
  text: string;
  failed: boolean;
};

function normalizeBlocks(blocks: unknown): TextBlock[] {
  if (!Array.isArray(blocks)) {
    return [];
  }
  return blocks
    .filter((block): block is TextBlock => Boolean(block) && typeof block.id === 'string' && typeof block.text === 'string')
    .map(block => {
      const maxLength = typeof block.maxLength === 'number' && Number.isFinite(block.maxLength)
        ? Math.max(1, Math.floor(block.maxLength))
        : undefined;
      return {
        id: block.id.trim(),
        text: block.text,
        maxLength,
      };
    });
}

function resolveLocale(targetLanguage?: string, explicit?: string): string {
  if (explicit && typeof explicit === 'string' && explicit.length > 0) {
    return explicit;
  }
  if (!targetLanguage) {
    return DEFAULT_LOCALE;
  }
  return LANGUAGE_LOCALE_FALLBACK[targetLanguage] ?? DEFAULT_LOCALE;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { textBlocks, targetLanguage, targetLocale, baseAmount } = body ?? {};

    const normalizedBlocks = normalizeBlocks(textBlocks);
    if (!targetLanguage || normalizedBlocks.length === 0) {
      return NextResponse.json({ error: 'Parâmetros inválidos para tradução.' }, { status: 400 });
    }

    const locale = resolveLocale(targetLanguage, targetLocale);

    const translationAttempts = await Promise.all(
      normalizedBlocks.map(async block => {
        try {
          const { translatedText } = await translateText({
            text: block.text,
            targetLanguage,
            maxLength: block.maxLength,
          });
          return { id: block.id, text: translatedText, failed: false } satisfies TranslationAttempt;
        } catch (error) {
          console.error('[localization] erro ao traduzir bloco', block.id, error);
          return { id: block.id, text: block.text, failed: true } satisfies TranslationAttempt;
        }
      })
    );
    const failedCount = translationAttempts.filter(item => item.failed).length;
    if (failedCount === translationAttempts.length) {
      return NextResponse.json(
        { error: 'Serviço de tradução indisponível no momento. Tente novamente em instantes.' },
        { status: 502 }
      );
    }
    const translations = translationAttempts.map(({ id, text }) => ({ id, text }));

    let currency: LocalizationResponse['currency'] = null;
    if (typeof baseAmount === 'number' && Number.isFinite(baseAmount) && baseAmount > 0) {
      try {
        const conversion = await convertCurrency({ targetLocale: locale, baseAmount });
        currency = conversion;
      } catch (error) {
        console.warn('[localization] falha ao obter câmbio', error);
      }
    }

    const payload: LocalizationResponse = {
      translations,
      currency,
      locale,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error('[localization] erro inesperado', error);
    return NextResponse.json({ error: 'Erro ao processar tradução.' }, { status: 500 });
  }
}
