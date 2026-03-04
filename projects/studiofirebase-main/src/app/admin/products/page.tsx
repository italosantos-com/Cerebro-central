
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { PlusCircle, MoreHorizontal, Edit, Trash2, Save, X, Upload, Link as LinkIcon, Video, Eye, Play, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { getAuth } from 'firebase/auth';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SmartVideoPlayer, { SmartVideoThumbnail } from '@/components/smart-video-player';
import { processVideoUrl, detectContentType, isValidUrl } from '@/utils/video-url-processor';
import { useEnvironment } from '@/hooks/use-environment';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  status: 'active' | 'inactive';
  sales: number;
  createdAt: any;
  imageUrl: string;
  videoUrl?: string;
  type?: 'photo' | 'video';
  thumbnailUrl?: string;
  storageType?: string;
  videoStoragePath?: string;
  thumbnailStoragePath?: string;
  updatedAt?: any;
}

export default function AdminProductsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const environment = useEnvironment();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [type, setType] = useState<'photo' | 'video'>('video');
  const [status, setStatus] = useState('active');

  // Upload states
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("upload");

  // Função helper para obter o token do usuário autenticado
  const getAuthToken = async (): Promise<string | null> => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        return await user.getIdToken();
      }
      return null;
    } catch (error) {
      console.error('Erro ao obter token:', error);
      return null;
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/admin/products', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await response.json();

      if (data.success) {
        const validProducts = (data.products || []).map((product: any) => ({
          ...product,
          // Garantir que sempre há um videoUrl válido
          videoUrl: product.videoUrl || '',
          imageUrl: product.imageUrl || ''
        }));
        setProducts(validProducts);
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao carregar vídeos",
          description: data.message || 'Erro desconhecido'
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar vídeos",
        description: "Erro de conexão"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
     
  }, []); // Executar apenas na montagem

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setVideoUrl('');
    setType('video');
    setStatus('active');
    setEditingId(null);

    // Reset upload states
    setVideoFile(null);
    setUploadProgress(0);
    setActiveTab("upload");

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };



  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('video/')) {
        toast({
          variant: "destructive",
          title: "Arquivo inválido",
          description: "Por favor, selecione um arquivo de vídeo válido."
        });
        return;
      }

      // Validar tamanho (máximo 2GB)
      const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
      if (file.size > maxSize) {
        toast({
          variant: "destructive",
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 2GB. Para arquivos maiores, use um link externo."
        });
        return;
      }

      setVideoFile(file);
      setVideoUrl(''); // Limpar URL se arquivo for selecionado
    }
  };

  const handleViewProduct = (product: Product) => {
    setViewingProduct(product);
    setIsViewDialogOpen(true);
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 MB';
    return (bytes / 1024 / 1024).toFixed(2);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Nome é obrigatório." });
      return;
    }

    if (!price) {
      toast({ variant: "destructive", title: "Preço é obrigatório." });
      return;
    }

    // Validação para vídeo (obrigatório)
    if (activeTab === 'upload' && !videoFile && !editingId) {
      toast({ variant: "destructive", title: "Arquivo de vídeo é obrigatório." });
      return;
    }
    if (activeTab === 'link' && (!videoUrl || !videoUrl.trim())) {
      toast({ variant: "destructive", title: "URL do vídeo é obrigatória." });
      return;
    }

    // Validar URL se for link externo
    if (activeTab === 'link' && videoUrl) {
      if (!isValidUrl(videoUrl)) {
        toast({ variant: "destructive", title: "URL inválida. Verifique o formato da URL." });
        return;
      }
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    let finalVideoUrl = videoUrl || '';
    let storageType = 'external';

    try {
      // Upload do vídeo se necessário
      if (activeTab === 'upload' && videoFile && !editingId) {

        const formData = new FormData();
        formData.append('file', videoFile);
        formData.append('uploadType', 'video');
        formData.append('folder', 'products/videos');

        // Simular progresso para arquivos grandes
        const isLargeFile = videoFile.size > 50 * 1024 * 1024; // 50MB
        let progressInterval: NodeJS.Timeout | undefined = undefined;

        if (isLargeFile) {
          progressInterval = setInterval(() => {
            setUploadProgress(prev => {
              if (prev >= 90) return prev;
              return prev + Math.random() * 10;
            });
          }, 500);
        }

        const uploadToken = await getAuthToken();
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: uploadToken ? { Authorization: `Bearer ${uploadToken}` } : {},
          body: formData
        });

        const data = await response.json();

        if (data.success) {
          finalVideoUrl = data.url;
          storageType = data.storageType || 'api-upload';
          setUploadProgress(100);
        } else {
          throw new Error(data.message || 'Falha no upload do vídeo');
        }

        if (progressInterval) {
          clearInterval(progressInterval);
        }
      }

      // Salvar produto
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId
        ? `/api/admin/products/${editingId}`
        : '/api/admin/products';

      // Para edição, se não há nova URL mas há editingId, usar a URL existente
      let finalVideoUrlForSave = finalVideoUrl;

      if (editingId) {
        const currentProduct = products.find(p => p.id === editingId);
        if (currentProduct) {
          if (!finalVideoUrl || !finalVideoUrl.trim()) {
            finalVideoUrlForSave = currentProduct.videoUrl || '';
          }
        }
      }

      const productData = {
        name: name.trim(),
        description: (description || '').trim(),
        price: parseFloat(price),
        imageUrl: '', // Sempre vazio, usa thumbnail automática
        videoUrl: finalVideoUrlForSave,
        type,
        status,
        storageType,
      };




      // Obter token de autenticação
      const token = await getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(productData)
      });

      const data = await response.json(); if (data.success) {
        toast({
          title: editingId ? "Vídeo Atualizado!" : "Vídeo Adicionado!",
          description: editingId
            ? "Vídeo atualizado com sucesso!"
            : "Vídeo adicionado com sucesso!",
        });

        resetForm();
        setIsDialogOpen(false);
        await fetchProducts();
      } else {
        throw new Error(data.message || 'Erro ao salvar vídeo');
      }

    } catch (error: any) {

      let errorMessage = "Ocorreu um erro ao salvar o vídeo.";
      let suggestion = "";

      if (error.code === 'storage/unauthorized') {
        errorMessage = "Acesso negado ao Firebase Storage.";
        suggestion = "Verifique as regras de segurança do Storage.";
      } else if (error.code === 'storage/quota-exceeded') {
        errorMessage = "Quota do Firebase Storage excedida.";
        suggestion = "Use um link externo ou libere espaço.";
      } else if (error.code === 'storage/invalid-format') {
        errorMessage = "Formato de arquivo inválido.";
        suggestion = "Use apenas arquivos válidos.";
      } else if (error.code === 'storage/retry-limit-exceeded') {
        errorMessage = "Tempo limite excedido no upload.";
        suggestion = "Tente novamente ou use um link externo.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        variant: "destructive",
        title: "Erro ao salvar vídeo",
        description: suggestion ? `${errorMessage}\n\n💡 ${suggestion}` : errorMessage
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setName(product.name);
    setDescription(product.description);
    setPrice(product.price.toString());
    setVideoUrl(product.videoUrl || '');
    setType('video');
    setStatus(product.status);

    // Determinar a aba baseada no tipo de armazenamento
    if (product.storageType && (product.storageType === 'firebase-storage' || product.storageType === 'api-upload')) {
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

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm("Tem certeza que deseja excluir este vídeo? Esta ação é irreversível.")) return;

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Vídeo Excluído",
          description: "Vídeo removido com sucesso.",
        });
        await fetchProducts();
      } else {
        throw new Error(data.message || 'Erro ao excluir vídeo');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir vídeo",
        description: error.message || "Erro de conexão"
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="rounded-xl bg-black/90 border border-white/10 p-4 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white">Gerenciar Loja de Vídeos</h1>
          <p className="text-white/60">
            Adicione e gerencie vídeos para venda na sua loja online
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Adicionar Vídeo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Vídeo' : 'Adicionar Novo Vídeo'}</DialogTitle>
              <DialogDescription>
                {editingId
                  ? 'Edite as informações do vídeo selecionado.'
                  : 'Adicione um novo vídeo à sua loja.'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Seção de Vídeo */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Arquivo de Vídeo</h3>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">Upload de Vídeo</TabsTrigger>
                    <TabsTrigger value="link">Link Externo</TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="videoFile">Arquivo de Vídeo</Label>
                        <Input
                          id="videoFile"
                          type="file"
                          accept="video/*"
                          onChange={handleVideoFileChange}
                          ref={fileInputRef}
                          disabled={isSubmitting}
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Formatos aceitos: MP4, AVI, MOV, etc. Máximo 2GB.
                        </p>
                      </div>

                      {videoFile && (
                        <div className="space-y-2">
                          <p className="text-sm text-green-600">
                            ✅ Vídeo selecionado: {videoFile.name} ({formatFileSize(videoFile.size)} MB)
                          </p>
                        </div>
                      )}

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
                      <Label htmlFor="videoUrl">URL do Vídeo</Label>
                      <Input
                        id="videoUrl"
                        type="url"
                        placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..."
                        value={videoUrl}
                        onChange={e => setVideoUrl(e.target.value)}
                        disabled={isSubmitting}
                      />
                      <p className="text-sm text-blue-600 mt-1">
                        ✅ Suporte completo: <strong>YouTube</strong>, <strong>Vimeo</strong>, <strong>Dailymotion</strong>, Google Drive
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Também aceita links diretos de vídeo (.mp4, .webm, etc.)
                      </p>

                      {/* Preview da URL */}
                      {videoUrl && isValidUrl(videoUrl) && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                          <div className="text-xs text-gray-600 mb-2">Preview:</div>
                          {(() => {
                            const videoInfo = processVideoUrl(videoUrl);
                            return (
                              <div className="flex items-center gap-2">
                                <Badge variant={videoInfo.platform === 'unknown' ? 'secondary' : 'default'}>
                                  {videoInfo.platform === 'youtube' && '📺 YouTube'}
                                  {videoInfo.platform === 'vimeo' && '🎬 Vimeo'}
                                  {videoInfo.platform === 'dailymotion' && '📹 Dailymotion'}
                                  {videoInfo.platform === 'direct' && '🎥'}
                                  {videoInfo.platform === 'unknown' && '🔗'}
                                </Badge>
                                {videoInfo.isEmbeddable && (
                                  <Badge variant="outline" className="text-green-600 border-green-300">
                                    ✅ Embed Suportado
                                  </Badge>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Informações Gerais */}
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome do Vídeo *</Label>
                    <Input
                      id="name"
                      placeholder="Nome do vídeo"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <Label htmlFor="price">Preço (R$) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Descrição do Vídeo</Label>
                  <Textarea
                    id="description"
                    placeholder="Descrição do vídeo"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    <option value="active">✅ Ativo</option>
                    <option value="inactive">❌ Inativo</option>
                  </select>
                </div>
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
                    {editingId ? 'Atualizar Vídeo' : 'Salvar Vídeo'}
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
            <Video className="h-5 w-5" />
            Loja de Vídeos
          </CardTitle>
          <CardDescription>
            Gerencie os vídeos disponíveis para venda na sua loja online.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-10">
              <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum vídeo adicionado ainda.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Clique em &quot;Adicionar Vídeo&quot; para começar.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {products.map((product) => (
                <Card key={product.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 glass-dark border-border group">
                  <CardHeader className="p-0">
                    <div className="aspect-video bg-muted overflow-hidden relative">
                      {product.videoUrl && product.videoUrl.trim() !== '' ? (
                        <SmartVideoThumbnail
                          url={product.videoUrl}
                          title={product.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      ) : (
                        // Placeholder quando não há vídeo
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <div className="text-muted-foreground text-center">
                            <div className="w-16 h-16 bg-sidebar-accent/20 rounded-full flex items-center justify-center mx-auto mb-2">
                              <Video className="w-8 h-8 text-sidebar-accent" strokeWidth={2} />
                            </div>
                            <p className="text-sm font-medium">Sem vídeo</p>
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm flex items-center justify-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="p-3 shadow-lg hover:scale-110 transition-transform duration-200"
                          onClick={() => handleViewProduct(product)}
                        >
                          <Play className="h-5 w-5" strokeWidth={2} />
                        </Button>
                      </div>
                      <div className="absolute top-2 left-2">
                        <Badge variant={product.status === 'active' ? 'default' : 'secondary'} className="shadow-md font-semibold">
                          {product.status === 'active' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>

                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold truncate flex-1">{product.name}</h3>
                      <span className="text-sm font-bold text-green-500 ml-2">
                        {formatPrice(product.price)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {product.description || 'Sem descrição'}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(product.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {product.sales || 0} vendas
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2 p-4 pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(product)}
                      disabled={editingId === product.id}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteProduct(product)}
                      disabled={editingId === product.id}
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
        <CardFooter>
          <div className="text-sm text-muted-foreground">
            Mostrando {products.length} de {products.length} vídeos
          </div>
        </CardFooter>
      </Card>

      {/* Modal para visualizar produto */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{viewingProduct?.name}</DialogTitle>
            <DialogDescription>
              {viewingProduct?.description || 'Sem descrição'}
            </DialogDescription>
          </DialogHeader>

          {viewingProduct && (
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                {(() => {
                  const videoUrl = viewingProduct.videoUrl || '';
                  const isDirectVideo = videoUrl.includes('firebasestorage.googleapis.com') ||
                    videoUrl.includes('.mp4') ||
                    videoUrl.includes('.webm') ||
                    videoUrl.includes('.mov') ||
                    viewingProduct.storageType === 'firebase-storage' ||
                    viewingProduct.storageType === 'api-upload';

                  if (isDirectVideo) {
                    return (
                      <video
                        src={videoUrl}
                        controls
                        className="w-full h-full object-contain"
                        onError={(e) => {
                        }}
                        onLoadStart={() => {
                        }}
                      >
                        Seu navegador não suporta vídeos HTML5.
                      </video>
                    );
                  } else {
                    return (
                      <SmartVideoPlayer
                        url={videoUrl}
                        title={viewingProduct.name}
                        showControls={true}
                        className="w-full h-full"
                      />
                    );
                  }
                })()}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Preço:</span>
                    <span className="font-bold text-green-600">{formatPrice(viewingProduct.price)}</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Criado em: {formatDate(viewingProduct.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={viewingProduct.status === 'active' ? 'default' : 'secondary'}>
                      {viewingProduct.status === 'active' ? '✅ Ativo' : '❌ Inativo'}
                    </Badge>
                    <Badge>
                      {(() => {
                        if (!viewingProduct.videoUrl) return '🎬 Vídeo';
                        const videoInfo = processVideoUrl(viewingProduct.videoUrl);
                        return videoInfo.platform === 'youtube' ? '📺 YouTube' :
                          videoInfo.platform === 'vimeo' ? '🎬 Vimeo' :
                            videoInfo.platform === 'dailymotion' ? '📹 Dailymotion' :
                              videoInfo.platform === 'direct' ? '🎥' :
                                viewingProduct.storageType === 'firebase-storage' ? '💾' : '🔗';
                      })()}
                    </Badge>
                    {viewingProduct.videoUrl && processVideoUrl(viewingProduct.videoUrl).isEmbeddable && (
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        ✅ Embed
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Estatísticas</h4>
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Vendas:</span> {viewingProduct.sales || 0}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Tipo:</span> Vídeo
                    </p>
                  </div>

                  <h4 className="font-semibold text-sm mt-4">Ações</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingProduct.videoUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(viewingProduct.videoUrl, '_blank')}
                        className="text-xs"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Abrir Vídeo
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const urlToCopy = viewingProduct.videoUrl || '';
                        navigator.clipboard.writeText(urlToCopy);
                        toast({
                          title: "✅ URL Copiada!",
                          description: "URL copiada para a área de transferência",
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
