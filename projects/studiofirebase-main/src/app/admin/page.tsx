"use client";

import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Users, CreditCard, Activity, MessageSquare, Star, Package, Eye, TrendingUp, BarChart3, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getDashboardStats, getTopPages } from './actions';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { KPICard } from '@/components/dashboard/kpi-card';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { BusinessInsights } from '@/components/dashboard/business-insights';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { SimpleChart, ProgressRing } from '@/components/dashboard/simple-charts';

interface DashboardStats {
  totalSubscribers: number;
  totalConversations: number;
  totalProducts: number;
  pendingReviews: number;
}

interface TopPage {
  id: string;
  path: string;
  count: number;
}


export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMainAdmin, setIsMainAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsMainAdmin(false);
        return;
      }
      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        setIsMainAdmin(adminDoc.exists() && Boolean((adminDoc.data() as any)?.isMainAdmin));
      } catch {
        setIsMainAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchAllData = useCallback(async () => {
    // Guard: Wait for isMainAdmin to be initialized before fetching
    if (isMainAdmin === null) return;

    setIsLoading(true);
    
    try {
      // BUG #7: Para admins não-principais, não buscar estatísticas globais (evita vazar histórico)
      if (isMainAdmin === false) {
        setStats({ totalSubscribers: 0, totalConversations: 0, totalProducts: 0, pendingReviews: 0 });
        setTopPages([]);
        return;
      }
      
      const [dashboardStats, topPagesData] = await Promise.all([
          getDashboardStats(),
          getTopPages()
      ]);
      setStats(dashboardStats);
      setTopPages(topPagesData);
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setIsLoading(false);
    }
  }, [isMainAdmin]);

  useEffect(() => {
    if (isMainAdmin === null) return;
    fetchAllData();
  }, [isMainAdmin, fetchAllData]);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-start justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Admin</h1>
          <p className="text-muted-foreground mt-1">Acompanhe métricas e análises do negócio</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker />
        </div>
      </div>

      {/* Admin Role Warning */}
      {isMainAdmin === false && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
          <Zap className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-600 dark:text-amber-500">Acesso Limitado</p>
            <p className="text-sm text-amber-600/80 dark:text-amber-400/80">Apenas SuperAdmin pode visualizar estatísticas globais completas</p>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total de Assinantes"
          value={isLoading ? '...' : stats?.totalSubscribers ?? 0}
          change={12.5}
          trend="up"
          icon={<Users className="w-5 h-5" />}
          description="Usuários com assinatura ativa"
        />
        
        <KPICard
          title="Conversas Ativas"
          value={isLoading ? '...' : stats?.totalConversations ?? 0}
          change={8.3}
          trend="up"
          icon={<MessageSquare className="w-5 h-5" />}
          description="Chats últimos 7 dias"
        />
        
        <KPICard
          title="Produtos Cadastrados"
          value={isLoading ? '...' : stats?.totalProducts ?? 0}
          change={2}
          trend="up"
          icon={<Package className="w-5 h-5" />}
          description="Mídias disponíveis"
        />
        
        <KPICard
          title="Avaliações Pendentes"
          value={isLoading ? '...' : stats?.pendingReviews ?? 0}
          change={-5}
          trend={((stats?.pendingReviews ?? 0) > 0) ? 'down' : 'neutral'}
          icon={<Star className="w-5 h-5" />}
          description="Comentários para moderar"
        />
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-border/50 bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-xs font-medium text-muted-foreground uppercase">Receita Estimada</p>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(isLoading ? 0 : (stats?.totalSubscribers ?? 0) * 29.9)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Baseado em assinantes</p>
        </div>

        <div className="p-4 rounded-lg border border-border/50 bg-blue-500/5">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <p className="text-xs font-medium text-muted-foreground uppercase">Engajamento</p>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {isLoading ? '...' : Math.round(((stats?.totalConversations ?? 0) / Math.max(stats?.totalSubscribers ?? 1, 1)) * 100)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">Taxa de atividade</p>
        </div>

        <div className="p-4 rounded-lg border border-border/50 bg-green-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-green-500" />
            <p className="text-xs font-medium text-muted-foreground uppercase">Catálogo</p>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {isLoading ? '...' : Math.round((stats?.totalProducts ?? 0) / Math.max((topPages.length || 1), 1))}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Média por seção</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <SimpleChart
          title="Distribuição de Assinantes por Plano"
          data={[
            { label: 'Plano Premium', value: Math.round((stats?.totalSubscribers ?? 0) * 0.6), percentage: 60, color: 'bg-purple-500' },
            { label: 'Plano Standard', value: Math.round((stats?.totalSubscribers ?? 0) * 0.3), percentage: 30, color: 'bg-blue-500' },
            { label: 'Plano Básico', value: Math.round((stats?.totalSubscribers ?? 0) * 0.1), percentage: 10, color: 'bg-gray-500' },
          ]}
          description="Essa semana"
        />

        <SimpleChart
          title="Top 5 Produtos Mais Vendidos"
          data={[
            { label: 'Tutorial de Shibari', value: 45, percentage: 100, color: 'bg-rose-500' },
            { label: 'Wax Play Completo', value: 32, percentage: 71, color: 'bg-pink-500' },
            { label: 'Pet Play Guide', value: 28, percentage: 62, color: 'bg-red-500' },
            { label: 'Bastidores #5', value: 19, percentage: 42, color: 'bg-orange-500' },
            { label: 'Findom Intro', value: 12, percentage: 26, color: 'bg-yellow-500' },
          ]}
          description="Últimos 30 dias"
        />
      </div>

      {/* Progress Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProgressRing
          title="Meta de Assinantes"
          value={stats?.totalSubscribers ?? 0}
          max={100}
          suffix="assinantes"
          color="#3b82f6"
          description="Você está próximo!"
        />

        <ProgressRing
          title="Produtos Catalogados"
          value={stats?.totalProducts ?? 0}
          max={10}
          suffix="de 10"
          color="#10b981"
          description="Bom progresso"
        />

        <ProgressRing
          title="Qualidade de Moderação"
          value={10 - (stats?.pendingReviews ?? 0)}
          max={10}
          suffix="%"
          color="#f59e0b"
          description="Mantendo alto padrão"
        />

        <ProgressRing
          title="Engajamento da Comunidade"
          value={Math.min(Math.round(((stats?.totalConversations ?? 0) / 100) * 100), 100)}
          max={100}
          suffix="active"
          color="#8b5cf6"
          description="Comunidade viva"
        />
      </div>

      {/* Bottom Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <BusinessInsights />
        <RecentActivity />
      </div>

      {/* Top Pages Table */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Páginas Mais Acessadas
            </CardTitle>
            <CardDescription>Análise de tráfego e visualizações</CardDescription>
          </div>
          <Badge variant="outline">{topPages.length} páginas</Badge>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-32 bg-muted rounded animate-pulse" />
          ) : topPages.length > 0 ? (
            <div className="space-y-3">
              {topPages.map((page, idx) => (
                <div
                  key={page.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{idx + 1}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate text-foreground">{page.path}</p>
                      <p className="text-xs text-muted-foreground">Página</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-primary text-lg">{page.count}</p>
                      <p className="text-xs text-muted-foreground">visualizações</p>
                    </div>
                    
                    {/* Visual bar */}
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{
                          width: `${(page.count / Math.max(...topPages.map(p => p.count), 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Eye className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">
                {isMainAdmin === false
                  ? 'Estatísticas de tráfego estão ocultas para este perfil.'
                  : 'Nenhum dado de visualização de página ainda.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <BusinessInsights />
        <RecentActivity />
      </div>
    </div>
  );
}



