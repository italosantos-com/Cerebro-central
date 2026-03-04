/**
 * Configurações específicas para build e ambiente
 */

export const BUILD_CONFIG = {
  // Debug só ativo em desenvolvimento
  enableDebug: process.env.NODE_ENV === 'development',
  
  // Features específicas por ambiente
  features: {
    debugCards: process.env.NODE_ENV === 'development',
    environmentBanner: process.env.NODE_ENV === 'development',
    resetButton: process.env.NODE_ENV === 'development',
    consoleLogging: process.env.NODE_ENV === 'development',
  },

  // URLs e endpoints
  api: {
    // Use explicit site base URL when provided (NEXT_PUBLIC_BASE_URL or NEXT_PUBLIC_SITE_URL)
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://creatorsphere-srajp.web.app'),
  },

  // Configurações de vídeo por ambiente
  video: {
    // Em produção, sempre tentar embeds primeiro
    preferEmbeds: process.env.NODE_ENV === 'production',
    
    // Timeout para carregamento de thumbnails
    thumbnailTimeout: process.env.NODE_ENV === 'development' ? 5000 : 3000,
  }
}

// Função helper para verificar se uma feature está ativa
export function isFeatureEnabled(feature: keyof typeof BUILD_CONFIG.features): boolean {
  return BUILD_CONFIG.features[feature]
}

// Função para logging condicional
export function debugLog(message: string, ...args: any[]) {
  if (BUILD_CONFIG.enableDebug) {
    console.log(`[DEBUG] ${message}`, ...args)
  }
}

// Função para console.log condicional
export function devLog(...args: any[]) {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args)
  }
}

// Função para detectar ambiente
export function getEnvironmentType(): 'localhost' | 'firebase' | 'production' {
  if (typeof window === 'undefined') return 'production'
  
  const hostname = window.location.hostname
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'localhost'
  }
  
  if (hostname.includes('firebase') || hostname.includes('web.app')) {
    return 'firebase'
  }
  
  return 'production'
}
