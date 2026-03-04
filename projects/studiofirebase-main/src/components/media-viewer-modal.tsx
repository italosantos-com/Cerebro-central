'use client';

import { useState } from 'react';
import Image from 'next/image';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Crown,
  Calendar,
  Eye,
  X
} from 'lucide-react';
import { MediaItem } from './exclusive-media-grid';

interface MediaViewerModalProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  hasAccess: boolean;
  onDownload?: (item: MediaItem) => void;
}

export default function MediaViewerModal({
  item,
  isOpen,
  onClose,
  hasAccess,
  onDownload
}: MediaViewerModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!item) return null;

  // Função para garantir URL válida
  const getValidUrl = (url: string) => {
    if (!url) return '/placeholder-photo.svg';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) return url;
    return '/placeholder-photo.svg';
  };

  const handleDownload = () => {
    if (onDownload && hasAccess) {
      onDownload(item);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Data inválida';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[calc(100%-2rem)] sm:w-full h-[85vh] sm:h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold line-clamp-1">
                {item.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {item.description || 'Conteúdo exclusivo para assinantes'}
              </DialogDescription>
            </div>
            
            {/* Badges e info */}
            <div className="flex items-center gap-2 ml-4">
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <Crown className="w-3 h-3 mr-1" />
                Exclusivo
              </Badge>
            </div>
          </div>
          
          {/* Meta informações */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(item.uploadDate)}
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Visualização premium
            </div>
            {item.tags && item.tags.length > 0 && (
              <div className="flex gap-1">
                {item.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Conteúdo principal */}
        <div className="flex-1 overflow-auto">
          <div className="relative w-full h-full min-h-[400px] bg-black flex items-center justify-center">
            {!hasAccess ? (
              /* Overlay de acesso negado */
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
                <div className="text-center text-white p-8">
                  <Crown className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
                  <h3 className="text-xl font-bold mb-2">Conteúdo Exclusivo</h3>
                  <p className="text-gray-300 mb-4">
                    Este conteúdo é exclusivo para assinantes premium
                  </p>
                  <Button variant="default" className="bg-gradient-to-r from-purple-600 to-pink-600">
                    Assinar Agora
                  </Button>
                </div>
              </div>
            ) : null}

            {item.type === 'video' ? (
              /* Player de vídeo */
              <div className="relative w-full h-full">
                <video
                  className="w-full h-full object-contain"
                  controls
                  poster={getValidUrl(item.thumbnail)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onVolumeChange={(e) => setIsMuted(e.currentTarget.muted)}
                >
                  <source src={getValidUrl(item.fullUrl)} type="video/mp4" />
                  Seu navegador não suporta vídeos HTML5.
                </video>
                
                {/* Controles customizados para mobile */}
                <div className="absolute bottom-4 right-4 flex gap-2 md:hidden">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-black/50 text-white border-0"
                    onClick={toggleFullscreen}
                  >
                    <Maximize className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              /* Visualizador de imagem */
              <div className="relative w-full h-full">
                <Image
                  src={getValidUrl(item.fullUrl)}
                  alt={item.title}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                  priority
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer com ações */}
        <div className="p-4 border-t bg-background">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {item.type === 'video' ? 'Vídeo' : 'Foto'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Qualidade: Premium
              </span>
            </div>
            
            {hasAccess && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Baixar
                </Button>
                
                {/* Botão de compartilhar (futuro) */}
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="hidden sm:flex items-center gap-2"
                >
                  Compartilhar
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
