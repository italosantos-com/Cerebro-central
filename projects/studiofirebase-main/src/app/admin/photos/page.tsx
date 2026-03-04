"use client";

import { useState, useEffect, useRef } from 'react';
import { PlusCircle, Trash2, Upload, Link as LinkIcon, Edit, Save, Eye, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuth } from 'firebase/auth';

interface Photo {
  id: string;
  title: string;
  imageUrl: string;
  storagePath: string;
  createdAt: any;
  updatedAt?: any;
}

export default function AdminPhotosPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [activeTab, setActiveTab] = useState("upload");
  const [viewingPhoto, setViewingPhoto] = useState<Photo | null>(null);

  const isDriveUrl = (value?: string) => {
    if (!value) return false;
    const normalized = value.toLowerCase();
    return normalized.includes('drive.google.com') || normalized.includes('docs.google.com');
  };

  const getAdminAuthHeaders = async (): Promise<Record<string, string>> => {
    const user = getAuth().currentUser;
    if (!user) return {};
    const idToken = await user.getIdToken();
    return { Authorization: `Bearer ${idToken}` };
  };

  const fetchPhotos = async () => {
    setIsLoading(true);
    try {
      const authHeaders = await getAdminAuthHeaders();
      const response = await fetch('/api/admin/photos', {
        headers: authHeaders,
      });
      const data = await response.json();

      console.debug('[Admin Photos] Resposta da API', {
        status: response.status,
        ok: response.ok,
        success: data?.success,
        count: Array.isArray(data?.photos) ? data.photos.length : null
      });

      if (data.success) {
        setPhotos(data.photos || []);
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao carregar fotos",
          description: data.message || 'Erro desconhecido'
        });
      }
    } catch (error) {
      console.error("Error fetching photos: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar fotos",
        description: "Erro de conexão"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();

  }, []); // Executar apenas na montagem

  const resetForm = () => {
    setTitle('');
    setFile(null);
    setImageUrl('');
    setActiveTab("upload");
    setEditingId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validar tipo de arquivo
      if (!selectedFile.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          title: "Arquivo inválido",
          description: "Por favor, selecione um arquivo de imagem válido."
        });
        return;
      }

      // Validar tamanho (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (selectedFile.size > maxSize) {
        toast({
          variant: "destructive",
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB."
        });
        return;
      }

      setFile(selectedFile);
      setImageUrl(''); // Limpar URL se arquivo for selecionado
    }
  };

  const validateSubmit = () => {
    if (!title.trim()) throw new Error('Título é obrigatório.');
    if (activeTab === 'upload' && !file && !editingId) throw new Error('Arquivo de imagem é obrigatório.');
    if (activeTab === 'link' && !imageUrl.trim()) throw new Error('URL da imagem é obrigatória.');
    if (activeTab === 'link' && isDriveUrl(imageUrl)) {
      throw new Error('Links do Google Drive não são permitidos nesta seção. Use upload local ou URL pública direta.');
    }
  };

  const uploadIfNeeded = async (): Promise<string> => {
    if (!(activeTab === 'upload' && file && !editingId)) {
      return imageUrl;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadType', 'photo');
    formData.append('folder', 'photos');

    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      headers: await getAdminAuthHeaders(),
      body: formData,
    });

    const uploadData = await uploadResponse.json();
    if (!uploadData.success) {
      throw new Error(uploadData.message || 'Falha no upload');
    }
    return uploadData.url;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      validateSubmit();

      const finalImageUrl = await uploadIfNeeded();

      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/admin/photos/${editingId}` : '/api/admin/photos';
      const photoData = { title: title.trim(), imageUrl: finalImageUrl };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(await getAdminAuthHeaders()),
        },
        body: JSON.stringify(photoData),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Erro ao salvar foto');
      }

      toast({
        title: editingId ? 'Foto atualizada!' : 'Foto adicionada!',
        description: 'Operação realizada com sucesso.',
      });

      resetForm();
      setIsDialogOpen(false);
      await fetchPhotos();
    } catch (error: any) {
      console.error('Erro ao salvar foto:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar foto',
        description: error.message || 'Erro desconhecido',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (photo: Photo) => {
    setTitle(photo.title);
    setImageUrl(photo.imageUrl);
    setEditingId(photo.id);
    setActiveTab('link'); // Edição sempre usa link
    setIsDialogOpen(true);
  };

  const handleDelete = async (photo: Photo) => {
    if (!confirm("Tem certeza que deseja excluir esta foto?")) return;

    try {
      const response = await fetch(`/api/admin/photos/${photo.id}`, {
        method: 'DELETE',
        headers: await getAdminAuthHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Foto excluída",
          description: "Foto removida com sucesso."
        });
        await fetchPhotos();
      } else {
        throw new Error(data.message || 'Erro ao excluir foto');
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir foto",
        description: "Erro de conexão"
      });
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Data não disponível';
    try {
      if (date.toDate) {
        return date.toDate().toLocaleDateString('pt-BR');
      }
      return new Date(date).toLocaleDateString('pt-BR');
    } catch {
      return 'Data não disponível';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Photos</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie fotos com uploads via API e links externos
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Adicionar Photo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Photo' : 'Adicionar Nova Photo'}</DialogTitle>
              <DialogDescription>
                {editingId
                  ? 'Edite as informações da photo selecionada.'
                  : 'Adicione uma nova photo via upload ou link externo.'
                }
              </DialogDescription>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload de Arquivo
                </TabsTrigger>
                <TabsTrigger value="link" className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Link Externo
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                <div>
                  <Label htmlFor="file">Arquivo de Imagem</Label>
                  <Input
                    id="file"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    disabled={isSubmitting}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Formatos aceitos: JPG, PNG, WEBP. Máximo 10MB.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="link" className="space-y-4">
                <div>
                  <Label htmlFor="imageUrl">URL da Imagem</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    placeholder="https://exemplo.com/imagem.jpg"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Cole o link direto da imagem
                  </p>

                  {!!imageUrl?.trim() && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                      <div className="text-xs text-gray-600 mb-2">Preview:</div>
                      { }
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="max-h-40 rounded object-contain"
                        onError={(e) => {
                          console.error('[Admin Photos] Erro ao carregar preview (URL)', {
                            url: imageUrl,
                            currentSrc: e.currentTarget.src,
                            naturalWidth: e.currentTarget.naturalWidth,
                            naturalHeight: e.currentTarget.naturalHeight
                          });
                          e.currentTarget.src = 'https://placehold.co/400x300?text=Erro+ao+carregar';
                        }}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid gap-4">
              <div>
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  placeholder="Digite o título da photo"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
                {isSubmitting && <Save className="h-4 w-4 animate-spin" />}
                {editingId ? 'Atualizar' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando photos...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {photos.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-muted-foreground">
                <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhuma photo encontrada</p>
                <p className="text-sm">Adicione a primeira photo usando o botão acima</p>
              </div>
            </div>
          ) : (
            photos.map((photo) => (
              <Card key={photo.id} className="overflow-hidden">
                <div className="aspect-video relative bg-gray-100">
                  { }
                  <img
                    src={photo.imageUrl}
                    alt={photo.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('[Admin Photos] Erro ao carregar thumbnail', {
                        id: photo.id,
                        url: photo.imageUrl,
                        currentSrc: e.currentTarget.src,
                        naturalWidth: e.currentTarget.naturalWidth,
                        naturalHeight: e.currentTarget.naturalHeight
                      });
                      e.currentTarget.src = 'https://placehold.co/400x300?text=Erro+ao+carregar';
                    }}
                  />
                </div>
                <CardHeader className="p-4">
                  <CardTitle className="text-lg truncate">{photo.title}</CardTitle>
                  <CardDescription>
                    Criado em: {formatDate(photo.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingPhoto(photo)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(photo)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(photo)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Dialog para visualizar photo */}
      <Dialog open={!!viewingPhoto} onOpenChange={() => setViewingPhoto(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{viewingPhoto?.title}</DialogTitle>
          </DialogHeader>
          {viewingPhoto && (
            <div className="space-y-4">
              { }
              <img
                src={viewingPhoto.imageUrl}
                alt={viewingPhoto.title}
                className="w-full max-h-[70vh] object-contain rounded-lg"
                onError={(e) => {
                  console.error('[Admin Photos] Erro ao carregar imagem no modal', {
                    id: viewingPhoto.id,
                    url: viewingPhoto.imageUrl,
                    currentSrc: e.currentTarget.src,
                    naturalWidth: e.currentTarget.naturalWidth,
                    naturalHeight: e.currentTarget.naturalHeight
                  });
                  e.currentTarget.src = 'https://placehold.co/800x600?text=Erro+ao+carregar';
                }}
              />
              <div className="text-sm text-muted-foreground">
                <p><strong>ID:</strong> {viewingPhoto.id}</p>
                <p><strong>Criado em:</strong> {formatDate(viewingPhoto.createdAt)}</p>
                <p><strong>URL:</strong>
                  <a
                    href={viewingPhoto.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-primary hover:underline"
                  >
                    {viewingPhoto.imageUrl}
                    <ExternalLink className="h-3 w-3 inline ml-1" />
                  </a>
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}