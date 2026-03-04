'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, Eye, Share2, Download, ImageIcon, Lock, Crown, RefreshCw } from 'lucide-react';
import { useProfileConfig } from '@/hooks/use-profile-config';
import Image from 'next/image';
import Link from 'next/link';

interface GalleryItem {
  url: string;
  id: string;
  title?: string;
  isExclusive?: boolean;
  views?: number;
  likes?: number;
}

export default function FeedGallery() {
  const { settings, loading, profilePhoto, coverPhoto, galleryPhotos, refreshSettings } = useProfileConfig();
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (settings) {
      const items: GalleryItem[] = galleryPhotos.map((url, index) => ({
        url,
        id: `gallery-${index}`,
        title: `Foto ${index + 1}`,
        isExclusive: index % 3 === 0, // Algumas fotos são exclusivas
        views: Math.floor(Math.random() * 1000) + 50,
        likes: Math.floor(Math.random() * 200) + 10,
      }));

      // Adicionar foto de perfil como destaque se existir
      if (profilePhoto) {
        items.unshift({
          url: profilePhoto,
          id: 'profile-photo',
          title: 'Foto de Perfil',
          isExclusive: false,
          views: Math.floor(Math.random() * 500) + 100,
          likes: Math.floor(Math.random() * 100) + 20,
        });
      }

      setGalleryItems(items);
    }
  }, [settings, profilePhoto, galleryPhotos]);

  const toggleLike = (itemId: string) => {
    setLikedItems(prev => {
      const newLiked = new Set(prev);
      if (newLiked.has(itemId)) {
        newLiked.delete(itemId);
      } else {
        newLiked.add(itemId);
      }
      return newLiked;
    });
  };

  const handleShare = (item: GalleryItem) => {
    if (navigator.share) {
      navigator.share({
        title: item.title || 'Confira esta foto!',
        url: window.location.href
      });
    } else {
      // Fallback para copiar URL
      navigator.clipboard.writeText(window.location.href);
      // Aqui você pode adicionar um toast de sucesso
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4">
        <Card className="bg-card/90 backdrop-blur-xl border-primary/20">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando galeria...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (galleryItems.length === 0) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4">
        <Card className="bg-card/90 backdrop-blur-xl border-primary/20">
          <CardContent className="p-8 text-center">
            <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Galeria Vazia</h3>
            <p className="text-muted-foreground mb-4">
              Nenhuma foto foi adicionada ainda. Configure as imagens no painel administrativo.
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={refreshSettings}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </Button>
              <Button className="bg-primary hover:bg-primary/90" asChild>
                <Link href="/admin/settings">
                  Configurar Galeria
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      {/* Header da Galeria */}
      <Card className="bg-card/90 backdrop-blur-xl border-primary/20">
        <CardHeader>
          <CardTitle className="text-3xl text-white text-center flex items-center justify-center gap-2">
            <ImageIcon className="w-8 h-8" />
            Galeria Exclusiva
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshSettings}
              className="ml-2"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardTitle>
          <p className="text-center text-muted-foreground">
            {galleryItems.length} {galleryItems.length === 1 ? 'foto disponível' : 'fotos disponíveis'}
          </p>
        </CardHeader>
      </Card>

      {/* Cover Photo */}
      {coverPhoto && (
        <Card className="bg-card/90 backdrop-blur-xl border-primary/20 overflow-hidden">
          <div className="relative h-64 md:h-80">
            <Image
              src={coverPhoto}
              alt="Foto de Capa"
              fill
              className="object-contain bg-black/15"
              unoptimized={typeof coverPhoto === 'string' && /\.svg(\?|#|$)/i.test(coverPhoto)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-4 left-4">
              <Badge variant="secondary" className="bg-black/70 text-white">
                Foto de Capa
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Grid de Fotos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {galleryItems.map((item) => (
          <Card key={item.id} className="group bg-card/90 backdrop-blur-xl border-primary/20 overflow-hidden hover:shadow-xl transition-all duration-300">
            <div className="relative aspect-square">
              <Image
                src={item.url}
                alt={item.title || 'Foto da galeria'}
                fill
                className="object-contain bg-black/10 group-hover:scale-105 transition-transform duration-300"
              />

              {/* Overlay de Exclusividade */}
              {item.isExclusive && (
                <div className="absolute top-2 left-2">
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    VIP
                  </Badge>
                </div>
              )}

              {/* Overlay de Ações */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white/90 hover:bg-white"
                    onClick={() => toggleLike(item.id)}
                  >
                    <Heart
                      className={`w-4 h-4 ${likedItems.has(item.id) ? 'fill-red-500 text-red-500' : ''}`}
                    />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white/90 hover:bg-white"
                    onClick={() => handleShare(item)}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                  {item.isExclusive && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-white/90 hover:bg-white"
                    >
                      <Lock className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium truncate">{item.title}</h3>
                {item.isExclusive && (
                  <Badge variant="outline" className="text-xs">
                    Exclusivo
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {item.views}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    {item.likes}
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="p-1 h-auto"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Call to Action para Admin */}
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
        <CardContent className="p-6 text-center">
          <h3 className="text-xl font-semibold mb-2">Gerenciar Galeria</h3>
          <p className="text-muted-foreground mb-4">
            Adicione, edite ou remova fotos da galeria através do painel administrativo.
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              onClick={refreshSettings}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar Galeria
            </Button>
            <Button className="bg-primary hover:bg-primary/90" asChild>
              <Link href="/admin/settings">
                Ir para Configurações
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
