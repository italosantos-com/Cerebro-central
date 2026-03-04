
"use client";

import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/use-subscription';
import { useUserAuth } from '@/hooks/use-user-auth';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  LogOut, User as UserIcon, CheckCircle, BellRing, CreditCard, Lock, ArrowRight, 
  Video, Star, PlayCircle, Mail, CornerDownRight, Download, DollarSign, Package,
  Heart, TrendingUp, Zap 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { collection, getDocs, orderBy, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import ReviewsSection from '@/components/reviews/reviews-section';
import { KPICard } from '@/components/dashboard/kpi-card';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { PurchaseHistory } from '@/components/dashboard/purchase-history';
import { QuickStats } from '@/components/dashboard/quick-stats';
import { RecommendedContent } from '@/components/dashboard/recommended-content';

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  aiHint?: string;
}

interface Purchase {
  id: string;
  title: string;
  thumbnail: string;
  price: number;
  date: Date;
  type: 'video' | 'photo' | 'bundle';
  status: 'completed' | 'pending' | 'expired';
}

interface RecommendedItem {
  id: string;
  title: string;
  thumbnail: string;
  price: number;
  creator: string;
  rating: number;
  category: string;
}

const subscriptionVideos: Video[] = [
  { id: 'sub_vid_1', title: 'Tutorial Exclusivo de Shibari', thumbnailUrl: 'https://placehold.co/600x400.png', aiHint: 'rope art' },
  { id: 'sub_vid_2', title: 'Sessão Completa de Wax Play', thumbnailUrl: 'https://placehold.co/600x400.png', aiHint: 'candle wax' },
  { id: 'sub_vid_3', title: 'Introdução ao Findom', thumbnailUrl: 'https://placehold.co/600x400.png', aiHint: 'luxury money' },
  { id: 'sub_vid_4', title: 'Guia de Pet Play para Iniciantes', thumbnailUrl: 'https://placehold.co/600x400.png', aiHint: 'person collar' },
];

// Dados de exemplo para os vídeos comprados avulsos
const purchasedVideosExample: Video[] = [
    { id: 'pur_vid_1', title: 'Bastidores Exclusivos #1', thumbnailUrl: 'https://placehold.co/600x400.png', aiHint: 'backstage exclusive' },
    { id: 'pur_vid_2', title: 'Cena Deletada: O Encontro', thumbnailUrl: 'https://placehold.co/600x400.png', aiHint: 'deleted scene' },
]

