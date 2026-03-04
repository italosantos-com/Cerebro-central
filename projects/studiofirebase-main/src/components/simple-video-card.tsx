'use client'

import { Play } from 'lucide-react'
import { processVideoUrl } from '@/utils/video-url-processor'

interface SimpleVideoCardProps {
  url: string
  title: string
  className?: string
  onClick?: () => void
}

export default function SimpleVideoCard({
  url,
  title,
  className = '',
  onClick
}: SimpleVideoCardProps) {
  // Processar URL para determinar plataforma
  const videoInfo = processVideoUrl(url)
  
  // Definir cor baseada na plataforma
  const getBackgroundColor = () => {
    switch (videoInfo.platform) {
      case 'youtube': return 'bg-red-600'
      case 'vimeo': return 'bg-blue-600'
      case 'dailymotion': return 'bg-orange-600'
      case 'direct': return 'bg-gray-700'
      default: return 'bg-gray-600'
    }
  }

  const getPlatformName = () => {
    switch (videoInfo.platform) {
      case 'youtube': return 'YouTube'
      case 'vimeo': return 'Vimeo'
      case 'dailymotion': return 'Dailymotion'
      case 'direct': return 'Vídeo Direto'
      default: return 'Vídeo'
    }
  }

  return (
    <div 
      className={`relative ${getBackgroundColor()} rounded-lg overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity ${className}`}
      onClick={onClick}
    >
      <div className="text-center p-6 w-full">
        <Play className="w-16 h-16 text-white mx-auto mb-3" />
        <p className="text-lg text-white font-bold mb-1">{getPlatformName()}</p>
        <p className="text-sm text-white/90 line-clamp-2">{title}</p>
      </div>
      
      {/* Badge no canto */}
      <div className="absolute top-3 right-3">
        <div className="bg-black/40 text-white text-xs px-2 py-1 rounded">
          {videoInfo.platform}
        </div>
      </div>
    </div>
  )
}
