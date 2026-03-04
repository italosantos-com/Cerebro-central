'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Image as ImageIcon, Video, Plus, Trash2, Edit, Eye, Upload, Link as LinkIcon, Play, Maximize2, Save, X, AlertCircle, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import SmartVideoPlayer, { SmartVideoThumbnail } from '@/components/smart-video-player'
import { processVideoUrl, detectContentType, isValidUrl } from '@/utils/video-url-processor'
import EnvironmentBanner from '@/components/environment-banner'
import SmartImage from '@/components/smart-image'
import DebugCard from '@/components/debug-card'
import SimpleVideoCard from '@/components/simple-video-card'
import { useEnvironment } from '@/hooks/use-environment'
import { isFeatureEnabled } from '@/utils/build-config'
import { getAuth, onAuthStateChanged } from 'firebase/auth'

interface ExclusiveContent {
  id: string
  title: string
  description: string
  type: 'photo' | 'video'
  url: string
  thumbnailUrl?: string
  tags: string[]
  viewCount: number
  isActive: boolean
  createdAt: string
}

export default function AdminExclusiveContentPage() {
  const getAdminAuthHeaders = async (): Promise<Record<string, string>> => {
    const user = getAuth().currentUser
    if (!user) return {}
    const idToken = await user.getIdToken()
    return { Authorization: `Bearer ${idToken}` }
  }

  const [content, setContent] = useState<ExclusiveContent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('url')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedContent, setSelectedContent] = useState<ExclusiveContent | null>(null)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [publishToPublicGallery, setPublishToPublicGallery] = useState(false)
  const [canPublishToPublicGallery, setCanPublishToPublicGallery] = useState(false)
  const [connectedStorageProviders, setConnectedStorageProviders] = useState<string[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'photo' as 'photo' | 'video',
    url: '',
    thumbnailUrl: '',
    tags: ''
  })
  const { toast } = useToast()
  const environment = useEnvironment()

  const isDriveUrl = (value?: string) => {
    if (!value) return false
    const normalized = value.toLowerCase()
    return normalized.includes('drive.google.com') || normalized.includes('docs.google.com')
  }

  // Handler para auto-detectar tipo de conteúdo quando URL muda
  const handleUrlChange = (url: string) => {
    const newFormData = { ...formData, url }

    if (url && isValidUrl(url)) {
      const detectedType = detectContentType(url)
      if (detectedType !== formData.type) {
        newFormData.type = detectedType

        // Se for vídeo, tentar obter thumbnail automaticamente
        if (detectedType === 'video') {
          const videoInfo = processVideoUrl(url)
          if (videoInfo.thumbnailUrl && !formData.thumbnailUrl) {
            newFormData.thumbnailUrl = videoInfo.thumbnailUrl
          }
        }
      }
    }

    setFormData(newFormData)
  }

  const handlePreview = (item: ExclusiveContent) => {
    setSelectedContent(item)
    setIsPreviewModalOpen(true)
  }

  // Função para randomizar array
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const fetchContent = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/exclusive-content', {
        headers: await getAdminAuthHeaders()
      })
      const data = await response.json()

      if (data.success) {
        // Randomizar o conteúdo antes de exibir
        const contentArray = (data.content || []) as ExclusiveContent[]
        const randomizedContent = shuffleArray<ExclusiveContent>(contentArray)
        setContent(randomizedContent)
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: data.message || 'Erro ao carregar conteúdo'
        })
      }
    } catch (error) {
      console.error('Erro ao buscar conteúdo:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao carregar conteúdo exclusivo'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!file) return

    setUploading(true)
    setUploadProgress(0)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'exclusive-content')

    // Simular progresso baseado no tamanho do arquivo
    const isLargeFile = file.size > 5 * 1024 * 1024 // 5MB
    const isVeryLargeFile = file.size > 1 * 1024 * 1024 * 1024 // 1GB
    let progressInterval: NodeJS.Timeout | null = null

    if (isLargeFile) {
      progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) return prev
          return prev + Math.random() * 10
        })
      }, 500)
    }

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: await getAdminAuthHeaders(),
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setUploadProgress(100)
        setFormData(prev => ({ ...prev, url: data.url }))

        if (data.strategy === 'base64') {
          toast({
            title: 'Upload Concluído',
            description: 'Imagem salva em base64 - carregamento instantâneo!',
            duration: 3000
          })
        } else if (data.strategy === 'storage') {
          toast({
            title: 'Upload Concluído',
            description: 'Arquivo enviado para Firebase Storage com sucesso!',
            duration: 3000
          })
        } else if (data.strategy === 'external') {
          toast({
            title: 'Upload Concluído',
            description: 'Arquivo muito grande processado! Use URL externa para melhor performance.',
            duration: 5000
          })
        } else {
          toast({
            title: 'Sucesso',
            description: 'Arquivo enviado com sucesso'
          })
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: data.message || 'Erro ao enviar arquivo'
        })
      }
    } catch (error) {
      console.error('Erro ao enviar arquivo:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao enviar arquivo'
      })
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'photo',
      url: '',
      thumbnailUrl: '',
      tags: ''
    })
    setEditingId(null)
    setUploadMethod('url')
    setPublishToPublicGallery(false)
  }

  const publishPublicGalleryItem = async (payload: typeof formData) => {
    const isPhoto = payload.type === 'photo'
    const endpoint = isPhoto ? '/api/admin/fotos' : '/api/admin/videos'
    const body = isPhoto
      ? {
        title: payload.title,
        description: payload.description,
        photoUrl: payload.url,
        storageType: 'external'
      }
      : {
        title: payload.title,
        description: payload.description,
        videoUrl: payload.url,
        thumbnailUrl: payload.thumbnailUrl || '',
        storageType: 'external'
      }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data?.message || 'Falha ao publicar na galeria publica')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (uploadMethod === 'file' && !formData.url) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Por favor, faça upload de um arquivo ou insira uma URL'
      })
      return
    }

    if (uploadMethod === 'url' && !formData.url) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Por favor, insira uma URL'
      })
      return
    }

    if (publishToPublicGallery) {
      if (!canPublishToPublicGallery) {
        toast({
          variant: 'destructive',
          title: 'Integracao necessaria',
          description: 'Conecte Google ou Apple em Admin > Integracoes para publicar na galeria publica'
        })
        return
      }

      if (editingId) {
        toast({
          variant: 'destructive',
          title: 'Acao indisponivel',
          description: 'Publicacao na galeria publica esta disponivel apenas para novos itens'
        })
        return
      }

      if (uploadMethod !== 'url') {
        toast({
          variant: 'destructive',
          title: 'Use URL publica',
          description: 'A galeria publica aceita apenas links (nao upload de arquivo)'
        })
        return
      }
    }

    // Validar URL quando fornecida
    if (formData.url && !isValidUrl(formData.url)) {
      toast({
        variant: 'destructive',
        title: 'URL Inválida',
        description: 'Por favor, insira uma URL válida'
      })
      return
    }

    if (formData.url && isDriveUrl(formData.url)) {
      toast({
        variant: 'destructive',
        title: 'Link não permitido',
        description: 'Links do Google Drive não são permitidos nesta seção. Use upload local ou URL pública direta.'
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Processar URL e detectar tipo automaticamente
      let processedData = { ...formData }

      if (formData.url) {
        // Auto-detectar tipo de conteúdo se não especificado ou se for diferente
        const detectedType = detectContentType(formData.url)

        if (formData.type !== detectedType) {
          processedData.type = detectedType
        }

        // Se for vídeo, processar URL para obter informações adicionais
        if (detectedType === 'video') {
          const videoInfo = processVideoUrl(formData.url)

          // Para vídeos embeddable, manter a URL original para compatibilidade
          // A renderização será feita pelo SmartVideoPlayer

          // Auto-gerar thumbnail se não fornecida
          if (!formData.thumbnailUrl && videoInfo.thumbnailUrl) {
            processedData.thumbnailUrl = videoInfo.thumbnailUrl
          }

          // Adicionar informações da plataforma nas tags se não existirem
          const platformTag = videoInfo.platform
          const currentTags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
          if (platformTag !== 'unknown' && platformTag !== 'direct' && !currentTags.includes(platformTag)) {
            currentTags.push(platformTag)
            processedData.tags = currentTags.join(', ')
          }
        }
      }

      const method = editingId ? 'PUT' : 'POST'
      const url = editingId
        ? `/api/admin/exclusive-content/${editingId}`
        : '/api/admin/exclusive-content'

      const requestBody = {
        ...processedData,
        tags: processedData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (data.success) {
        let publicGalleryError: string | null = null

        if (publishToPublicGallery) {
          try {
            await publishPublicGalleryItem(processedData)
          } catch (error) {
            publicGalleryError = error instanceof Error ? error.message : 'Falha ao publicar na galeria publica'
          }
        }

        toast({
          title: 'Sucesso',
          description: editingId
            ? 'Conteúdo exclusivo atualizado com sucesso'
            : 'Conteúdo exclusivo adicionado com sucesso'
        })

        if (publishToPublicGallery && publicGalleryError) {
          toast({
            variant: 'destructive',
            title: 'Aviso ao publicar',
            description: publicGalleryError
          })
        } else if (publishToPublicGallery) {
          toast({
            title: 'Galeria publica atualizada',
            description: `Item publicado em ${processedData.type === 'photo' ? '/fotos' : '/videos'}`
          })
        }

        setShowForm(false)
        resetForm()
        fetchContent()
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: data.message || (editingId ? 'Erro ao atualizar conteúdo' : 'Erro ao adicionar conteúdo')
        })
      }
    } catch (error) {
      console.error('[Exclusive Content] Erro ao salvar conteúdo:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: editingId ? 'Erro ao atualizar conteúdo exclusivo' : 'Erro ao adicionar conteúdo exclusivo'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (item: ExclusiveContent) => {
    setFormData({
      title: item.title,
      description: item.description,
      type: item.type,
      url: item.url,
      thumbnailUrl: item.thumbnailUrl || '',
      tags: item.tags?.join(', ') || ''
    })
    setEditingId(item.id)
    setUploadMethod('url')
    setShowForm(true)
  }

  const handleCancelEdit = () => {
    setShowForm(false)
    resetForm()
  }

  const handleDelete = async (item: ExclusiveContent) => {
    if (!confirm(`Tem certeza que deseja excluir "${item.title}"? Esta ação não pode ser desfeita.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/exclusive-content/${item.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: 'Conteúdo excluído com sucesso'
        })
        fetchContent()
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: data.message || 'Erro ao excluir conteúdo'
        })
      }
    } catch (error) {
      console.error('Erro ao excluir conteúdo:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao excluir conteúdo'
      })
    }
  }

  const handleResetData = async () => {
    if (!confirm('Tem certeza que deseja resetar todos os dados de exemplo? Esta ação não pode ser desfeita.')) {
      return
    }

    setIsResetting(true)
    try {
      const response = await fetch('/api/admin/exclusive-content/reset', {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: `${data.count} novos itens de exemplo criados`
        })
        fetchContent()
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: data.message || 'Erro ao resetar dados'
        })
      }
    } catch (error) {
      console.error('Erro ao resetar dados:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao resetar dados de exemplo'
      })
    } finally {
      setIsResetting(false)
    }
  }

  useEffect(() => {
    fetchContent()

  }, []) // Executar apenas na montagem

  useEffect(() => {
    const auth = getAuth()
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const providerIds = new Set((user?.providerData ?? []).map((item) => item.providerId))
      const providers: string[] = []

      if (providerIds.has('google.com')) {
        providers.push('Google')
      }

      if (providerIds.has('apple.com')) {
        providers.push('Apple')
      }

      setConnectedStorageProviders(providers)
      setCanPublishToPublicGallery(providers.length > 0)
    })

    return () => unsubscribe()
  }, [])

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="rounded-xl bg-black/90 border border-white/10 p-4 backdrop-blur-sm">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Gerenciar Conteúdo Exclusivo</h1>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {/* Botão Reset - só aparece em desenvolvimento */}
          {isFeatureEnabled('resetButton') && environment.isLocalhost && (
            <Button
              onClick={handleResetData}
              variant="outline"
              size="sm"
              disabled={isResetting}
              className="text-xs"
            >
              {isResetting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-2"></div>
                  Resetando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Reset
                </>
              )}
            </Button>
          )}

          <Button onClick={() => setShowForm(!showForm)} className="flex-1 sm:flex-none">
            <Plus className="w-4 h-4 mr-2" />
            {editingId ? 'Cancelar Edição' : 'Adicionar Conteúdo'}
          </Button>
        </div>
      </div>

      <EnvironmentBanner />

      {/* Debug temporário */}
      <DebugCard
        title="Debug - Dados Carregados"
        data={{
          contentCount: content.length,
          loading,
          firstItem: content[0],
          allItems: content.map(item => ({
            id: item.id,
            title: item.title,
            type: item.type,
            url: item.url,
            thumbnailUrl: item.thumbnailUrl
          }))
        }}
      />

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {editingId ? 'Editar Conteúdo Exclusivo' : 'Adicionar Novo Conteúdo Exclusivo'}
              {editingId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancelar
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Título</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Título do conteúdo"
                    required
                    className="text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tipo</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={formData.type === 'photo' ? 'default' : 'outline'}
                      onClick={() => setFormData({ ...formData, type: 'photo' })}
                      className={`flex-1 text-sm ${formData.type === 'photo' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-black-300 text-white-700 hover:bg-gray-50'}`}
                    >
                      <ImageIcon className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Foto</span>
                      <span className="sm:hidden">Foto</span>
                    </Button>
                    <Button
                      type="button"
                      variant={formData.type === 'video' ? 'default' : 'outline'}
                      onClick={() => setFormData({ ...formData, type: 'video' })}
                      className={`flex-1 text-sm ${formData.type === 'video' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-black-300 text-white-700 hover:bg-gray-50'}`}
                    >
                      <Video className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Vídeo</span>
                      <span className="sm:hidden">Vídeo</span>
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Descrição</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do conteúdo"
                  className="text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Método de Upload</label>
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <Button
                    type="button"
                    variant={uploadMethod === 'url' ? 'default' : 'outline'}
                    onClick={() => setUploadMethod('url')}
                    className={`flex-1 text-sm ${uploadMethod === 'url' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-black-300 text-white-700 hover:bg-gray-50'}`}
                  >
                    <LinkIcon className="w-4 h-4 mr-1 sm:mr-2" />
                    URL
                  </Button>
                  <Button
                    type="button"
                    variant={uploadMethod === 'file' ? 'default' : 'outline'}
                    onClick={() => setUploadMethod('file')}
                    className={`flex-1 text-sm ${uploadMethod === 'file' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-black-300 text-white-700 hover:bg-gray-50'}`}
                  >
                    <Upload className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Upload de Arquivo</span>
                    <span className="sm:hidden">Upload</span>
                  </Button>
                </div>

                {uploadMethod === 'url' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">URL do Conteúdo</label>
                      <Input
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        placeholder="https://..."
                        required
                        className="text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">URL da Thumbnail (opcional)</label>
                      <Input
                        value={formData.thumbnailUrl}
                        onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                        placeholder="https://..."
                        className="text-white"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Upload de Arquivo</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept={formData.type === 'photo' ? 'image/*' : 'video/*'}
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="text-sm"
                        >
                          {uploading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Selecionar {formData.type === 'photo' ? 'Imagem' : 'Vídeo'}
                            </>
                          )}
                        </Button>

                        {/* Barra de Progresso */}
                        {uploading && (
                          <div className="mt-4">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Enviando arquivo...</span>
                              <span>{uploadProgress.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${uploadProgress}%` }}
                              ></div>
                            </div>
                            {uploadProgress > 0 && uploadProgress < 100 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Aguarde, processando arquivo...
                              </p>
                            )}
                          </div>
                        )}

                        <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                          {formData.type === 'photo'
                            ? 'Formatos aceitos: JPG, PNG, GIF, WebP'
                            : 'Formatos aceitos: MP4, WebM, MOV (máx. 5GB)'
                          }
                        </p>

                        {/* Aviso para arquivos grandes */}
                        {formData.type === 'video' && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                            <strong>💡 Estratégia Automática:</strong>
                            <ul className="mt-1 space-y-1">
                              <li>• Imagens &lt;1MB: Base64 (rápido)</li>
                              <li>• Imagens 1-10MB: Firebase Storage</li>
                              <li>• Vídeos: Firebase Storage (streaming otimizado)</li>
                              <li>• &gt;5GB: URL externa (Google Drive, YouTube)</li>
                            </ul>
                          </div>
                        )}

                        {formData.type === 'photo' && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                            <strong>💡 Estratégia Automática:</strong>
                            <ul className="mt-1 space-y-1">
                              <li>• &lt;1MB: Base64 (carregamento instantâneo)</li>
                              <li>• 1-10MB: Firebase Storage (CDN global)</li>
                              <li>• &gt;10MB: URL externa recomendada</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Opção para URL externa para vídeos grandes */}
                    {formData.type === 'video' && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <label className="block text-sm font-medium mb-2 text-blue-800">
                          URL Externa (Recomendado para vídeos grandes)
                        </label>
                        <Input
                          value={formData.url}
                          onChange={(e) => handleUrlChange(e.target.value)}
                          placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..."
                          className="text-sm text-black"
                        />
                        <p className="text-xs text-blue-600 mt-1">
                          Suportado: YouTube, Vimeo, Dailymotion, Google Drive, ou links diretos para arquivos
                        </p>
                      </div>
                    )}

                    {formData.url && (
                      <div>
                        <label className="block text-sm font-medium mb-2">URL da Thumbnail (opcional)</label>
                        <Input
                          value={formData.thumbnailUrl}
                          onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                          placeholder="https://..."
                          className="text-black"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tags (separadas por vírgula)</label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="exclusivo, premium, foto"
                  className="text-white"
                />
              </div>

              <div className="rounded-lg border border-dashed border-gray-300 p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="public-gallery"
                    checked={publishToPublicGallery}
                    onCheckedChange={(checked) => setPublishToPublicGallery(Boolean(checked))}
                    disabled={!canPublishToPublicGallery || !!editingId || uploadMethod !== 'url'}
                    className="mt-1"
                  />
                  <div className="space-y-1">
                    <label htmlFor="public-gallery" className="text-sm font-medium">
                      Publicar na galeria publica
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Exibe este link publico em {formData.type === 'photo' ? '/fotos' : '/videos'}.
                      Disponivel apenas com URL publica.
                    </p>
                    {connectedStorageProviders.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {connectedStorageProviders.map((provider) => (
                          <Badge key={provider} variant="outline" className="text-xs">
                            {provider} conectado
                          </Badge>
                        ))}
                      </div>
                    )}
                    {!canPublishToPublicGallery && (
                      <p className="text-xs text-red-600">
                        Conecte Google ou Apple em{' '}
                        <Link href="/admin/integrations" className="underline">
                          Admin &gt; Integracoes
                        </Link>
                        .
                      </p>
                    )}
                    {uploadMethod !== 'url' && (
                      <p className="text-xs text-muted-foreground">
                        Alternar para "URL" para publicar na galeria publica.
                      </p>
                    )}
                    {editingId && (
                      <p className="text-xs text-muted-foreground">
                        Disponivel apenas para novos itens.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" disabled={uploading || isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingId ? 'Atualizando...' : 'Enviando...'}
                    </>
                  ) : (
                    <>
                      {editingId ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                      {editingId ? 'Atualizar Conteúdo' : 'Adicionar Conteúdo'}
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancelEdit} className="flex-1 sm:flex-none">
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando conteúdo...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {content.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-3 sm:p-4">
                {/* Preview do conteúdo */}
                <div className="relative aspect-video mb-3 rounded-lg overflow-hidden bg-gray-100">
                  {item.type === 'video' ? (
                    <SmartVideoThumbnail
                      url={item.url}
                      title={item.title}
                      className="w-full h-full"
                      onClick={() => handlePreview(item)}
                    />
                  ) : (
                    <div
                      className="relative w-full h-full cursor-pointer group"
                      onClick={() => handlePreview(item)}
                    >
                      <SmartImage
                        src={item.thumbnailUrl || item.url || '/placeholder-photo.svg'}
                        alt={item.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                        fallbackSrc="/placeholder-photo.svg"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Badge de tipo */}
                  <div className="absolute top-2 left-2">
                    <Badge className={`text-xs ${item.type === 'photo' ? 'bg-blue-600' : 'bg-red-600'}`}>
                      {item.type === 'photo' ? 'Foto' : 'Vídeo'}
                    </Badge>
                  </div>

                  {/* Badge de status */}
                  <div className="absolute top-2 right-2">
                    <Badge variant={item.isActive ? 'default' : 'secondary'} className="text-xs">
                      {item.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${item.type === 'photo' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                      {item.type === 'photo' ? (
                        <ImageIcon className="w-4 h-4" />
                      ) : (
                        <Video className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="w-3 h-3" />
                    {item.viewCount}
                  </div>
                </div>

                <h3 className="font-semibold mb-2 line-clamp-2 text-sm sm:text-base">{item.title}</h3>
                {item.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">
                    {item.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-1 mb-3">
                  {item.tags?.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePreview(item)}
                    className="text-xs"
                  >
                    <Maximize2 className="w-3 h-3 mr-1" />
                    Visualizar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(item)}
                    className="text-xs"
                    disabled={editingId === item.id}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700 text-xs"
                    onClick={() => handleDelete(item)}
                    disabled={editingId === item.id}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Preview */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">{selectedContent?.title}</DialogTitle>
          </DialogHeader>

          {selectedContent && (
            <div className="space-y-4">
              <div className="relative aspect-video">
                {selectedContent.type === 'video' ? (
                  <SmartVideoPlayer
                    url={selectedContent.url}
                    title={selectedContent.title}
                    className="w-full h-full rounded-lg"
                    showControls={true}
                    poster={selectedContent.thumbnailUrl}
                    onError={(error) => {
                      toast({
                        variant: 'destructive',
                        title: 'Erro no vídeo',
                        description: error
                      })
                    }}
                  />
                ) : (
                  <SmartImage
                    src={selectedContent.url || selectedContent.thumbnailUrl || '/placeholder-photo.svg'}
                    alt={selectedContent.title}
                    fill
                    className="object-cover rounded-lg"
                    fallbackSrc="/placeholder-photo.svg"
                  />
                )}
              </div>

              <div className="flex items-center justify-between">
                <Badge className={`text-sm ${selectedContent.type === 'photo' ? 'bg-blue-600' : 'bg-red-600'}`}>
                  {selectedContent.type === 'photo' ? 'Foto' : 'Vídeo'}
                </Badge>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  <span>{selectedContent.viewCount || 0} visualizações</span>
                </div>
              </div>

              {selectedContent.description && (
                <p className="text-muted-foreground text-sm sm:text-base">{selectedContent.description}</p>
              )}

              <div className="flex flex-wrap gap-2">
                {selectedContent.tags?.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="text-xs text-muted-foreground">
                <p><strong>URL:</strong> {selectedContent.url}</p>
                {selectedContent.thumbnailUrl && (
                  <p><strong>Thumbnail:</strong> {selectedContent.thumbnailUrl}</p>
                )}
                <p><strong>Criado em:</strong> {new Date(selectedContent.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
