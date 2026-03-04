/**
 * Configuração de Tradução de Chat
 * Centraliza configurações de tradução da aplicação
 */

// Verificar variáveis de ambiente necessárias
function validateEnv() {
  if (typeof window === 'undefined') {
    // Server-side
    if (!process.env.GOOGLE_TRANSLATE_API_KEY && !process.env.DEEPL_API_KEY) {
      console.warn('⚠️ Nenhuma chave de API de tradução configurada');
    }
  }
  // Client-side não precisa de chaves, usa API endpoints
}

validateEnv();

// Configuração padrão
export const translationConfig = {
  // Provedor padrão
  provider: (process.env.NEXT_PUBLIC_TRANSLATION_PROVIDER || 'google') as 'google' | 'deepl',

  // Idioma padrão para tradução
  defaultTargetLanguage: process.env.NEXT_PUBLIC_DEFAULT_TARGET_LANGUAGE || 'pt',

  // Duração do cache em ms
  cacheDuration: parseInt(process.env.NEXT_PUBLIC_TRANSLATION_CACHE_DURATION || '86400000'),

  // Tamanho máximo do cache
  maxCacheSize: parseInt(process.env.NEXT_PUBLIC_TRANSLATION_CACHE_SIZE || '100'),

  // Debug mode
  debug: process.env.NEXT_PUBLIC_TRANSLATION_DEBUG === 'true',

  // Idiomas suportados
  supportedLanguages: {
    pt: 'Português (Brasil)',
    pt_PT: 'Português (Portugal)',
    en: 'English',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
    it: 'Italiano',
    ja: 'Japanese',
    zh: '中文',
    zh_CN: '简体中文',
    zh_TW: '繁體中文',
    ko: '한국어',
    ru: 'Русский',
    pl: 'Polski',
    tr: 'Türkçe',
    ar: 'العربية',
    hi: 'हिन्दी',
  },

  // URLs de API
  api: {
    translate: '/api/chat/translate',
    detectLanguage: '/api/chat/detect-language',
  },

  // Timeout para requisições de tradução (ms)
  requestTimeout: 10000,

  // Retry configuration
  retry: {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
  },
} as const;

/**
 * Obtém o provedor de tradução configurado
 */
export function getTranslationProvider(): 'google' | 'deepl' {
  return translationConfig.provider;
}

/**
 * Obtém o idioma padrão
 */
export function getDefaultTargetLanguage(): string {
  return translationConfig.defaultTargetLanguage;
}

/**
 * Obtém nome amigável para um código de idioma
 */
export function getLanguageName(langCode: string): string {
  return translationConfig.supportedLanguages[langCode as keyof typeof translationConfig.supportedLanguages] || langCode;
}

/**
 * Obtém lista de idiomas suportados
 */
export function getSupportedLanguages() {
  return Object.entries(translationConfig.supportedLanguages).map(([code, name]) => ({
    code,
    name,
  }));
}

/**
 * Log para debug de tradução
 */
export function logTranslationDebug(message: string, data?: any) {
  if (translationConfig.debug) {
    console.log(`[Translation Debug] ${message}`, data || '');
  }
}

export default translationConfig;
