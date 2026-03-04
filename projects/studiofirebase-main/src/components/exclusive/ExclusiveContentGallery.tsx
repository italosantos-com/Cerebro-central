"use client";

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useExclusiveContent } from '@/hooks/use-exclusive-content';
import {
  Crown,
  Image as ImageIcon,
  Video,
  Play,
  Eye,
  Calendar,
  Lock,
  CreditCard,
} from "lucide-react";

interface ExclusiveContentGalleryProps {
  className?: string;
}

export default function ExclusiveContentGallery({ className }: ExclusiveContentGalleryProps) {
  const { content, loading, error, isSubscriber, requiresSubscription, recordView } = useExclusiveContent();
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all');

  const filteredContent = content.filter(item => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  const handleContentClick = (item: any) => {
    setSelectedContent(item);
    recordView(item.id);
  };

  if (loading) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Crown className="h-12 w-12 text-yellow-500 mx-auto mb-4 animate-pulse" />
        <p className="text-muted-foreground">Carregando conteúdo exclusivo...</p>
      </div>
    );
  }

  if (error || requiresSubscription) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="max-w-md mx-auto">
          <Lock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Conteúdo VIP
          </h3>
          <p className="text-muted-foreground mb-6">
            {requiresSubscription 
              ? "Este conteúdo é exclusivo para assinantes. Faça sua assinatura para ter acesso a fotos e vídeos especiais!"
              : error
            }
          </p>
          {requiresSubscription && (
            <Button className="gap-2">
              <CreditCard className="h-4 w-4" />
              Assinar Agora
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!isSubscriber) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Acesso restrito a assinantes</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <Crown className="h-6 w-6 text-yellow-500" />
          Conteúdo VIP
        </h2>
        <p className="text-muted-foreground">
          Conteúdo exclusivo para assinantes
        </p>
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">Todos ({content.length})</TabsTrigger>
          <TabsTrigger value="photo">
            Fotos ({content.filter(c => c.type === 'photo').length})
          </TabsTrigger>
          <TabsTrigger value="video">
            Vídeos ({content.filter(c => c.type === 'video').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter}>
          {filteredContent.length === 0 ? (
            <div className="text-center py-12">
              <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhum conteúdo {filter === 'all' ? '' : filter === 'photo' ? 'foto' : 'vídeo'} disponível no momento
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredContent.map((item) => (
                <Card
                  key={item.id}
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleContentClick(item)}
                >
                  <div className="aspect-square bg-muted relative group">
                    {item.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {item.type === 'photo' ? (
                          <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        ) : (
                          <Video className="h-12 w-12 text-muted-foreground" />
                        )}
                      </div>
                    )}
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {item.type === 'video' ? (
                        <Play className="h-8 w-8 text-white" />
                      ) : (
                        <Eye className="h-8 w-8 text-white" />
                      )}
                    </div>
                    
                    {/* Badges */}
                    <div className="absolute top-2 left-2">
                      <Badge variant={item.type === 'photo' ? 'default' : 'secondary'} className="text-xs">
                        {item.type === 'photo' ? 'Foto' : 'Vídeo'}
                      </Badge>
                    </div>
                    
                    <div className="absolute top-2 right-2">
                      <Crown className="h-4 w-4 text-yellow-500" />
                    </div>
                    
                    {/* View count */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 text-white text-xs bg-black/50 px-2 py-1 rounded">
                      <Eye className="h-3 w-3" />
                      {item.viewCount}
                    </div>
                  </div>
                  
                  <CardContent className="p-3">
                    <h3 className="font-medium truncate text-sm">{item.title}</h3>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs h-5">
                            {tag}
                          </Badge>
                        ))}
                        {item.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs h-5">
                            +{item.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal para visualizar conteúdo */}
      <Dialog open={!!selectedContent} onOpenChange={() => setSelectedContent(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              {selectedContent?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedContent && (
            <div className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                {selectedContent.type === 'photo' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedContent.url}
                    alt={selectedContent.title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video
                    src={selectedContent.url}
                    controls
                    className="w-full h-full"
                    poster={selectedContent.thumbnailUrl}
                  >
                    Seu navegador não suporta vídeos.
                  </video>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Badge variant={selectedContent.type === 'photo' ? 'default' : 'secondary'}>
                  {selectedContent.type === 'photo' ? 'Foto' : 'Vídeo'}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Eye className="h-3 w-3" />
                  {selectedContent.viewCount} visualizações
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(selectedContent.createdAt).toLocaleDateString('pt-BR')}
                </Badge>
              </div>
              
              {selectedContent.description && (
                <p className="text-muted-foreground">{selectedContent.description}</p>
              )}
              
              {selectedContent.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedContent.tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
