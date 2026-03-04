'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, AlertCircle, Loader2 } from 'lucide-react'

interface FirebaseVideoPlayerProps {
  url: string
  title?: string
  className?: string
  showControls?: boolean
  autoplay?: boolean
  muted?: boolean
  poster?: string
  onError?: (error: string) => void
}

export default function FirebaseVideoPlayer({
  url,
  title = 'Vídeo',
  className = '',
  showControls = true,
  autoplay = false,
  muted = true,
  poster,
  onError
}: FirebaseVideoPlayerProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [canPlay, setCanPlay] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!videoRef.current) {
      return
    }

    const video = videoRef.current

    const handleLoadStart = () => setIsLoading(true)
    const handleCanPlay = () => {
      setIsLoading(false)
      setCanPlay(true)
      setHasError(false)
    }
    const handleError = (e: any) => {
      console.error('Erro ao carregar vídeo Firebase:', e)
      setIsLoading(false)
      setHasError(true)
      onError?.('Erro ao carregar vídeo do Firebase Storage')
    }
    const handleLoadedMetadata = () => {
      setIsLoading(false)
    }

    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('error', handleError)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('error', handleError)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [onError])

  if (hasError) {
    return (
      <div className={`relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center ${className}`}>
        <div className="text-center p-4">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Erro ao carregar vídeo</p>
          <p className="text-xs text-gray-500 mt-1">Verifique se o arquivo existe</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline mt-2 inline-block"
          >
            Abrir link direto
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-gray-600">Carregando vídeo...</p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        src={url}
        className="w-full h-full object-cover"
        controls={showControls}
        autoPlay={autoplay}
        muted={muted}
        poster={poster}
        preload="metadata"
        playsInline
        crossOrigin="anonymous"
      >
        <source src={url} type="video/mp4" />
        <source src={url} type="video/webm" />
        Seu navegador não suporta o elemento de vídeo.
      </video>

      {/* Overlay informativo quando não há controles */}
      {!showControls && canPlay && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <div className="text-center p-4">
            <Play className="w-12 h-12 text-white mx-auto mb-2" />
            <p className="text-sm text-white">Clique para reproduzir</p>
          </div>
        </div>
      )}
    </div>
  )
}
