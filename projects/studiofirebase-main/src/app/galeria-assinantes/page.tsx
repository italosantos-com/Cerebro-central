'use client'



import { useEffect, useMemo, useState } from 'react'
import { useFaceIDAuth } from '@/contexts/face-id-auth-context'
import { useAuth } from '@/contexts/AuthProvider'
import { checkSecureGalleryAccess } from '@/utils/secure-auth-system'
import Script from 'next/script'

// Debug para galeria
if (typeof window !== 'undefined') {
  import('@/utils/debug-gallery-access');
}

// Verificação de acesso segura
import { checkGalleryAccess } from '@/utils/gallery-access';
import { useExclusiveContent } from '@/hooks/use-exclusive-content'
import { useExclusiveMedia } from '@/components/exclusive-media-grid'
import SubscriptionStatus from '@/components/subscription-status'
import SubscriptionDebug from '@/components/subscription-debug'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Crown,
  Image as ImageIcon,
  Video,
  Eye,
  RefreshCw,
  Sparkles,
  Fingerprint,
  Star,
  Zap,
  X,
  Play,
  ExternalLink,
  Lock,
  CreditCard
} from 'lucide-react'
import { processVideoUrl } from '@/utils/video-url-processor'
import SmartVideoPlayer from '@/components/smart-video-player'
import { useToast } from '@/hooks/use-toast'
import Image from 'next/image'
import { useRef } from 'react'
import UnlockPaymentOptionsModal from '@/components/unlock-payment-options-modal'
import AntiCaptureGuard from '@/components/security/anti-capture-guard'

// Interface unificada para dados de conteúdo
interface GalleryItem {
  id: string
  title: string
  description?: string
  type: 'photo' | 'video'
  thumbnail?: string
  thumbnailUrl?: string
  url?: string
  fullUrl?: string
  viewCount?: number
  createdAt?: string
  uploadDate?: string
  exclusive?: boolean
  tags?: string[]
  isUnlocked?: boolean
  locked?: boolean
}

