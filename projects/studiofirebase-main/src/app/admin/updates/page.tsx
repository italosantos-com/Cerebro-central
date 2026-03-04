'use client';

import { useState, useEffect } from 'react';
import { useAdminData } from '@/hooks/useAdminData';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, X, Edit2, Check, Camera, MapPin, Image as ImageIcon, UserPlus } from 'lucide-react';
import { SocialConnectionsStatus } from '@/components/admin/social-connections-status';
import { UpdateMediaUpload } from '@/components/admin/update-media-upload';
import { LocationPicker } from '@/components/admin/location-picker';
import { UserTagging } from '@/components/admin/user-tagging';
import { VisibilitySelector, type VisibilityType } from '@/components/admin/visibility-selector';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';

export default function AdminUpdatesPage() {
  const { toast } = useToast();
  
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showUserTagging, setShowUserTagging] = useState(false);
  const [newUpdate, setNewUpdate] = useState({
    title: '',
    description: '',
    category: 'announcement' as const,
    media: [] as Array<{ url: string; type: 'image' | 'video' }>,
    location: null as { name: string; latitude: number; longitude: number } | null,
    taggedUsers: [] as Array<{ uid: string; displayName: string; email?: string }>,
    visibility: 'public' as VisibilityType,
  });

  // Load updates from Firestore
  useEffect(() => {
    loadUpdates();
  }, []);

  const loadUpdates = async () => {
    try {
      setIsLoading(true);
      const updatesRef = collection(db, 'posts');
      const q = query(updatesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const updates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setData(updates);
      setError(null);
    } catch (err) {
      console.error('Error loading updates:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar atualizações');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUpdate = async () => {
    if (!newUpdate.description.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo obrigatório',
        description: 'Descrição é obrigatória',
      });
      return;
    }

    if (!auth.currentUser) {
      toast({
        variant: 'destructive',
        title: 'Não autenticado',
        description: 'Você precisa estar autenticado para publicar',
      });
      return;
    }

    setIsAdding(true);
    try {
      // Save to Firestore
      await addDoc(collection(db, 'posts'), {
        text: newUpdate.description,
        title: newUpdate.title || 'Atualização',
        mediaUrl: newUpdate.media.length > 0 ? newUpdate.media[0].url : null,
        media: newUpdate.media,
        address: newUpdate.location?.name || null,
        location: newUpdate.location ? {
          lat: newUpdate.location.latitude,
          lng: newUpdate.location.longitude,
        } : null,
        taggedUsers: newUpdate.taggedUsers.map(u => u.uid),
        visibility: newUpdate.visibility,
        userId: auth.currentUser.uid,
        category: newUpdate.category,
        published: false,
        createdAt: serverTimestamp(),
      });

      // Reload updates
      await loadUpdates();

      // Reset form
      setNewUpdate({ 
        title: '', 
        description: '', 
        category: 'announcement',
        media: [],
        location: null,
        taggedUsers: [],
        visibility: 'public',
      });
      setShowMediaUpload(false);
      setShowLocationPicker(false);
      setShowUserTagging(false);
      
      toast({
        title: 'Atualização publicada!',
        description: 'Sua atualização foi criada com sucesso',
      });
    } catch (err) {
      console.error('Error adding update:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar atualização',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    } finally {
      setIsAdding(false);
    }
  };

  // Helper function to validate media URLs (Firebase Storage URLs are trusted)
  const isValidMediaUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      // Accept Firebase Storage URLs and data URLs
      return urlObj.protocol === 'https:' || urlObj.protocol === 'data:';
    } catch {
      return false;
    }
  };

  const handleDeleteUpdate = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta atualização?')) return;

    try {
      await deleteDoc(doc(db, 'posts', id));
      await loadUpdates();
      
      toast({
        title: 'Atualização removida',
        description: 'A atualização foi removida com sucesso',
      });
    } catch (err) {
      console.error('Error deleting update:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao remover atualização',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    }
  };

  const handlePublishUpdate = async (id: string) => {
    try {
      const update = data.find(u => u.id === id);
      
      if (!update) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Atualização não encontrada',
        });
        return;
      }
      
      const updateRef = doc(db, 'posts', id);
      
      await updateDoc(updateRef, {
        published: !update.published,
      });
      
      await loadUpdates();
      
      toast({
        title: 'Status atualizado',
        description: update.published ? 'Atualização despublicada' : 'Atualização publicada',
      });
    } catch (err) {
      console.error('Error publishing update:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao publicar',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/30 rounded">
        <p className="text-destructive">Erro ao carregar atualizações: {error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">Atualizações e Notícias</h1>
        <p className="text-muted-foreground">Compartilhe novidades com seus seguidores</p>
      </div>

      {/* Social Media Connections Status - Above Container */}
      <SocialConnectionsStatus />

      {/* Main Composer Container - Similar to Meta Business Suite / Twitter */}
      <Card className="overflow-hidden shadow-lg">
        <div className="p-6">
          {/* Text Composition Area */}
          <div className="space-y-4 mb-6">
            <Textarea
              value={newUpdate.description}
              onChange={(e) =>
                setNewUpdate({ ...newUpdate, description: e.target.value })
              }
              placeholder="O que você gostaria de compartilhar? Ex: Foto de aniversário no Rio de Janeiro com @usuario"
              rows={6}
              className="w-full text-lg border-0 focus:ring-0 resize-none placeholder:text-muted-foreground text-foreground bg-muted/20"
            />
          </div>

          {/* Media Preview Section */}
          {newUpdate.media.length > 0 && (
            <div className="mb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {newUpdate.media.filter(item => isValidMediaUrl(item.url)).map((item, index) => (
                  <div key={index} className="relative group rounded-lg overflow-hidden">
                    {item.type === 'image' ? (
                      <Image
                        src={item.url}
                        alt={`Media ${index + 1}`}
                        width={400}
                        height={300}
                        className="w-full h-40 object-cover"
                        unoptimized={item.url.startsWith('data:')}
                      />
                    ) : (
                      <video
                        src={item.url}
                        className="w-full h-40 object-cover"
                        controls
                        preload="metadata"
                      />
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 w-7 h-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        const updatedMedia = newUpdate.media.filter((_, i) => i !== index);
                        setNewUpdate({ ...newUpdate, media: updatedMedia });
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location Display */}
          {newUpdate.location && (
            <div className="mb-4 inline-flex items-center gap-2 px-3 py-2 bg-primary/20 border border-primary/40 rounded-full text-sm">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-foreground font-medium">{newUpdate.location.name}</span>
              <button
                onClick={() => setNewUpdate({ ...newUpdate, location: null })}
                className="text-primary hover:text-primary/80 ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Tagged Users Display */}
          {newUpdate.taggedUsers.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {newUpdate.taggedUsers.map((user) => (
                <div
                  key={user.uid}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-accent/20 border border-accent/40 rounded-full text-sm"
                >
                  <span className="text-foreground font-medium">@{user.displayName}</span>
                  <button
                    onClick={() => {
                      const updatedUsers = newUpdate.taggedUsers.filter(u => u.uid !== user.uid);
                      setNewUpdate({ ...newUpdate, taggedUsers: updatedUsers });
                    }}
                    className="text-accent hover:text-accent/80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Expandable Sections */}
          {showMediaUpload && (
            <div className="mb-4 p-4 border border-border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-foreground">Adicionar Mídia</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowMediaUpload(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <UpdateMediaUpload
                onMediaChange={(media) => setNewUpdate({ ...newUpdate, media })}
                currentMedia={newUpdate.media}
              />
            </div>
          )}

          {showLocationPicker && (
            <div className="mb-4 p-4 border border-border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-foreground">Adicionar Localização</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowLocationPicker(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <LocationPicker
                onLocationChange={(location) => {
                  setNewUpdate({ ...newUpdate, location });
                  if (location) setShowLocationPicker(false);
                }}
                currentLocation={newUpdate.location}
              />
            </div>
          )}

          {showUserTagging && (
            <div className="mb-4 p-4 border border-border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-foreground">Marcar Usuários</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowUserTagging(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <UserTagging
                onUsersChange={(taggedUsers) => setNewUpdate({ ...newUpdate, taggedUsers })}
                currentUsers={newUpdate.taggedUsers}
              />
            </div>
          )}

          {/* Visibility Selector */}
          <div className="mb-4 p-4 border border-border rounded-lg bg-muted/30">
            <h3 className="font-semibold text-sm mb-3 text-foreground">Quem pode ver</h3>
            <VisibilitySelector
              value={newUpdate.visibility}
              onChange={(visibility) => setNewUpdate({ ...newUpdate, visibility })}
            />
          </div>
        </div>

        {/* Bottom Action Bar - Camera, Location, Media, Tag User */}
        <div className="border-t border-border bg-muted/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Media and Camera buttons both open media upload panel which contains upload and camera options */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowMediaUpload(!showMediaUpload)}
                className="hover:bg-primary/10 hover:text-primary"
                title="Adicionar mídia"
              >
                <ImageIcon className="w-5 h-5" />
                <span className="ml-2 hidden sm:inline">Mídia</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowMediaUpload(!showMediaUpload)}
                className="hover:bg-green-500/10 hover:text-green-400"
                title="Abrir câmera"
              >
                <Camera className="w-5 h-5" />
                <span className="ml-2 hidden sm:inline">Câmera</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowLocationPicker(!showLocationPicker)}
                className="hover:bg-accent/10 hover:text-accent"
                title="Adicionar localização"
              >
                <MapPin className="w-5 h-5" />
                <span className="ml-2 hidden sm:inline">Localização</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowUserTagging(!showUserTagging)}
                className="hover:bg-yellow-500/10 hover:text-yellow-400"
                title="Marcar usuários"
              >
                <UserPlus className="w-5 h-5" />
                <span className="ml-2 hidden sm:inline">Marcar</span>
              </Button>
            </div>

            <Button
              onClick={handleAddUpdate}
              disabled={isAdding || !newUpdate.description.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
            >
              {isAdding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publicando...
                </>
              ) : (
                'Publicar'
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Logo Display Below Publication */}
      <div className="flex justify-center py-4">
        <div className="flex items-center gap-3 px-6 py-3 bg-card border border-border rounded-full shadow-sm">
          <Image 
            src="/logo.png" 
            alt="StudioFirebase logo" 
            width={32} 
            height={32}
            className="rounded"
          />
          <span className="text-sm font-medium text-foreground">Powered by StudioFirebase</span>
        </div>
      </div>

      {/* Lista de Atualizações */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-foreground">
          Suas Atualizações ({data?.length || 0})
        </h2>

        {data?.length === 0 ? (
          <div className="p-8 text-center bg-muted/30 rounded border-2 border-dashed border-border">
            <p className="text-muted-foreground">Nenhuma atualização adicionada ainda</p>
            <p className="text-sm text-muted-foreground/70">
              Comece adicionando sua primeira atualização acima
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.map((update: any) => (
              <Card key={update.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{update.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {update.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                        {update.category}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          update.published
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {update.published ? 'Publicado' : 'Rascunho'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(update.createdAt).toLocaleDateString(
                          'pt-BR'
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={update.published ? 'default' : 'outline'}
                      onClick={() => handlePublishUpdate(update.id)}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteUpdate(update.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