export default function AssinantePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { subscription, plan, hasActiveSubscription, isLoading: subscriptionLoading } = useSubscription();
  const { userProfile } = useUserAuth();
  const [purchasedVideos, setPurchasedVideos] = useState<Video[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('usuario@exemplo.com');
  const [purchaseHistory, setPurchaseHistory] = useState<Purchase[]>([]);
  const [recommendedItems, setRecommendedItems] = useState<RecommendedItem[]>([]);
  
  // Mock data - será substituído por dados reais depois
  const mockPurchaseHistory: Purchase[] = [
    {
      id: '1',
      title: 'Tutorial Exclusivo de Shibari',
      thumbnail: 'https://placehold.co/600x400.png',
      price: 29.90,
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      type: 'video',
      status: 'completed',
    },
    {
      id: '2',
      title: 'Sessão Completa de Wax Play',
      thumbnail: 'https://placehold.co/600x400.png',
      price: 49.90,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      type: 'video',
      status: 'completed',
    },
    {
      id: '3',
      title: 'Introdução ao Findom',
      thumbnail: 'https://placehold.co/600x400.png',
      price: 39.90,
      date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      type: 'bundle',
      status: 'completed',
    },
  ];

  const mockRecommendedItems: RecommendedItem[] = [
    {
      id: 'r1',
      title: 'Guia Completo de Pet Play',
      thumbnail: 'https://placehold.co/600x400.png',
      price: 34.90,
      creator: 'Creator Premium',
      rating: 4.8,
      category: 'Educativo',
    },
    {
      id: 'r2',
      title: 'Bastidores Exclusivos #15',
      thumbnail: 'https://placehold.co/600x400.png',
      price: 19.90,
      creator: 'Studio Elite',
      rating: 4.9,
      category: 'Behind the Scenes',
    },
    {
      id: 'r3',
      title: 'Cena Deletada: O Encontro',
      thumbnail: 'https://placehold.co/600x400.png',
      price: 24.90,
      creator: 'Premium Content',
      rating: 4.7,
      category: 'Exclusivo',
    },
  ];

  // Mock KPI data
  const kpiData = {
    totalSpent: 119.70,
    totalPurchases: 3,
    activeSubscription: hasActiveSubscription ? 1 : 0,
    favoriteItems: 12,
  };
  
  useEffect(() => {
    setIsClient(true);
    const savedEmail = localStorage.getItem('customerEmail');
    if (savedEmail) {
      setCustomerEmail(savedEmail);
    }
    
    // Mock data initialization
    setPurchaseHistory(mockPurchaseHistory);
    setRecommendedItems(mockRecommendedItems);
  }, []);

  useEffect(() => {
    const fetchPurchasedVideos = async () => {
      setIsLoadingVideos(true);
      try {
        const videosCollection = collection(db, "videos");
        const q = query(videosCollection, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          setPurchasedVideos([
            { id: 'sub_vid_1', title: 'Tutorial Exclusivo de Shibari', thumbnailUrl: 'https://placehold.co/600x400.png', aiHint: 'rope art' },
            { id: 'sub_vid_2', title: 'Sessão Completa de Wax Play', thumbnailUrl: 'https://placehold.co/600x400.png', aiHint: 'candle wax' },
          ]);
        } else {
          const videosList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Video));
          setPurchasedVideos(videosList);
        }
      } catch (error) {
        console.error("Error fetching videos: ", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar vídeos comprados.",
        });
      } finally {
        setIsLoadingVideos(false);
      }
    };

    if (isClient) {
      fetchPurchasedVideos();
    }
  }, [isClient, toast]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hasPaid');
      localStorage.removeItem('hasSubscription');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('redirectAfterLogin');
      localStorage.removeItem('customerEmail');
    }
    router.push('/');
  };
  


  const UserProfileCard = () => (
    <Card className="w-full border-border/50 bg-gradient-to-br from-card/80 via-card to-card/60 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-2 border-primary/50">
            <AvatarImage src={userProfile?.photoURL || "https://placehold.co/100x100.png"} alt="Avatar" />
            <AvatarFallback className="text-2xl bg-primary/20">{userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">
              Bem-vindo(a), {userProfile?.displayName?.split(' ')[0] || 'Usuário'}! 👋
            </CardTitle>
            <CardDescription>Painel do Assinante - E-commerce de Mídias Digitais</CardDescription>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2">
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-3 text-sm">
        <Separator className="my-2" />
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-semibold flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                Verificado
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-semibold text-xs truncate">{customerEmail}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!isClient || subscriptionLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const VideoGrid = ({ videos, onVideoClick }: { videos: Video[], onVideoClick: (id: string) => void}) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {videos.map(video => (
        <button key={video.id} className="relative group overflow-hidden rounded-lg border border-primary/20 text-left" onClick={() => onVideoClick(video.id)}>
          <Image src={video.thumbnailUrl} alt={video.title} width={300} height={169} className="object-cover w-full aspect-video transition-transform duration-300 group-hover:scale-105" />
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
            <PlayCircle className="h-12 w-12 text-white mb-2"/>
            <h3 className="font-bold text-white line-clamp-2">{video.title}</h3>
          </div>
        </button>
      ))}
    </div>
  );

  const SubscriptionSection = () => (
    <Card className="w-full border-border/50 bg-card/90 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" /> 
          {hasActiveSubscription ? 'Sua Assinatura' : 'Conteúdo Exclusivo'}
        </CardTitle>
        <CardDescription>
          {hasActiveSubscription && subscription && plan
            ? `Plano ${plan.name} - Expira em ${new Date(subscription.expirationDate).toLocaleDateString('pt-BR')}`
            : 'Assine para ter acesso a conteúdo exclusivo.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasActiveSubscription ? (
          <div className="space-y-4">
            {subscription && plan && (
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">{plan.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Ativo até {new Date(subscription.expirationDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price)}
                    </p>
                    <p className="text-xs text-muted-foreground">Via {subscription.paymentMethod}</p>
                  </div>
                </div>
              </div>
            )}
            <VideoGrid videos={subscriptionVideos} onVideoClick={(id) => router.push(`/assinante/videos?id=${id}`)} />
          </div>
        ) : (
          <div className="text-center p-8 rounded-lg border border-dashed border-border bg-muted/30">
            <Lock className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-semibold">Assinatura Inativa</h3>
            <p className="text-sm text-muted-foreground mt-2 mb-4">
              Assine para ter acesso a tutoriais e vídeos exclusivos.
            </p>
            <Button onClick={() => router.push('/')} className="w-full sm:w-auto">
              <CreditCard className="mr-2 h-4 w-4" />
              Assinar Agora
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const PurchasedVideosSection = () => (
    <Card className="w-full border-border/50 bg-card/90 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2"><Video className="w-5 h-5 text-primary" /> Vídeos Comprados</CardTitle>
        <CardDescription>Seu conteúdo liberado para assistir a qualquer momento.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingVideos ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : purchasedVideos.length > 0 ? (
          <VideoGrid videos={purchasedVideos} onVideoClick={(id) => router.push(`/assinante/videos?id=${id}`)} />
        ) : (
          <div className="text-center p-8 rounded-lg border border-dashed border-border bg-muted/30">
            <p className="text-muted-foreground">Você ainda não comprou nenhum vídeo avulso.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <main className="w-full min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header with User Info */}
        <UserProfileCard />

        {/* Date Range Picker */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <p className="text-sm text-muted-foreground">Acompanhe suas compras e assinatura</p>
          </div>
          <DateRangePicker />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Gasto"
            value={new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(kpiData.totalSpent)}
            change={12.5}
            trend="up"
            icon={<DollarSign className="w-5 h-5" />}
            description="Últimos 30 dias"
          />
          
          <KPICard
            title="Compras Realizadas"
            value={kpiData.totalPurchases}
            change={3}
            trend="up"
            icon={<Package className="w-5 h-5" />}
            description="Conteúdo liberado"
          />
          
          <KPICard
            title="Assinatura Ativa"
            value={hasActiveSubscription ? 'Sim' : 'Não'}
            icon={<Star className="w-5 h-5" />}
            trend={hasActiveSubscription ? 'up' : 'down'}
            description={hasActiveSubscription ? 'Premium' : 'Sem plano'}
          />
          
          <KPICard
            title="Favoritos"
            value={kpiData.favoriteItems}
            change={5}
            trend="up"
            icon={<Heart className="w-5 h-5" />}
            description="Conteúdo salvo"
          />
        </div>

        {/* Quick Stats */}
        <QuickStats />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <SubscriptionSection />
            <PurchasedVideosSection />
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <RecommendedContent
              items={recommendedItems}
              onBuyClick={(id) => router.push(`/?product=${id}`)}
            />
          </div>
        </div>

        {/* Purchase History & Reviews */}
        <div className="space-y-8">
          <PurchaseHistory
            purchases={purchaseHistory}
            onViewClick={(id) => router.push(`/assinante/videos?id=${id}`)}
          />
          
          <Separator className="my-8" />
          
          <ReviewsSection title="Avaliações & Comentários" maxReviews={10} />
        </div>
      </div>
    </main>
  );
}
