"use client";

import { useState, useEffect, useRef } from 'react';
import { PlusCircle, Trash2, Edit, Upload, Link as LinkIcon, Image as ImageIcon, Eye, Loader2, Save, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuth } from 'firebase/auth';

interface Photo {
    id: string;
    title: string;
    description?: string;
    price?: number;
    photoUrl: string;
    photoStoragePath?: string;
    createdAt?: Date | null;
    updatedAt?: Date | null;
    storageType?: string;
}

interface SocialMediaItem {
    id: string;
    mediaUrl: string;
    thumbnailUrl?: string;
    caption?: string;
    platform: 'instagram' | 'twitter' | 'facebook';
}

export default function AdminFotosPage() {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getAdminAuthHeaders = async (): Promise<Record<string, string>> => {
        const user = getAuth().currentUser;
        if (!user) return {};
        const idToken = await user.getIdToken();
        return { Authorization: `Bearer ${idToken}` };
    };

    const [photos, setPhotos] = useState<Photo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewingPhoto, setViewingPhoto] = useState<Photo | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoUrl, setPhotoUrl] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [activeTab, setActiveTab] = useState("upload");
    const [socialPlatform, setSocialPlatform] = useState<'instagram' | 'twitter' | 'facebook'>('instagram');
    const [socialItems, setSocialItems] = useState<SocialMediaItem[]>([]);
    const [isLoadingSocial, setIsLoadingSocial] = useState(false);

    const isDriveUrl = (value?: string) => {
        if (!value) return false;
        const normalized = value.toLowerCase();
        return normalized.includes('drive.google.com') || normalized.includes('docs.google.com');
    };

    const fetchPhotos = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/fotos', {
                headers: await getAdminAuthHeaders(),
            });
            const data = await response.json();

            console.debug('[Admin Fotos] Resposta da API', {
                status: response.status,
                ok: response.ok,
                success: data?.success,
                count: Array.isArray(data?.photos) ? data.photos.length : null
            });

            if (data.success) {
                console.log('Fotos carregadas:', data.photos);
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
        setDescription('');
        setPhotoFile(null);
        setPhotoUrl('');
        setUploadProgress(0);
        setActiveTab("upload");
        setEditingId(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validar tipo de arquivo
            if (!file.type.startsWith('image/')) {
                toast({
                    variant: "destructive",
                    title: "Arquivo inválido",
                    description: "Por favor, selecione um arquivo de imagem válido."
                });
                return;
            }

            // Validar tamanho (máximo 10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                toast({
                    variant: "destructive",
                    title: "Arquivo muito grande",
                    description: "O arquivo deve ter no máximo 10MB. Para arquivos maiores, use um link externo."
                });
                return;
            }

            setPhotoFile(file);
            setPhotoUrl(''); // Limpar URL se arquivo for selecionado
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast({ variant: "destructive", title: "Título é obrigatório." });
            return;
        }

        if (activeTab === 'upload' && !photoFile && !editingId) {
            toast({ variant: "destructive", title: "Arquivo de foto é obrigatório." });
            return;
        }
        if (activeTab === 'link' && (!photoUrl || !photoUrl.trim())) {
            toast({ variant: "destructive", title: "URL da foto é obrigatória." });
            return;
        }
        if ((activeTab === 'link' || activeTab === 'social') && isDriveUrl(photoUrl)) {
            toast({
                variant: "destructive",
                title: "Link não permitido",
                description: "Links do Google Drive não são permitidos nesta seção. Use upload local ou URL pública direta."
            });
            return;
        }
        if (activeTab === 'social' && (!photoUrl || !photoUrl.trim())) {
            toast({ variant: "destructive", title: "Selecione uma mídia social para continuar." });
            return;
        }

        setIsSubmitting(true);
        setUploadProgress(0);
        let finalPhotoUrl = photoUrl || '';
        let storageType = 'external';

        try {
            if (activeTab === 'upload' && photoFile && !editingId) {
                console.log('Iniciando upload do arquivo:', photoFile.name, 'Tamanho:', photoFile.size);

                const formData = new FormData();
                formData.append('file', photoFile);
                formData.append('uploadType', 'photo');
                formData.append('title', title.trim());
                formData.append('description', description.trim());
                formData.append('folder', 'photos');

                // Simular progresso
                const progressInterval = setInterval(() => {
                    setUploadProgress(prev => {
                        if (prev >= 90) return prev;
                        return prev + Math.random() * 10;
                    });
                }, 300);

                console.log('Enviando para API de upload...');
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    headers: await getAdminAuthHeaders(),
                    body: formData
                });

                const data = await response.json();
                clearInterval(progressInterval);

                if (data.success) {
                    finalPhotoUrl = data.url;
                    storageType = data.storageType || 'api-upload';
                    setUploadProgress(100);
                    console.log('Upload via API bem-sucedido:', finalPhotoUrl);

                    // Salvar na coleção de fotos (admin)
                    const saveResponse = await fetch('/api/admin/fotos', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(await getAdminAuthHeaders()),
                        },
                        body: JSON.stringify({
                            title: title.trim(),
                            description: (description || '').trim(),
                            photoUrl: finalPhotoUrl,
                            storageType,
                            fileName: data.fileName,
                        })
                    });

                    const saveData = await saveResponse.json();

                    if (!saveData.success) {
                        throw new Error(saveData.message || 'Erro ao salvar foto após upload');
                    }

                    toast({
                        title: "Foto Adicionada!",
                        description: `Foto enviada com sucesso! (${storageType})`,
                    });

                    resetForm();
                    setIsDialogOpen(false);
                    await fetchPhotos();
                    return;
                } else {
                    throw new Error(data.message || 'Falha no upload via API');
                }
            }

            // Para links externos ou edição
            console.log('Salvando foto...');
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId
                ? `/api/admin/fotos/${editingId}`
                : '/api/admin/fotos';

            let finalPhotoUrlForSave = finalPhotoUrl;
            if (editingId && (!finalPhotoUrl || !finalPhotoUrl.trim())) {
                const currentPhoto = photos.find(p => p.id === editingId);
                if (currentPhoto) {
                    finalPhotoUrlForSave = currentPhoto.photoUrl;
                }
            }

            const photoData = {
                title: title.trim(),
                description: (description || '').trim(),
                photoUrl: finalPhotoUrlForSave,
                storageType,
            };

            console.log('Dados da foto:', photoData);

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(photoData)
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: editingId ? "Foto Atualizada!" : "Foto Adicionada!",
                    description: editingId
                        ? "Foto atualizada com sucesso!"
                        : "Foto com link externo adicionada com sucesso!",
                });

                resetForm();
                setIsDialogOpen(false);
                await fetchPhotos();
            } else {
                throw new Error(data.message || 'Erro ao salvar foto');
            }

        } catch (error: any) {
            console.error("Erro detalhado ao salvar foto:", error);

            let errorMessage = "Ocorreu um erro ao salvar a foto.";

            if (error.message) {
                errorMessage = error.message;
            }

            toast({
                variant: "destructive",
                title: "Erro ao salvar foto",
                description: errorMessage
            });
        } finally {
            setIsSubmitting(false);
            setUploadProgress(0);
        }
    };

    const handleEdit = (photo: Photo) => {
        setTitle(photo.title);
        setDescription(photo.description || '');
        setPhotoUrl(photo.photoUrl);
        setEditingId(photo.id);

        if (photo.storageType && (photo.storageType === 'firebase-storage' || photo.storageType === 'api-upload')) {
            setActiveTab('upload');
        } else {
            setActiveTab('link');
        }

        setIsDialogOpen(true);
    };

    const handleCancelEdit = () => {
        resetForm();
        setIsDialogOpen(false);
    };

    const handleViewPhoto = (photo: Photo) => {
        setViewingPhoto(photo);
        setIsViewDialogOpen(true);
    };

    const handleDeletePhoto = async (photo: Photo) => {
        if (!confirm("Tem certeza que deseja excluir esta foto? Esta ação é irreversível.")) return;

        try {
            const response = await fetch(`/api/admin/fotos/${photo.id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Foto Excluída",
                    description: "Foto removida com sucesso."
                });
                await fetchPhotos();
            } else {
                throw new Error(data.message || 'Erro ao excluir foto');
            }
        } catch (error) {
            console.error("Error deleting photo: ", error);
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
            if (date instanceof Date) {
                return date.toLocaleDateString('pt-BR');
            }
            return new Date(date).toLocaleDateString('pt-BR');
        } catch {
            return 'Data não disponível';
        }
    };

    const loadSocialMedia = async () => {
        if (socialPlatform === 'facebook') {
            toast({
                variant: 'destructive',
                title: 'Facebook ainda não disponível',
                description: 'Conecte Facebook em Integrações e use Link Externo por enquanto.'
            });
            return;
        }

        setIsLoadingSocial(true);
        setSocialItems([]);

        try {
            if (socialPlatform === 'instagram') {
                const response = await fetch('/api/instagram/media?limit=30');
                const data = await response.json();

                if (!response.ok || !data?.success) {
                    throw new Error(data?.error || 'Falha ao carregar mídia do Instagram');
                }

                const items = (data.media || [])
                    .filter((item: any) => item.media_type === 'IMAGE' || item.media_type === 'CAROUSEL_ALBUM')
                    .map((item: any) => ({
                        id: String(item.id),
                        mediaUrl: item.media_url,
                        thumbnailUrl: item.media_url,
                        caption: item.caption,
                        platform: 'instagram' as const,
                    }));

                setSocialItems(items);
                return;
            }

            const response = await fetch('/api/twitter/fotos?force=true', {
                headers: await getAdminAuthHeaders(),
            });
            const data = await response.json();

            if (!response.ok || !data?.success) {
                throw new Error(data?.error || 'Falha ao carregar mídia do Twitter');
            }

            const items = (data.tweets || [])
                .flatMap((tweet: any) => (tweet.media || [])
                    .filter((media: any) => media.type === 'photo' && media.url)
                    .map((media: any, index: number) => ({
                        id: `${tweet.id}-${index}`,
                        mediaUrl: media.url,
                        thumbnailUrl: media.url,
                        caption: tweet.text,
                        platform: 'twitter' as const,
                    })));

            setSocialItems(items);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar mídia social',
                description: error?.message || 'Não foi possível carregar as mídias.'
            });
        } finally {
            setIsLoadingSocial(false);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="rounded-xl bg-black/90 border border-white/10 p-4 backdrop-blur-sm">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Gerenciar Fotos</h1>
                    <p className="text-white/60 mt-1 text-sm">
                        Adicione e gerencie fotos para venda avulsa
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <PlusCircle className="h-4 w-4" />
                            Adicionar Foto
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Editar Foto' : 'Adicionar Nova Foto'}</DialogTitle>
                            <DialogDescription>
                                {editingId
                                    ? 'Edite as informações da foto selecionada.'
                                    : 'Adicione uma nova foto à sua galeria.'
                                }
                            </DialogDescription>
                        </DialogHeader>

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="upload">Upload de Arquivo</TabsTrigger>
                                <TabsTrigger value="link">Link Externo</TabsTrigger>
                                <TabsTrigger value="social">Instagram/Twitter</TabsTrigger>
                            </TabsList>

                            <TabsContent value="upload" className="space-y-4">
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="photoFile">Arquivo de Foto</Label>
                                        <Input
                                            id="photoFile"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            ref={fileInputRef}
                                            disabled={isSubmitting}
                                        />
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Formatos aceitos: JPG, PNG, WEBP, etc. Máximo 10MB.
                                        </p>
                                    </div>

                                    {uploadProgress > 0 && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span>Progresso do upload</span>
                                                <span>{uploadProgress.toFixed(0)}%</span>
                                            </div>
                                            <Progress value={uploadProgress} />
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="link" className="space-y-4">
                                <div>
                                    <Label htmlFor="photoUrl">URL da Foto</Label>
                                    <Input
                                        id="photoUrl"
                                        type="url"
                                        placeholder="https://exemplo.com/foto.jpg"
                                        value={photoUrl}
                                        onChange={e => setPhotoUrl(e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Cole o link direto da imagem (.jpg, .png, .webp, etc.)
                                    </p>

                                    {/* Preview da URL */}
                                    {photoUrl && photoUrl.trim() && (
                                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                                            <div className="text-xs text-gray-600 mb-2">Preview:</div>
                                            { }
                                            <img
                                                src={photoUrl}
                                                alt="Preview"
                                                className="max-h-40 rounded object-contain"
                                                onError={(e) => {
                                                    console.error('[Admin Fotos] Erro ao carregar preview (URL)', {
                                                        url: photoUrl,
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

                            <TabsContent value="social" className="space-y-4">
                                <div className="space-y-3">
                                    <Label>Fonte</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Button type="button" variant={socialPlatform === 'instagram' ? 'default' : 'outline'} onClick={() => setSocialPlatform('instagram')}>
                                            Instagram
                                        </Button>
                                        <Button type="button" variant={socialPlatform === 'twitter' ? 'default' : 'outline'} onClick={() => setSocialPlatform('twitter')}>
                                            Twitter
                                        </Button>
                                        <Button type="button" variant={socialPlatform === 'facebook' ? 'default' : 'outline'} onClick={() => setSocialPlatform('facebook')}>
                                            Facebook
                                        </Button>
                                    </div>

                                    <Button type="button" variant="secondary" onClick={loadSocialMedia} disabled={isLoadingSocial}>
                                        {isLoadingSocial ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                Carregando mídias...
                                            </>
                                        ) : (
                                            'Carregar mídias da fonte selecionada'
                                        )}
                                    </Button>

                                    {socialItems.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1 border rounded-md">
                                            {socialItems.map((item) => {
                                                const selected = photoUrl === item.mediaUrl;
                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => setPhotoUrl(item.mediaUrl)}
                                                        className={`relative rounded overflow-hidden border-2 ${selected ? 'border-primary' : 'border-transparent'}`}
                                                        title={item.caption || 'Mídia social'}
                                                    >
                                                        <img
                                                            src={item.thumbnailUrl || item.mediaUrl}
                                                            alt={item.caption || 'Mídia social'}
                                                            className="w-full h-24 object-cover"
                                                        />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {photoUrl && (
                                        <p className="text-xs text-muted-foreground break-all">
                                            URL selecionada: {photoUrl}
                                        </p>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>

                        <div className="grid gap-4">
                            <div>
                                <Label htmlFor="title">Título *</Label>
                                <Input
                                    id="title"
                                    placeholder="Título da foto"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div>
                                <Label htmlFor="description">Descrição</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Descrição da foto"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    rows={3}
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={handleCancelEdit} disabled={isSubmitting}>
                                <X className="h-4 w-4 mr-2" />
                                Cancelar
                            </Button>
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        {editingId ? <Save className="h-4 w-4 mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />}
                                        {editingId ? 'Atualizar Foto' : 'Salvar Foto'}
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" />
                        Fototeca
                    </CardTitle>
                    <CardDescription>
                        Gerencie as fotos disponíveis para venda avulsa no seu site.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : photos.length === 0 ? (
                        <div className="text-center py-10">
                            <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">Nenhuma foto adicionada ainda.</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Clique em &quot;Adicionar Foto&quot; para começar.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {photos.map((photo) => (
                                <Card key={photo.id} className="overflow-hidden">
                                    <CardHeader className="p-0">
                                        <div className="aspect-square bg-muted overflow-hidden relative group">
                                            { }
                                            <img
                                                src={photo.photoUrl}
                                                alt={photo.title}
                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                onError={(e) => {
                                                    console.error('[Admin Fotos] Erro ao carregar thumbnail', {
                                                        id: photo.id,
                                                        url: photo.photoUrl,
                                                        currentSrc: e.currentTarget.src,
                                                        naturalWidth: e.currentTarget.naturalWidth,
                                                        naturalHeight: e.currentTarget.naturalHeight
                                                    });
                                                    e.currentTarget.src = 'https://placehold.co/400x400?text=Erro+ao+carregar';
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="gap-2"
                                                    onClick={() => handleViewPhoto(photo)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    Visualizar
                                                </Button>
                                            </div>
                                            <Badge className="absolute top-2 right-2">
                                                {photo.storageType === 'firebase-storage' || photo.storageType === 'api-upload' ? 'Storage' : 'Externo'}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        <h3 className="font-semibold truncate">{photo.title}</h3>
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                            {photo.description || 'Sem descrição'}
                                        </p>
                                        <div className="flex items-center justify-between mt-3">
                                            <p className="text-xs text-muted-foreground">
                                                {formatDate(photo.createdAt)}
                                            </p>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex justify-end gap-2 p-4 pt-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEdit(photo)}
                                            disabled={editingId === photo.id}
                                        >
                                            <Edit className="h-3 w-3 mr-1" />
                                            Editar
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDeletePhoto(photo)}
                                            disabled={editingId === photo.id}
                                        >
                                            <Trash2 className="h-3 w-3 mr-1" />
                                            Excluir
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal para visualizar foto */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{viewingPhoto?.title}</DialogTitle>
                        <DialogDescription>
                            {viewingPhoto?.description || 'Sem descrição'}
                        </DialogDescription>
                    </DialogHeader>

                    {viewingPhoto && (
                        <div className="space-y-4">
                            <div className="bg-black rounded-lg overflow-hidden flex items-center justify-center min-h-[400px]">
                                { }
                                <img
                                    src={viewingPhoto.photoUrl}
                                    alt={viewingPhoto.title}
                                    className="max-w-full max-h-[600px] object-contain"
                                    onError={(e) => {
                                        console.error('[Admin Fotos] Erro ao carregar imagem no modal', {
                                            id: viewingPhoto.id,
                                            url: viewingPhoto.photoUrl,
                                            currentSrc: e.currentTarget.src,
                                            naturalWidth: e.currentTarget.naturalWidth,
                                            naturalHeight: e.currentTarget.naturalHeight
                                        });
                                        e.currentTarget.src = 'https://placehold.co/800x600?text=Erro+ao+carregar';
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            Criado em: {formatDate(viewingPhoto.createdAt)}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge>
                                            {viewingPhoto.storageType === 'firebase-storage' || viewingPhoto.storageType === 'api-upload' ? 'Firebase Storage' : 'Link Externo'}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Ações</h4>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(viewingPhoto.photoUrl, '_blank')}
                                            className="text-xs"
                                        >
                                            <ExternalLink className="h-3 w-3 mr-1" />
                                            Abrir Original
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                navigator.clipboard.writeText(viewingPhoto.photoUrl);
                                                toast({
                                                    title: "✅ URL Copiada!",
                                                    description: "URL da foto copiada para a área de transferência",
                                                    duration: 2000
                                                });
                                            }}
                                            className="text-xs"
                                        >
                                            📋 Copiar URL
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
