"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DollarSign, Users, CreditCard, Activity, MessageSquare, Star, Package, Eye, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { getDashboardStats, getTopPages, invalidateStatsCache } from '../../../app/admin/actions';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

export default function UsernameAdminPage() {
  const params = useParams();
  const router = useRouter();
  const username = params?.username as string;
  const [showVerifiedModal, setShowVerifiedModal] = useState(false);
  // Debug logs
  useEffect(() => {
    console.log('[AdminPage] username param:', username);
  }, [username]);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMainAdmin, setIsMainAdmin] = useState<boolean | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [adminUid, setAdminUid] = useState<string | null>(null);

  // Verificar autenticação e autorização
  useEffect(() => {
        // Detect ?verified=true in URL
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const verified = params.get('verified');
          console.log('[AdminPage] URLSearchParams:', params.toString());
          if (verified === 'true') {
            console.log('[AdminPage] Modal trigger: verified=true');
            setShowVerifiedModal(true);
          }
        }
    if (!username) {
      setErrorMessage('Username não encontrado');
      setIsLoading(false);
      return;
    }

    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setErrorMessage('Você precisa estar autenticado');
        setIsLoading(false);
        return;
      }

      try {
        // Verificar se o usuário autenticado é o dono deste admin
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        
        if (!adminDoc.exists()) {
          setErrorMessage('Perfil de admin não encontrado');
          setIsLoading(false);
          return;
        }

        const adminData = adminDoc.data() as any;
        const adminUsername = adminData.username?.toLowerCase();
        const paramUsername = username.toLowerCase();

        // Verificar se o username corresponde
        if (adminUsername !== paramUsername) {
          setErrorMessage('Você não tem permissão para acessar este painel');
          setIsLoading(false);
          return;
        }

        // Usuário autorizado
        setIsAuthorized(true);
        setIsMainAdmin(Boolean(adminData.isMainAdmin));
        setAdminUid(user.uid);
        setIsLoading(false);

        // Carregar dados do dashboard
        await loadDashboardData(user.uid);
      } catch (error) {
        console.error('Erro ao verificar autorização:', error);
        setErrorMessage('Erro ao verificar suas permissões');
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [username]);

  const loadDashboardData = useCallback(async (uid?: string) => {
    try {
      const [statsData, topPagesData] = await Promise.all([
        getDashboardStats(uid),
        getTopPages(10),
      ]);
      setStats(statsData);
      setTopPages(topPagesData);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await invalidateStatsCache(adminUid ?? undefined);
      await loadDashboardData(adminUid ?? undefined);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadDashboardData, adminUid]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (errorMessage || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      {showVerifiedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full flex flex-col items-center">
            <h2 className="text-xl font-bold mb-2">Conta verificada!</h2>
            <p className="mb-4">Sua conta <b>{username}</b> foi verificada com sucesso.</p>
            <Button onClick={() => {
              console.log('[AdminPage] Modal fechado pelo usuário');
              setShowVerifiedModal(false);
            }}>Fechar</Button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Bem-vindo ao seu painel de administração
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Grid de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSubscribers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalConversations || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avaliações Pendentes</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingReviews || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Top Pages */}
      {isMainAdmin && topPages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Páginas Mais Populares</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Página</TableHead>
                  <TableHead className="text-right">Visualizações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell className="font-medium">{page.path}</TableCell>
                    <TableCell className="text-right">{page.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
