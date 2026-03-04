'use client'

import { useState, useEffect } from 'react'

export interface EnvironmentInfo {
  isLocalhost: boolean
  isProduction: boolean
  isDevelopment: boolean
  hostname: string
  protocol: string
  canUseEmbeds: boolean
}

export function useEnvironment(): EnvironmentInfo {
  const [environment, setEnvironment] = useState<EnvironmentInfo>({
    isLocalhost: false,
    isProduction: false,
    isDevelopment: true,
    hostname: '',
    protocol: 'http:',
    canUseEmbeds: false
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      const protocol = window.location.protocol
      
      const isLocalhost = hostname === 'localhost' || 
                         hostname === '127.0.0.1' || 
                         hostname.includes('localhost') ||
                         hostname.includes('127.0.0.1')
      
      const isProduction = hostname.includes('firebase') || 
                          hostname.includes('web.app') || 
                          hostname.includes('firebaseapp.com') ||
                          (!isLocalhost && protocol === 'https:')
      
      const isDevelopment = !isProduction
      
      // Embeds funcionam bem em produção com HTTPS
      const canUseEmbeds = isProduction && protocol === 'https:'

      setEnvironment({
        isLocalhost,
        isProduction,
        isDevelopment,
        hostname,
        protocol,
        canUseEmbeds
      })
    }
  }, [])

  return environment
}

// Função utilitária para ajustar URLs baseado no ambiente
export function getOptimalVideoUrl(originalUrl: string, embedUrl?: string, environment?: EnvironmentInfo) {
  if (!environment) {
    return originalUrl
  }

  // Se pode usar embeds e tem embed URL, usar embed
  if (environment.canUseEmbeds && embedUrl) {
    return embedUrl
  }

  // Se é localhost, sempre usar URL original
  if (environment.isLocalhost) {
    return originalUrl
  }

  // Fallback para URL original
  return originalUrl
}

// Função para determinar se deve mostrar embed ou link direto
export function shouldUseEmbed(platform: string, environment?: EnvironmentInfo): boolean {
  if (!environment) {
    return true // Default para embed
  }

  // SEMPRE tentar embed primeiro, independente do ambiente
  return true

  // Código antigo mantido como referência (comentado)
  /*
  // Em produção com HTTPS, usar embeds
  if (environment.canUseEmbeds) {
    return true
  }

  // Em localhost, não usar embeds do YouTube (problemas de CORS)
  if (environment.isLocalhost && platform === 'youtube') {
    return false
  }

  // Para outras plataformas em localhost, tentar embed
  if (environment.isLocalhost && (platform === 'vimeo' || platform === 'dailymotion')) {
    return true
  }

  return false
  */
}
