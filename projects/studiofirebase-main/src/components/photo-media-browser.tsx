'use client'

import { useState, useRef, useEffect } from 'react'
import { X, ExternalLink, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { processVideoUrl } from '@/utils/video-url-processor'
import LocalhostPhotoBrowser from './localhost-photo-browser'

interface PhotoMediaBrowserProps {
  url: string
  title?: string
  onClose: () => void
  showFullscreen?: boolean
  allowDownload?: boolean
}

/**
 * Componente para exibir mídias de Google Photos, iCloud e outros provedores
 * que bloqueiam embed em iframe direto (X-Frame-Options)
 * 
 * Usando abordagem de modal-browser com tratamento de segurança.
 */
export default function PhotoMediaBrowser({
  url,
  title = 'Mídia',
  onClose,
  showFullscreen = true,
  allowDownload = false
}: PhotoMediaBrowserProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isMuted, setIsMuted] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mediaLoaded, setMediaLoaded] = useState(false)
  const [isLocalhost, setIsLocalhost] = useState(false)
  const [tokenExpired, setTokenExpired] = useState(false)

  const videoInfo = processVideoUrl(url)

  // Detectar localhost e tokens expirados
  useEffect(() => {
    const host = typeof window !== 'undefined' ? window.location.hostname : ''
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
    setIsLocalhost(isLocal)

    // Detectar token expirado
    if (url.includes('exp=')) {
      const expMatch = url.match(/exp=(\d+)/)
      if (expMatch) {
        const expTime = parseInt(expMatch[1]) * 1000
        if (expTime < Date.now()) {
          setTokenExpired(true)
        }
      }
    }
  }, [url])

  // Se é localhost com Google Photos/iCloud, mostrar alternativas
  if (
    isLocalhost &&
    (videoInfo.platform === 'google-photos' || videoInfo.platform === 'icloud')
  ) {
    return (
      <LocalhostPhotoBrowser
        url={url}
        title={title}
        onClose={onClose}
        platform={videoInfo.platform}
      />
    )
  }

  // Se token está expirado, mostrar componente apropriado
  if (tokenExpired) {
    return (
      <LocalhostPhotoBrowser
        url={url}
        title={title}
        onClose={onClose}
        platform={videoInfo.platform as 'google-photos' | 'icloud'}
      />
    )
  }

  const getDisplayTitle = (): string => {
    if (title && title !== 'Vídeo') return title

    switch (videoInfo.platform) {
      case 'google-photos':
        return 'Fotos do Google'
      case 'icloud':
        return 'Álbum iCloud'
      case 'google-drive':
        return 'Google Drive'
      default:
        return 'Mídia'
    }
  }

  const getPlatformColor = (): string => {
    switch (videoInfo.platform) {
      case 'google-photos':
        return 'bg-gradient-to-r from-blue-500 to-green-500'
      case 'icloud':
        return 'bg-gradient-to-r from-gray-600 to-blue-400'
      case 'google-drive':
        return 'bg-gradient-to-r from-blue-500 to-yellow-500'
      default:
        return 'bg-gray-700'
    }
  }

  const handleIframeLoad = () => {
    setIsLoading(false)
    setMediaLoaded(true)
  }

  const handleIframeError = () => {
    setIsLoading(false)
    setError('Não foi possível carregar a mídia. Tente abrir no link original.')
  }

  const handleFullscreen = () => {
    if (iframeRef.current?.requestFullscreen) {
      iframeRef.current.requestFullscreen()
    } else if ((iframeRef.current as any)?.webkitRequestFullscreen) {
      (iframeRef.current as any).webkitRequestFullscreen()
    }
  }

  // Tratamento especial para diferentes plataformas
  const getOptimizedUrl = (): string => {
    const baseUrl = url.split('?')[0].split('#')[0]

    switch (videoInfo.platform) {
      case 'google-photos':
        // Google Photos: adicionar parâmetro para visualização direta
        return url.includes('=') ? url : `${url}=dv`

      case 'icloud':
        // iCloud: usar URL original, mas pode precisar de intervenção manual
        return url

      case 'google-drive':
        // Google Drive: usar URL de preview
        return videoInfo.embedUrl || url

      default:
        return url
    }
  }

  const optimizedUrl = getOptimizedUrl()

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col"
      onClick={onClose}
    >
      {/* Header */}
      <div className={`${getPlatformColor()} px-4 py-3 flex items-center justify-between shadow-lg`}>
        <div className="flex items-center gap-3 text-white flex-1 min-w-0">
          <div className="flex-shrink-0">
            {videoInfo.platform === 'google-photos' && (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            )}
            {videoInfo.platform === 'icloud' && (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate text-sm">{getDisplayTitle()}</p>
            <p className="text-xs text-white/70 truncate">{title}</p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {showFullscreen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleFullscreen()
              }}
              className="text-white hover:bg-white/20"
              title="Modo tela cheia"
            >
              ⛶
            </Button>
          )}

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded text-xs transition-colors"
            title="Abrir no site original em nova aba"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Abrir Original</span>
          </a>

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="text-white hover:bg-red-500/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {error ? (
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Erro ao carregar</h3>
            <p className="text-sm text-white/70 mb-6">{error}</p>
            <div className="flex gap-3">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir Link
              </a>
              <Button variant="secondary" onClick={onClose} className="text-xs">
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full">
            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-white text-sm">Carregando mídia...</p>
                </div>
              </div>
            )}

            {/* iframe com tratamento de segurança */}
            <iframe
              ref={iframeRef}
              src={optimizedUrl}
              title={title}
              className="w-full h-full border-0"
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture; camera; microphone; geolocation"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              loading="lazy"
              style={{ background: '#000' }}
            />
          </div>
        )}
      </div>

      {/* Footer com info */}
      <div className="bg-black/50 px-4 py-2 flex items-center justify-between text-xs text-white/60">
        <div className="flex items-center gap-2">
          {mediaLoaded && (
            <>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Carregado</span>
            </>
          )}
        </div>
        <span className="hidden sm:inline">
          {videoInfo.platform
            ? `Plataforma: ${videoInfo.platform.toUpperCase()}`
            : 'Mídia externa'}
        </span>
      </div>
    </div>
  )
}