// Utilitário para embaralhar conteúdo sempre que o filtro "Todos" é usado
const shuffleContent = (items: GalleryItem[]) => {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Componente de player de vídeo inteligente removido - usar SmartVideoPlayer
// O SmartVideoPlayer agora está em: src/components/smart-video-player.tsx
// Ele suporta: YouTube, Vimeo, Dailymotion, Google Drive, Google Photos, iCloud, e vídeos diretos

// Proteção contra cache DESABILITADA para desenvolvimento
if (typeof window !== 'undefined') {
  // Código de reload comentado para permitir acesso
  // if (performance.navigation.type === 2) { // Back/Forward
  //   window.location.reload();
  // }

  // Limpar cookies antigos para evitar cache
  document.cookie = 'isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'hasSubscription=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

  // Verificar se o usuário está autenticado
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true' ||
    localStorage.getItem('userEmail') !== null;

  if (isAuthenticated) {
    document.cookie = `isAuthenticated=true; path=/; max-age=${30 * 24 * 60 * 60}`; // 30 dias

    // Verificar se tem assinatura
    const hasSubscription = localStorage.getItem('hasSubscription') === 'true' ||
      localStorage.getItem('userType') === 'vip';

    if (hasSubscription) {
      document.cookie = `hasSubscription=true; path=/; max-age=${30 * 24 * 60 * 60}`; // 30 dias
    }
  }
}

// Componente de Verificação Oficial de Acesso para Assinantes
const SubscriberAccessVerification = ({ children }: { children: React.ReactNode }) => {


  const { isAuthenticated, userEmail: faceUserEmail, userType } = useFaceIDAuth()
  const { user: firebaseUser, userProfile } = useAuth()
  const router = useRouter()
  const [accessGranted, setAccessGranted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const verifySubscriberAccess = async () => {


      // Aguardar contextos carregarem
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Coletar dados de autenticação de todas as fontes
      const authSources = {
        faceID: {
          isAuthenticated,
          userEmail: faceUserEmail,
          userType
        },
        firebase: {
          userEmail: firebaseUser?.email,
          userProfile: userProfile,
          isSubscriber: userProfile?.isSubscriber
        },
        localStorage: {
          isAuthenticated: localStorage.getItem('isAuthenticated') === 'true',
          hasSubscription: localStorage.getItem('hasSubscription') === 'true',
          isSubscriber: localStorage.getItem('isSubscriber') === 'true',
          userType: localStorage.getItem('userType'),
          userEmail: localStorage.getItem('userEmail')
        }
      }









      // Verificação consolidada de autenticação
      const isUserAuthenticated = (
        authSources.faceID.isAuthenticated ||
        authSources.localStorage.isAuthenticated ||
        !!authSources.firebase.userEmail ||
        !!authSources.firebase.userProfile?.email
      )

      // Verificação consolidada de email
      const userEmail = (
        authSources.faceID.userEmail ||
        authSources.firebase.userEmail ||
        authSources.firebase.userProfile?.email ||
        authSources.localStorage.userEmail
      )

      // Verificação consolidada de assinatura
      const hasActiveSubscription = (
        authSources.faceID.userType === 'vip' ||
        authSources.firebase.isSubscriber === true ||
        authSources.localStorage.hasSubscription ||
        authSources.localStorage.isSubscriber ||
        authSources.localStorage.userType === 'vip'
      )

      const accessResult = {
        isAuthenticated: isUserAuthenticated,
        hasEmail: !!userEmail,
        hasSubscription: hasActiveSubscription,
        finalDecision: isUserAuthenticated && !!userEmail && hasActiveSubscription
      }



      // ACESSO SIMPLIFICADO PARA DESENVOLVIMENTO
      // Permitir acesso se:
      // 1. Tem qualquer dado de autenticação OU
      // 2. É um ambiente de desenvolvimento
      const allowAccess = (
        // Desenvolvimento: sempre permitir acesso (para testes)
        process.env.NODE_ENV === 'development' ||
        // Produção: permitir acesso autenticado (assinatura pode liberar conteudo completo)
        (accessResult.isAuthenticated && accessResult.hasEmail)
      )



      if (allowAccess) {
        // Garantir dados basicos no localStorage
        localStorage.setItem('isAuthenticated', 'true')
        if (!localStorage.getItem('userEmail')) {
          localStorage.setItem('userEmail', userEmail || 'usuario@local')
        }

        if (hasActiveSubscription) {
          localStorage.setItem('hasSubscription', 'true')
          localStorage.setItem('isSubscriber', 'true')
          localStorage.setItem('userType', 'vip')
        }

        setAccessGranted(true)
      }

      setIsLoading(false)
    }

    verifySubscriberAccess()
  }, [isAuthenticated, faceUserEmail, userType, firebaseUser, userProfile])

  // Obter email do usuário de qualquer fonte
  const getUserEmail = () => {
    return firebaseUser?.email ||
      userProfile?.email ||
      faceUserEmail ||
      localStorage.getItem('userEmail') ||
      '';
  }

  useEffect(() => {
    const verifyAccess = (): void | (() => void) => {

      // Skip admin routes
      if (window.location.pathname.startsWith('/admin')) {
        setAccessGranted(true)
        setIsLoading(false)
        return
      }

      // AGUARDAR CONTEXTOS CARREGAREM COMPLETAMENTE APÓS RELOAD
      // Verificar se ainda está carregando dados do Firebase
      const isFirebaseLoading = !firebaseUser && !userProfile;
      const isContextLoading = isAuthenticated === false && !faceUserEmail;

      // Se parece que ainda está carregando, aguardar mais
      if (isFirebaseLoading && isContextLoading) {
        // Aguardar mais tempo se parece que está carregando
        const extendedTimer = setTimeout(verifyAccess, 2000);
        return () => clearTimeout(extendedTimer);
      }

      // VERIFICAÇÃO COM PRIORIDADE PARA localStorage (mais confiável após reload)
      const localStorage_isAuth = typeof window !== 'undefined' && localStorage.getItem('isAuthenticated') === 'true';
      const localStorage_hasSubscription = typeof window !== 'undefined' && localStorage.getItem('hasSubscription') === 'true';
      const localStorage_isSubscriber = typeof window !== 'undefined' && localStorage.getItem('isSubscriber') === 'true';
      const localStorage_userEmail = typeof window !== 'undefined' && localStorage.getItem('userEmail');

      // Se localStorage tem dados de assinante, confiar neles (especialmente após reload)
      if (localStorage_isAuth && (localStorage_hasSubscription || localStorage_isSubscriber) && localStorage_userEmail) {
        setAccessGranted(true);
        setIsLoading(false);
        return;
      }

      // Verificação adicional com contextos
      const hasAuthData = (
        localStorage_isAuth ||
        isAuthenticated ||
        !!firebaseUser?.email
      );

      const hasSubscriptionData = (
        localStorage_hasSubscription ||
        localStorage_isSubscriber ||
        userProfile?.isSubscriber === true ||
        userType === 'vip'
      );

      const userEmailData = (
        localStorage_userEmail ||
        faceUserEmail ||
        firebaseUser?.email ||
        userProfile?.email
      );



      // Se tiver dados básicos, liberar acesso
      if (hasAuthData && hasSubscriptionData && userEmailData) {
        setAccessGranted(true);
        setIsLoading(false);
        return;
      }

      // Se não tiver dados, mostrar botões para o usuário escolher
      setIsLoading(false);
    }

    // Verificar com delay maior para contextos carregarem (especialmente após reload)
    const timer = setTimeout(verifyAccess, 2000);

    // Cleanup
    return () => {
      clearTimeout(timer);
    };
  }, [firebaseUser, userProfile, isAuthenticated, faceUserEmail, userType])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Verificando acesso...</p>

          {/* Debug info during loading - Enhanced visibility */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 text-sm text-left bg-slate-900 border border-slate-700 p-6 rounded-lg max-w-2xl mx-auto shadow-xl">
              <h4 className="font-bold mb-4 text-cyan-400 text-lg flex items-center gap-2">
                🔍 Debug - Estado dos Contextos
                <span className="text-xs bg-cyan-900 text-cyan-200 px-2 py-1 rounded">DEV</span>
              </h4>
              <div className="grid grid-cols-1 gap-3 font-mono">
                <div className="flex justify-between items-center p-2 bg-slate-800 rounded">
                  <span className="text-gray-300">• isAuthenticated:</span>
                  <span className={`font-bold px-2 py-1 rounded text-xs ${isAuthenticated ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                    {String(isAuthenticated)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-800 rounded">
                  <span className="text-gray-300">• faceUserEmail:</span>
                  <span className={`font-bold px-2 py-1 rounded text-xs ${faceUserEmail ? 'bg-blue-900 text-blue-300' : 'bg-gray-700 text-gray-400'}`}>
                    {faceUserEmail || 'null'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-800 rounded">
                  <span className="text-gray-300">• userType:</span>
                  <span className={`font-bold px-2 py-1 rounded text-xs ${userType ? 'bg-purple-900 text-purple-300' : 'bg-gray-700 text-gray-400'}`}>
                    {userType || 'null'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-800 rounded">
                  <span className="text-gray-300">• firebaseUser:</span>
                  <span className={`font-bold px-2 py-1 rounded text-xs ${firebaseUser?.email ? 'bg-orange-900 text-orange-300' : 'bg-gray-700 text-gray-400'}`}>
                    {firebaseUser?.email || 'null'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-800 rounded">
                  <span className="text-gray-300">• userProfile:</span>
                  <span className={`font-bold px-2 py-1 rounded text-xs ${userProfile?.email ? 'bg-teal-900 text-teal-300' : 'bg-gray-700 text-gray-400'}`}>
                    {userProfile?.email || 'null'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-800 rounded">
                  <span className="text-gray-300">• localStorage auth:</span>
                  <span className={`font-bold px-2 py-1 rounded text-xs ${typeof window !== 'undefined' && localStorage.getItem('isAuthenticated') ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                    {typeof window !== 'undefined' ? localStorage.getItem('isAuthenticated') || 'null' : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-800 rounded">
                  <span className="text-gray-300">• localStorage subscription:</span>
                  <span className={`font-bold px-2 py-1 rounded text-xs ${typeof window !== 'undefined' && localStorage.getItem('hasSubscription') ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                    {typeof window !== 'undefined' ? localStorage.getItem('hasSubscription') || 'null' : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-800 rounded">
                  <span className="text-gray-300">• URL atual:</span>
                  <span className="font-bold px-2 py-1 rounded text-xs bg-indigo-900 text-indigo-300">
                    {typeof window !== 'undefined' ? window.location.pathname : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="mt-4 text-xs text-gray-400 border-t border-slate-700 pt-3">
                💡 Este painel aparece apenas em desenvolvimento para facilitar o debug
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!accessGranted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Crown className="w-10 h-10 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Conteúdo Exclusivo</h2>
            <p className="text-muted-foreground mb-6">
              Para acessar o conteúdo exclusivo, você precisa estar logado e ter uma assinatura ativa.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => router.push('/auth/face')}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Fingerprint className="w-4 h-4 mr-2" />
              Fazer Login com Face ID
            </Button>

            {/* Botões de debug para desenvolvimento */}
            {process.env.NODE_ENV === 'development' && (
              <>
                <Button
                  onClick={() => {
                    // Debug info available in browser console if needed
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  🔍 Verificar Dados Atuais
                </Button>

                <Button
                  onClick={() => {
                    // Simular dados de assinante para teste
                    localStorage.setItem('isAuthenticated', 'true')
                    localStorage.setItem('hasSubscription', 'true')
                    localStorage.setItem('isSubscriber', 'true')
                    localStorage.setItem('userType', 'vip')
                    localStorage.setItem('userEmail', 'rica@gmail.com')

                    // Recarregar página para aplicar mudanças
                    window.location.reload()
                  }}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  ✅ ENTRAR COMO ASSINANTE
                </Button>
              </>
            )}

            <Button
              onClick={() => router.push('/assinante')}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              <Crown className="w-4 h-4 mr-2" />
              Assinar Agora
            </Button>

            <Button
              onClick={async () => {
                const userEmail = faceUserEmail || firebaseUser?.email || userProfile?.email || 'rica@gmail.com';

                try {
                  const response = await fetch('/api/verify-subscription-flow', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail })
                  });

                  const data = await response.json();

                  if (data.success) {
                    const result = data.data;

                    alert(`${result.finalDecision.isSubscriber ? '✅ É ASSINANTE' : '❌ NÃO É ASSINANTE'}\n\nFonte: ${result.finalDecision.source}\nMotivo: ${result.finalDecision.reason}`);
                  } else {
                    // Error handled silently
                  }
                } catch (error) {
                  // Error handled silently
                }
              }}
              variant="outline"
              className="w-full"
            >
              🔍 Testar Fluxo de Assinatura
            </Button>

            <Button
              onClick={async () => {
                const userEmail = faceUserEmail || firebaseUser?.email || userProfile?.email || 'rica@gmail.com';

                try {
                  const response = await fetch('/api/debug-subscription', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'fix', email: userEmail })
                  });

                  const data = await response.json();

                  if (data.success) {
                    alert('✅ Assinatura corrigida no banco de dados! Recarregando página...');
                    window.location.reload();
                  } else {
                    alert('❌ Erro ao corrigir: ' + data.message);
                  }
                } catch (error) {
                  alert('❌ Erro na correção.');
                }
              }}
              variant="outline"
              className="w-full bg-green-50 hover:bg-green-100 border-green-200"
            >
              🔧 Corrigir Banco de Dados
            </Button>
          </div>

          {/* Agora: Apenas SubscriptionStatus e SubscriptionDebug */}
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Componente de Filtros e Busca
const GalleryFilters = ({
  searchTerm,
  setSearchTerm,
  filter,
  setFilter,
  viewMode,
  setViewMode
}: {
  searchTerm: string
  setSearchTerm: (term: string) => void
  filter: 'all' | 'photo' | 'video'
  setFilter: (filter: 'all' | 'photo' | 'video') => void
  viewMode: 'grid' | 'list'
  setViewMode: (mode: 'grid' | 'list') => void
}) => {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Busca */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
          <Input
            placeholder="Buscar conteúdo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
          />
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'bg-primary hover:bg-primary/90' : 'border-border text-foreground hover:bg-accent'}
          >
            <Filter className="w-4 h-4 mr-1" />
            Todos
          </Button>
          <Button
            variant={filter === 'photo' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('photo')}
            className={filter === 'photo' ? 'bg-primary hover:bg-primary/90' : 'border-border text-foreground hover:bg-accent'}
          >
            <ImageIcon className="w-4 h-4 mr-1" />
            Fotos
          </Button>
          <Button
            variant={filter === 'video' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('video')}
            className={filter === 'video' ? 'bg-primary hover:bg-primary/90' : 'border-border text-foreground hover:bg-accent'}
          >
            <Video className="w-4 h-4 mr-1" />
            Vídeos
          </Button>
        </div>

        {/* Modo de Visualização */}
        <div className="flex gap-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? 'bg-primary hover:bg-primary/90' : 'border-border text-foreground hover:bg-accent'}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'bg-primary hover:bg-primary/90' : 'border-border text-foreground hover:bg-accent'}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Componente de Estatísticas
const GalleryStats = ({ content, userType }: { content: GalleryItem[], userType?: string | null }) => {
  const photos = content.filter(item => item.type === 'photo').length
  const videos = content.filter(item => item.type === 'video').length
  const totalViews = content.reduce((sum, item) => sum + (item.viewCount || 0), 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card className="bg-card border border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Conteúdo</p>
              <p className="text-2xl font-bold text-foreground">{content.length}</p>
            </div>
            <Sparkles className="w-8 h-8 text-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Fotos</p>
              <p className="text-2xl font-bold text-foreground">{photos}</p>
            </div>
            <ImageIcon className="w-8 h-8 text-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Vídeos</p>
              <p className="text-2xl font-bold text-foreground">{videos}</p>
            </div>
            <Video className="w-8 h-8 text-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Visualizações</p>
              <p className="text-2xl font-bold text-foreground">{totalViews.toLocaleString()}</p>
            </div>
            <Eye className="w-8 h-8 text-foreground" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function GaleriaAssinantesPage() {


  const { userEmail: faceUserEmail, userType } = useFaceIDAuth()
  const { user, userProfile } = useAuth()
  const { content, loading, error, refreshContent, isSubscriber, requiresSubscription } = useExclusiveContent()
  const { toast } = useToast()
  const router = useRouter()

  // Estados locais
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedContent, setSelectedContent] = useState<GalleryItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [shuffledContent, setShuffledContent] = useState<GalleryItem[]>([])
  const [unlockTarget, setUnlockTarget] = useState<GalleryItem | null>(null)
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)

  const UNLOCK_PRICE_BRL = 19.9
  const unlockCurrency = 'BRL'
  const unlockSymbol = 'R$'

  // Atualiza a ordem embaralhada sempre que o filtro "Todos" estiver ativo
  useEffect(() => {
    if (filter === 'all') {
      setShuffledContent(shuffleContent(content))
    }
  }, [content, filter])

  // Verificação adicional de segurança
  useEffect(() => {
    const checkAccess = () => {
      // Verificação mais rigorosa de autenticação
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true' ||
        (localStorage.getItem('userEmail') && localStorage.getItem('userEmail') !== '') ||
        (user?.email && user.email !== '') ||
        (userProfile?.email && userProfile.email !== '');

      // Verificação mais rigorosa de assinatura
      const hasSubscription = localStorage.getItem('hasSubscription') === 'true' ||
        localStorage.getItem('userType') === 'vip' ||
        localStorage.getItem('hasPaid') === 'true' ||
        userProfile?.isSubscriber === true ||
        userType === 'vip';

      // Verificação adicional: se localStorage está vazio mas ainda está na página, é cache
      const hasAnyData = localStorage.getItem('isAuthenticated') ||
        localStorage.getItem('userEmail') ||
        localStorage.getItem('hasSubscription') ||
        localStorage.getItem('userType');

      if (!hasAnyData && !user && !userProfile) {
        // Limpar tudo e redirecionar
        localStorage.clear();
        sessionStorage.clear();
        document.cookie = 'isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'hasSubscription=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        // window.location.href = '/auth/face'; // Comentado para desenvolvimento
        return;
      }



      if (!isAuthenticated) {
        // Limpar todo o cache e dados de autenticação
        localStorage.clear();
        sessionStorage.clear();
        document.cookie = 'isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'hasSubscription=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        router.push('/auth/face')
        return
      }

      if (!hasSubscription) {
        // Limpar dados de assinatura mas manter autenticação
        localStorage.removeItem('hasSubscription');
        localStorage.removeItem('userType');
        localStorage.removeItem('hasPaid');
        document.cookie = 'hasSubscription=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        return
      }


    }

    // Limpar cache do navegador para esta página
    if (typeof window !== 'undefined') {
      // Forçar reload se detectar cache
      if (performance.navigation.type === 2) {
        window.location.reload();
        return;
      }

      // Adicionar listener para detectar navegação via cache
      const handleBeforeUnload = () => {
        sessionStorage.setItem('galeria-cache-check', Date.now().toString());
      };

      const handleLoad = () => {
        const lastCheck = sessionStorage.getItem('galeria-cache-check');
        if (lastCheck) {
          const timeDiff = Date.now() - parseInt(lastCheck);
          if (timeDiff > 1000) { // Se passou mais de 1 segundo, pode ser cache
            checkAccess();
          }
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('load', handleLoad);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('load', handleLoad);
      };
    }

    // Verificar imediatamente
    checkAccess()

    // Verificar periodicamente a cada 3 segundos (mais frequente)
    const interval = setInterval(checkAccess, 3000)

    return () => clearInterval(interval)
  }, [user, userProfile, userType, router])

  // Filtrar conteúdo baseado no filtro selecionado com embaralhamento para "Todos"
  const filteredContent = useMemo(() => {
    if (filter === 'all') {
      return shuffledContent
    }
    return content.filter(item => item.type === filter)
  }, [content, filter, shuffledContent])

  // Calcular estatísticas
  const photos = content.filter(item => item.type === 'photo')
  const videos = content.filter(item => item.type === 'video')
  const totalViews = content.reduce((sum, item) => sum + (item.viewCount || 0), 0)

  // Obter email do usuário de qualquer fonte
  const getUserEmail = () => {
    return user?.email ||
      userProfile?.email ||
      faceUserEmail ||
      localStorage.getItem('userEmail') ||
      '';
  }

  const hasSubscription = localStorage.getItem('hasSubscription') === 'true' ||
    localStorage.getItem('userType') === 'vip' ||
    localStorage.getItem('hasPaid') === 'true' ||
    userProfile?.isSubscriber === true ||
    userType === 'vip';

  const hasSubscriberAccess = isSubscriber || hasSubscription
  const isItemLocked = (item: GalleryItem) => !hasSubscriberAccess && !item.isUnlocked

  // Funções de interação (compartilhamento removido conforme solicitado)

  // Funcionalidades de download removidas conforme solicitado

  const handleContentClick = (item: GalleryItem) => {
    if (isItemLocked(item)) {
      setUnlockTarget(item)
      setIsUnlockModalOpen(true)
      return
    }
    setSelectedContent(item)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedContent(null)
  }

  const handleUnlockPaymentSuccess = async (method: 'pix' | 'google' | 'apple' | 'paypal') => {
    if (!unlockTarget || isUnlocking) return
    setIsUnlocking(true)

    try {
      const userId = getUserEmail()
      if (!userId) {
        toast({
          variant: 'destructive',
          title: 'Login necessario',
          description: 'Entre na conta para desbloquear o conteudo.'
        })
        setIsUnlocking(false)
        return
      }

      const response = await fetch('/api/exclusive-content/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: unlockTarget.id,
          userId,
          paymentMethod: method,
          amount: UNLOCK_PRICE_BRL,
        })
      })
      const data = await response.json()
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Falha ao registrar desbloqueio')
      }

      await refreshContent()
      toast({ title: 'Conteúdo desbloqueado', description: 'Aproveite seu conteúdo exclusivo.' })
      setIsUnlockModalOpen(false)
      setUnlockTarget(null)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao desbloquear',
        description: error?.message || 'Nao foi possivel concluir o desbloqueio.'
      })
    } finally {
      setIsUnlocking(false)
    }
  }

  // Proteção adicional - verificar acesso antes de renderizar
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true' ||
    (localStorage.getItem('userEmail') && localStorage.getItem('userEmail') !== '') ||
    (user?.email && user.email !== '') ||
    (userProfile?.email && userProfile.email !== '');

  // Se não estiver autenticado, redirecionar
  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      router.push('/auth/face')
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando acesso...</p>
          <p className="text-xs text-muted-foreground mt-2">Faça login para continuar</p>
        </div>
      </div>
    )
  }

  return (
    <SubscriberAccessVerification>
      <AntiCaptureGuard scope="exclusive" userId={user?.email || user?.uid} />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card backdrop-blur-sm border-b border-border sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                  <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-foreground">
                    Galeria Exclusiva
                  </h1>
                  <p className="text-sm sm:text-lg text-muted-foreground">
                    Conteúdo premium para assinantes
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilter('all')}
                  className={filter === 'all' ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                >
                  <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">Todos</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilter('photo')}
                  className={filter === 'photo' ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                >
                  <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">Fotos</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilter('video')}
                  className={filter === 'video' ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                >
                  <Video className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">Vídeos</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  {viewMode === 'grid' ? (
                    <>
                      <List className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span className="hidden sm:inline">Lista</span>
                    </>
                  ) : (
                    <>
                      <Grid3X3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span className="hidden sm:inline">Grid</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <Card className="bg-card border border-border">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Total de Conteúdo</p>
                    <p className="text-lg sm:text-2xl font-bold text-foreground">{content.length}</p>
                  </div>
                  <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border border-border">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Fotos</p>
                    <p className="text-lg sm:text-2xl font-bold text-foreground">{photos.length}</p>
                  </div>
                  <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8 text-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border border-border">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Vídeos</p>
                    <p className="text-lg sm:text-2xl font-bold text-foreground">{videos.length}</p>
                  </div>
                  <Video className="w-6 h-6 sm:w-8 sm:h-8 text-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border border-border">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Visualizações</p>
                    <p className="text-lg sm:text-2xl font-bold text-foreground">{totalViews}</p>
                  </div>
                  <Eye className="w-6 h-6 sm:w-8 sm:h-8 text-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Grid */}
          <div className="bg-card backdrop-blur-sm rounded-xl border border-border p-4 sm:p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-foreground">Carregando conteúdo...</p>
              </div>
            ) : content.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                  <Sparkles className="w-8 h-8 text-foreground" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Nenhum conteúdo encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  Não há conteúdo disponível no momento. Tente novamente mais tarde.
                </p>
              </div>
            ) : (
              <div className={`grid gap-4 ${viewMode === 'grid'
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'grid-cols-1'
                }`}>
                {filteredContent.map((item) => (
                  <Card
                    key={item.id}
                    className="group bg-card backdrop-blur-sm border border-border overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
                    onClick={() => handleContentClick(item)}
                  >
                    <div className="relative aspect-square sm:aspect-video">
                      {item.type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <div className="bg-black/50 rounded-full p-2">
                            <Play className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      )}
                      <Image
                        src={item.thumbnailUrl || '/placeholder-photo.svg'}
                        alt={item.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      {isItemLocked(item) && (
                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 text-white">
                          <Lock className="w-8 h-8" />
                          <div className="text-center">
                            <p className="text-sm font-semibold">Conteudo bloqueado</p>
                            <p className="text-xs text-white/80">Desbloqueie por {unlockSymbol} {UNLOCK_PRICE_BRL.toFixed(2)}</p>
                          </div>
                          <Button
                            size="sm"
                            className="bg-white text-black hover:bg-white/90"
                            onClick={(event) => {
                              event.stopPropagation()
                              setUnlockTarget(item)
                              setIsUnlockModalOpen(true)
                            }}
                          >
                            <CreditCard className="w-4 h-4 mr-1" />
                            Pagar para desbloquear
                          </Button>
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold shadow-lg">
                          Exclusivo
                        </Badge>
                      </div>

                      {/* Action buttons */}
                      <div className="absolute bottom-2 right-2 flex gap-1">
                        {/* Botões de compartilhar e download removidos conforme solicitado */}
                      </div>
                    </div>

                    <CardContent className="p-3 sm:p-4">
                      <h3 className="font-semibold text-foreground mb-2 line-clamp-2 text-sm sm:text-base">{item.title}</h3>
                      {item.description && (
                        <p className="text-muted-foreground text-xs sm:text-sm mb-3 line-clamp-2">{item.description}</p>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>{item.viewCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {item.type === 'photo' ? (
                            <ImageIcon className="w-3 h-3" />
                          ) : (
                            <Video className="w-3 h-3" />
                          )}
                          <span className="capitalize">{item.type}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8">
            <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
              <p className="text-foreground font-medium text-center text-sm sm:text-base">
                ✨ Conteúdo exclusivo atualizado regularmente
              </p>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Aproveite todo o conteúdo premium disponível para assinantes
              </p>
            </div>
          </div>
        </div>

        {/* Content Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">{selectedContent?.title}</DialogTitle>
            </DialogHeader>

            {selectedContent && (
              <div className="space-y-4">
                <div className="relative aspect-video">
                  {selectedContent.type === 'video' ? (
                    <div className="w-full h-full">
                      <SmartVideoPlayer
                        url={selectedContent.url || selectedContent.fullUrl || ''}
                        title={selectedContent.title}
                        className="w-full h-full rounded-lg"
                        showControls={true}
                      />
                    </div>
                  ) : (
                    <Image
                      src={selectedContent.url || selectedContent.thumbnailUrl || '/placeholder-photo.svg'}
                      alt={selectedContent.title}
                      fill
                      className="object-cover rounded-lg"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold">
                    Exclusivo
                  </Badge>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Eye className="w-4 h-4" />
                    <span>{selectedContent.viewCount || 0} visualizações</span>
                  </div>
                </div>

                {selectedContent.description && (
                  <p className="text-muted-foreground text-sm sm:text-base">{selectedContent.description}</p>
                )}

                {/* Botões de compartilhar e download removidos conforme solicitado */}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <UnlockPaymentOptionsModal
          isOpen={isUnlockModalOpen}
          onClose={() => setIsUnlockModalOpen(false)}
          amount={UNLOCK_PRICE_BRL}
          currency={unlockCurrency}
          symbol={unlockSymbol}
          title={unlockTarget?.title}
          onPaymentSuccess={handleUnlockPaymentSuccess}
        />
      </div>

      {/* Debug Component */}
      <SubscriptionDebug />
    </SubscriberAccessVerification>
  )
}