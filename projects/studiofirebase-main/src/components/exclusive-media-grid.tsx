'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Crown, 
  Download, 
  Play,
  Lock,
  Image as ImageIcon, 
  Video,
  Calendar
} from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import MediaViewerModal from '@/components/media-viewer-modal';
import { useExclusiveContent } from '@/hooks/use-exclusive-content'

export interface MediaItem {
  id: string;
  title: string;
  type: 'photo' | 'video';
  thumbnail: string;
  fullUrl: string;
  description?: string;
  uploadDate: string;
  exclusive: boolean;
  tags?: string[];
}

interface ExclusiveMediaGridProps {
  items: MediaItem[];
  hasAccess: boolean;
  onMediaClick?: (item: MediaItem) => void;
  showDownload?: boolean;
  className?: string;
}

export default function ExclusiveMediaGrid({
  items,
  hasAccess,
  onMediaClick,
  showDownload = true,
  className = ""
}: ExclusiveMediaGridProps) {
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleMediaClick = (item: MediaItem) => {
    if (onMediaClick) {
      onMediaClick(item);
    } else {
      // Abrir modal
      setSelectedItem(item);
      setIsModalOpen(true);
    }
  };

  const handleDownload = async (item: MediaItem) => {
    if (!hasAccess) {
      toast({
        title: "Acesso Negado",
        description: "Downloads são exclusivos para assinantes.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(item.fullUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.title}.${item.type === 'video' ? 'mp4' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Iniciado",
        description: "O arquivo está sendo baixado.",
      });
    } catch (error) {
      toast({
        title: "Erro no Download",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
    }
  };

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <Lock className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">Nenhum Conteúdo Disponível</h3>
        <p className="text-muted-foreground">
          Não há conteúdo exclusivo disponível no momento.
        </p>
      </div>
    );
  }

  // Função utilitária para garantir que o src seja válido para next/image
  function getValidImageSrc(src: string) {
    if (!src) return '/placeholder-photo.svg';
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) return src;
    // Se não for válido, retorna placeholder
    return '/placeholder-photo.svg';
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {items.map((item) => (
        <Card key={item.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300">
          <div className="relative aspect-video overflow-hidden">
            {/* Thumbnail */}
            <Image
              src={getValidImageSrc(item.thumbnail)}
              alt={item.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            
            {/* Overlay para vídeos */}
            {item.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="bg-white/90 rounded-full p-3">
                  <Play className="w-6 h-6 text-black" />
                </div>
              </div>
            )}
            
            {/* Badge de tipo */}
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="bg-black/70 text-white">
                {item.type === 'video' ? (
                  <><Video className="w-3 h-3 mr-1" /> Vídeo</>
                ) : (
                  <><ImageIcon className="w-3 h-3 mr-1" /> Foto</>
                )}
              </Badge>
            </div>
            
            {/* Badge exclusivo */}
            <div className="absolute top-2 right-2">
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <Crown className="w-3 h-3 mr-1" />
                Exclusivo
              </Badge>
            </div>

            {/* Overlay de ações */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleMediaClick(item)}
                className="bg-white/90 text-black hover:bg-white"
              >
                <Play className="w-4 h-4 mr-1" />
                Visualizar
              </Button>
              
              {showDownload && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDownload(item)}
                  className="bg-white/90 text-black hover:bg-white"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Baixar
                </Button>
              )}
            </div>
          </div>

          <CardContent className="p-4">
            <div className="space-y-2">
              <h3 className="font-semibold line-clamp-1">{item.title}</h3>
              
              {item.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
              )}
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(item.uploadDate).toLocaleDateString('pt-BR')}
                </div>
                
                {item.tags && item.tags.length > 0 && (
                  <div className="flex gap-1">
                    {item.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* Modal de visualização */}
      <MediaViewerModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedItem(null);
        }}
        hasAccess={hasAccess}
        onDownload={handleDownload}
      />
    </div>
  );
}

// Hook para buscar dados de mídia exclusiva - versão 1.0
export function useExclusiveMedia() {
  return useExclusiveContent()
}
