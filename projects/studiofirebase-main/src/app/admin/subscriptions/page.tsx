'use client';

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Trash2,
  CreditCard,
  User,
  Search,
  Filter,
  Eye,
  Clock,
  Users,
  Crown,
  Gift
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAllSubscriptionsAdmin, cancelUserSubscription, deleteTestSubscriptions, giftSubscriptionDays } from './actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserSubscription, SubscriptionPlan } from '@/lib/subscription-manager';

interface SubscriptionWithPlan extends UserSubscription {
  plan?: SubscriptionPlan;
}

export default function AdminSubscriptionsPage() {
  const { toast } = useToast();
  const [adminUid, setAdminUid] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithPlan[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<SubscriptionWithPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'canceled'>('all');

  // Estados para o modal de presentear
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithPlan | null>(null);
  const [giftDays, setGiftDays] = useState<number>(30);
  const [isGifting, setIsGifting] = useState(false);



  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAdminUid(user?.uid ?? null);
    });
    return () => unsubscribe();
  }, []);

  const fetchSubscriptions = async () => {
    setIsLoading(true);
    try {
      if (!adminUid) {
        setSubscriptions([]);
        setFilteredSubscriptions([]);
        return;
      }
      console.log('[Subscriptions Page] Iniciando fetch...');
      const result = await getAllSubscriptionsAdmin(adminUid);
      console.log('[Subscriptions Page] Resultado:', result);

      if (result && result.success) {
        const subs = result.subscriptions || [];
        console.log('[Subscriptions Page] Total de assinaturas:', subs.length);
        setSubscriptions(subs);
        setFilteredSubscriptions(subs);
      } else {
        console.error('[Subscriptions Page] Erro no resultado:', result?.error);

        // Definir array vazio em caso de erro
        setSubscriptions([]);
        setFilteredSubscriptions([]);

        toast({
          variant: 'destructive',
          title: 'Erro ao carregar assinaturas',
          description: result?.error || 'Erro desconhecido ao buscar dados'
        });
      }
    } catch (error: any) {
      console.error('[Subscriptions Page] Exceção capturada:', error);

      // Garantir que arrays sejam definidos mesmo em erro
      setSubscriptions([]);
      setFilteredSubscriptions([]);

      // Mensagem de erro mais amigável
      const errorMsg = error?.message || error?.toString() || 'Erro interno do servidor';
      console.error('[Subscriptions Page] Detalhes do erro:', errorMsg);

      toast({
        variant: 'destructive',
        title: 'Erro ao carregar assinaturas',
        description: 'Não foi possível carregar os dados. Tente recarregar a página.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar assinaturas
  useEffect(() => {
    let filtered = subscriptions;

    // Filtrar por busca
    if (searchTerm) {
      filtered = filtered.filter(sub =>
        sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.plan?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter);
    }

    setFilteredSubscriptions(filtered);
  }, [subscriptions, searchTerm, statusFilter]);

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta assinatura?')) return;

    try {
      const result = await cancelUserSubscription(subscriptionId, adminUid ?? undefined);
      if (result.success) {
        toast({
          title: 'Assinatura cancelada',
          description: 'A assinatura foi cancelada com sucesso'
        });
        await fetchSubscriptions();
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao cancelar',
          description: result.error
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao cancelar',
        description: 'Erro interno do servidor'
      });
    }
  };

  const handleDeleteTestSubscriptions = async () => {
    if (!confirm('Tem certeza que deseja excluir TODAS as assinaturas de teste? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const result = await deleteTestSubscriptions(adminUid ?? undefined);

      if (result.success) {
        toast({
          title: 'Exclusão concluída',
          description: `${result.deletedCount} assinaturas de teste foram excluídas permanentemente`
        });

        // Recarregar a lista
        await fetchSubscriptions();
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao excluir assinaturas de teste',
          description: result.error || 'Erro desconhecido'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir assinaturas de teste',
        description: 'Erro interno do servidor'
      });
    }
  };

  const handleOpenGiftModal = (subscription: SubscriptionWithPlan) => {
    setSelectedSubscription(subscription);
    setGiftDays(30);
    setIsGiftModalOpen(true);
  };

  const handleGiftSubscription = async () => {
    if (!selectedSubscription || giftDays < 1) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Por favor, insira um número válido de dias (mínimo 1)'
      });
      return;
    }

    setIsGifting(true);
    try {
      const result = await giftSubscriptionDays(
        selectedSubscription.userId,
        selectedSubscription.email,
        giftDays,
        adminUid ?? undefined
      );

      if (result.success) {
        toast({
          title: '🎁 Presente enviado!',
          description: `${selectedSubscription.email} recebeu ${giftDays} dias de assinatura grátis`,
          duration: 5000
        });

        setIsGiftModalOpen(false);
        setSelectedSubscription(null);
        await fetchSubscriptions();
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao presentear',
          description: result.error || 'Erro desconhecido'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao presentear',
        description: 'Erro interno do servidor'
      });
    } finally {
      setIsGifting(false);
    }
  };

  useEffect(() => {
    if (adminUid) {
      fetchSubscriptions();
    }
   
  }, [adminUid]);

  const getStatusBadge = (status: UserSubscription['status']) => {
    const variants = {
      active: 'default',
      expired: 'secondary',
      canceled: 'destructive',
      pending: 'outline'
    } as const;

    const labels = {
      active: 'Ativa',
      expired: 'Expirada',
      canceled: 'Cancelada',
      pending: 'Pendente'
    };

    const colors = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      expired: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      canceled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    };

    return (
      <Badge className={colors[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const formatPrice = (price?: number) => {
    return price ? new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price) : 'N/A';
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    expired: subscriptions.filter(s => s.status === 'expired').length,
    canceled: subscriptions.filter(s => s.status === 'canceled').length
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="rounded-xl bg-black/90 border border-white/10 p-4 backdrop-blur-sm w-full sm:w-auto">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2 text-white">
            <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400" />
            Gerenciar Assinaturas
          </h1>
          <p className="text-xs sm:text-sm text-white/60 mt-1">
            Gerencie todas as assinaturas e assinantes do sistema
          </p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <Card className="w-full">
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Filtros e Busca</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Encontre assinaturas específicas rapidamente
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="w-full">
              <div className="relative">
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3 sm:w-4 sm:h-4" />
                <Input
                  placeholder="Buscar por email, plano..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 sm:pl-10 text-xs sm:text-sm h-9 sm:h-10"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                className="text-xs h-8"
              >
                <Filter className="w-3 h-3 mr-1" />
                Todos ({subscriptions.length})
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('active')}
                className="bg-green-600 hover:bg-green-700 text-xs h-8"
              >
                Ativas ({stats.active})
              </Button>
              <Button
                variant={statusFilter === 'expired' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('expired')}
                className="bg-yellow-600 hover:bg-yellow-700 text-xs h-8"
              >
                Expiradas ({stats.expired})
              </Button>
              <Button
                variant={statusFilter === 'canceled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('canceled')}
                className="bg-red-600 hover:bg-red-700 text-xs h-8"
              >
                Canceladas ({stats.canceled})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Assinaturas */}
      <Card className="w-full">
        <CardHeader className="px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg">Lista de Assinaturas ({filteredSubscriptions.length})</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Gerencie todas as assinaturas do sistema
              </CardDescription>
            </div>
            <div className="text-xs text-muted-foreground">
              {statusFilter === 'all' && subscriptions.length > 0 && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  📊 Todos os {subscriptions.length} usuários cadastrados
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-8 sm:py-10">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="text-center py-8 sm:py-10 text-muted-foreground px-3">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
              <p className="text-base sm:text-lg font-medium">Nenhuma assinatura encontrada</p>
              <p className="text-xs sm:text-sm mt-2">
                {searchTerm || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Ainda não há assinaturas no sistema.'
                }
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <div className="min-w-[900px] inline-block align-middle">
                <Table className="w-full table-auto" style={{ tableLayout: 'auto' }}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Assinante</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Plano</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Pagamento</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Valor</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Período</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Tempo Restante</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscriptions.map((subscription, index) => {
                      const daysRemaining = getDaysRemaining(subscription.endDate);
                      const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;
                      const rowKey = subscription.id || `${subscription.userId}-${subscription.planId}-${index}`;

                      return (
                        <TableRow key={rowKey} className={isExpiringSoon ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-medium">{subscription.email}</div>
                                <div className="text-xs text-muted-foreground">
                                  ID: {subscription.userId?.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {subscription.plan?.name || subscription.planId}
                              </div>
                              {subscription.plan?.popular && (
                                <Badge variant="outline" className="text-xs">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Popular
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(subscription.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-muted-foreground" />
                              <span className="capitalize">{subscription.paymentMethod}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {formatPrice(subscription.plan?.price)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>Início: {formatDate(subscription.startDate)}</div>
                              <div>Fim: {formatDate(subscription.endDate)}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {subscription.status === 'active' ? (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className={isExpiringSoon ? 'text-yellow-600 font-medium' : ''}>
                                  {daysRemaining > 0 ? `${daysRemaining} dias` : 'Expirada'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleOpenGiftModal(subscription)}
                                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                              >
                                <Gift className="h-4 w-4 mr-1" />
                                Presentear
                              </Button>
                              {subscription.status === 'active' && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleCancelSubscription(subscription.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Cancelar
                                </Button>
                              )}
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Presentear Assinatura */}
      <Dialog open={isGiftModalOpen} onOpenChange={setIsGiftModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-600" />
              Presentear com Assinatura Grátis
            </DialogTitle>
            <DialogDescription>
              Adicione dias grátis de assinatura para este membro
            </DialogDescription>
          </DialogHeader>

          {selectedSubscription && (
            <div className="space-y-4 py-4">
              {/* Informações do Usuário */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{selectedSubscription.email}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Status atual: <Badge>{selectedSubscription.status}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Expira em: {formatDate(selectedSubscription.endDate)}
                </div>
              </div>

              {/* Input de Dias */}
              <div className="space-y-2">
                <label htmlFor="giftDays" className="text-sm font-medium">
                  Quantos dias presentear?
                </label>
                <Input
                  id="giftDays"
                  type="number"
                  min="1"
                  max="365"
                  value={giftDays}
                  onChange={(e) => setGiftDays(parseInt(e.target.value) || 1)}
                  className="text-lg font-semibold text-center"
                />
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGiftDays(7)}
                  >
                    7 dias
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGiftDays(30)}
                  >
                    30 dias
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGiftDays(90)}
                  >
                    90 dias
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGiftDays(365)}
                  >
                    1 ano
                  </Button>
                </div>
              </div>

              {/* Previsão */}
              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">
                  Nova data de expiração:
                </div>
                <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                  {(() => {
                    const currentEnd = new Date(selectedSubscription.endDate);
                    const now = new Date();
                    const baseDate = currentEnd > now ? currentEnd : now;
                    const newEnd = new Date(baseDate.getTime() + giftDays * 24 * 60 * 60 * 1000);
                    return newEnd.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    });
                  })()}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  {giftDays} dias serão adicionados à assinatura
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsGiftModalOpen(false)}
                  disabled={isGifting}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleGiftSubscription}
                  disabled={isGifting || giftDays < 1}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isGifting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Presenteando...
                    </>
                  ) : (
                    <>
                      <Gift className="h-4 w-4 mr-2" />
                      Confirmar Presente
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
