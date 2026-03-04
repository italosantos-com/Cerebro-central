'use client';

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, TrendingUp, Users, DollarSign } from 'lucide-react';
import { getAllSubscriptionsAdmin } from '@/app/admin/subscriptions/actions';
import { UserSubscription, SubscriptionPlan } from '@/lib/subscription-manager';

interface SubscriptionWithPlan extends UserSubscription {
  plan?: SubscriptionPlan;
}

export default function SubscriptionStats() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithPlan[]>([]);
  const [adminUid, setAdminUid] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAdminUid(user?.uid ?? null);
    });
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!adminUid) {
          setSubscriptions([]);
          return;
        }

        const result = await getAllSubscriptionsAdmin(adminUid);
        if (result.success) {
          setSubscriptions(result.subscriptions || []);
        }
      } catch (error) {

      }
    };

    fetchStats();
  }, [adminUid]);

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    monthlyRevenue: subscriptions
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + (s.plan?.price || 0), 0),
    conversionRate: subscriptions.length > 0 
      ? ((subscriptions.filter(s => s.status === 'active').length / subscriptions.length) * 100).toFixed(1)
      : '0.0'
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Assinaturas</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            Todas as assinaturas criadas
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <p className="text-xs text-muted-foreground">
            Pagantes ativos
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(stats.monthlyRevenue)}
          </div>
          <p className="text-xs text-muted-foreground">
            Receita recorrente
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.conversionRate}%</div>
          <p className="text-xs text-muted-foreground">
            Assinaturas ativas / total
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
