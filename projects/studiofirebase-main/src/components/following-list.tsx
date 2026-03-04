"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ExternalLink, CheckCircle, Calendar, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Subscription {
  id: string;
  adminUid: string;
  adminUsername?: string;
  adminName?: string;
  adminPhotoURL?: string;
  status: string;
  startDate?: unknown;
  endDate?: unknown;
  planId: string;
  paymentMethod?: string;
  amount?: number;
  paymentDate?: unknown;
}

interface FollowingListProps {
  userId: string;
  userEmail: string;
}

export default function FollowingList({ userId, userEmail }: FollowingListProps) {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const toDate = (value: unknown): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof value === 'object' && value !== null) {
      const maybeTimestamp = value as { toDate?: () => Date; seconds?: number };
      if (typeof maybeTimestamp.toDate === 'function') {
        const parsed = maybeTimestamp.toDate();
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }
      if (typeof maybeTimestamp.seconds === 'number') {
        const parsed = new Date(maybeTimestamp.seconds * 1000);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }
    }
    return null;
  };

  const formatDateTime = (value: unknown): string => {
    const date = toDate(value);
    if (!date) return 'Não informado';
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentMethodLabel = (paymentMethod?: string): string => {
    const normalized = (paymentMethod || '').toLowerCase();
    const labels: Record<string, string> = {
      pix: 'PIX',
      paypal: 'PayPal',
      mercadopago: 'Mercado Pago',
      mercado_pago: 'Mercado Pago',
      stripe: 'Stripe',
      card: 'Cartão',
      credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito',
      google_pay: 'Google Pay',
      googlepay: 'Google Pay',
      apple_pay: 'Apple Pay',
      applepay: 'Apple Pay',
      gift: 'Gift',
    };
    return labels[normalized] || (paymentMethod ? paymentMethod : 'Não informado');
  };

  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (!userId && !userEmail) {
        setIsLoading(false);
        return;
      }

      try {
        const subscribersRef = collection(db, 'subscribers');

        const snapshots = await Promise.all([
          userId
            ? getDocs(query(subscribersRef, where('userId', '==', userId), where('status', '==', 'active')))
            : Promise.resolve(null),
          userEmail
            ? getDocs(query(subscribersRef, where('email', '==', userEmail), where('status', '==', 'active')))
            : Promise.resolve(null),
        ]);

        const subs: Subscription[] = [];
        const seenSubscriptionIds = new Set<string>();
        const uniqueAdminUids = new Set<string>();

        snapshots
          .filter(Boolean)
          .forEach((snapshot) => {
            snapshot!.forEach((docSnap) => {
              if (seenSubscriptionIds.has(docSnap.id)) return;
              seenSubscriptionIds.add(docSnap.id);

              const data = docSnap.data();

              subs.push({
                id: docSnap.id,
                adminUid: data.adminUid || '',
                adminUsername: data.adminUsername || data.publicUsername || data.username,
                adminName: data.adminName || data.name,
                adminPhotoURL: data.adminPhotoURL || data.photoURL || data.profilePictureUrl,
                status: data.status,
                startDate: data.startDate || data.subscriptionStartDate || data.createdAt,
                endDate: data.endDate || data.subscriptionEndDate || data.expiresAt,
                planId: data.planId || 'monthly',
                paymentMethod: data.paymentMethod,
                amount: data.amount,
                paymentDate: data.paymentDate || data.startDate || data.subscriptionStartDate || data.createdAt,
              });

              if (data.adminUid) {
                uniqueAdminUids.add(data.adminUid);
              }
            });
          });

        // fallback global profile (quando assinatura antiga não tem adminUid/nome/foto)
        const globalProfileSnap = await getDoc(doc(db, 'admin', 'profileSettings'));
        const globalProfile = globalProfileSnap.exists() ? (globalProfileSnap.data() as any) : null;

        // Batch fetch admin information for all subscriptions missing it
        if (uniqueAdminUids.size > 0) {
          try {
            const adminUidsArray = Array.from(uniqueAdminUids);

            const adminEntries = await Promise.all(
              adminUidsArray.map(async (adminUid) => {
                try {
                  const [adminSnap, profileSettingsSnap] = await Promise.all([
                    getDoc(doc(db, 'admins', adminUid)),
                    getDoc(doc(db, 'admins', adminUid, 'profile', 'settings')),
                  ]);

                  const adminData = adminSnap.exists() ? adminSnap.data() : {};
                  const profileData = profileSettingsSnap.exists() ? profileSettingsSnap.data() : {};

                  return [
                    adminUid,
                    {
                      username: (adminData as any)?.publicUsername || (adminData as any)?.username,
                      name: (adminData as any)?.name || (adminData as any)?.displayName,
                      photoURL: (profileData as any)?.profilePictureUrl || (adminData as any)?.photoURL,
                    },
                  ] as const;
                } catch {
                  return [adminUid, null] as const;
                }
              })
            );

            const adminMap = new Map(adminEntries.filter(([, value]) => !!value) as Array<[string, { username?: string; name?: string; photoURL?: string }]>);

            // Update subscriptions with admin data
            subs.forEach((sub) => {
              const adminInfo = adminMap.get(sub.adminUid);

              if (!sub.adminUsername) sub.adminUsername = adminInfo?.username || globalProfile?.publicUsername || globalProfile?.username;
              if (!sub.adminName) sub.adminName = adminInfo?.name || globalProfile?.name;
              if (!sub.adminPhotoURL) sub.adminPhotoURL = adminInfo?.photoURL || globalProfile?.profilePictureUrl;
            });
          } catch (error) {
            console.error('Error batch fetching admin info:', error);
          }
        } else {
          subs.forEach((sub) => {
            if (!sub.adminUsername) sub.adminUsername = globalProfile?.publicUsername || globalProfile?.username;
            if (!sub.adminName) sub.adminName = globalProfile?.name;
            if (!sub.adminPhotoURL) sub.adminPhotoURL = globalProfile?.profilePictureUrl;
          });
        }

        setSubscriptions(
          subs.sort((a, b) => {
            const aMs = toDate(a.endDate)?.getTime() || 0;
            const bMs = toDate(b.endDate)?.getTime() || 0;
            return bMs - aMs;
          })
        );
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptions();
  }, [userId, userEmail]);

  const handleViewProfile = (subscription: Subscription) => {
    if (subscription.adminUsername) {
      router.push(`/${subscription.adminUsername}`);
    }
  };

  const getExpiryInfo = (endDate: unknown) => {
    try {
      const date = toDate(endDate);
      if (!date) {
        return { text: 'Data inválida', variant: 'secondary' as const, isExpired: true };
      }
      const now = new Date();

      if (date < now) {
        return { text: 'Expirado', variant: 'destructive' as const, isExpired: true };
      }

      const daysRemaining = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysRemaining <= 7) {
        return {
          text: `Expira em ${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''}`,
          variant: 'secondary' as const,
          isExpired: false
        };
      }

      return {
        text: formatDistanceToNow(date, { addSuffix: true, locale: ptBR }),
        variant: 'default' as const,
        isExpired: false
      };
    } catch {
      return { text: 'Data inválida', variant: 'secondary' as const, isExpired: true };
    }
  };

  const getPlanName = (planId: string): string => {
    const plans: Record<string, string> = {
      'monthly': 'Mensal',
      'quarterly': 'Trimestral',
      'annual': 'Anual',
      'yearly': 'Anual',
    };
    return plans[planId.toLowerCase()] || planId;
  };

  if (isLoading) {
    return (
      <Card style={{ backgroundColor: 'var(--app-container-color)', borderColor: 'var(--app-line-color)', color: 'var(--app-text-color)' }}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <Card style={{ backgroundColor: 'var(--app-container-color)', borderColor: 'var(--app-line-color)', color: 'var(--app-text-color)' }}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Seguindo</span>
          </CardTitle>
          <CardDescription>
            Criadores que você está seguindo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Você não está seguindo nenhum criador</p>
            <p className="text-sm mt-2">
              Assine um criador para acessar conteúdo exclusivo
            </p>
            <Button
              variant="default"
              className="mt-4"
              onClick={() => router.push('/')}
            >
              Explorar Criadores
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={{ backgroundColor: 'var(--app-container-color)', borderColor: 'var(--app-line-color)', color: 'var(--app-text-color)' }}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Seguindo</span>
        </CardTitle>
        <CardDescription>
          Você está seguindo {subscriptions.length} criador{subscriptions.length !== 1 ? 'es' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {subscriptions.map((subscription) => {
            const expiryInfo = getExpiryInfo(subscription.endDate);

            return (
              <Card key={subscription.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage
                        src={subscription.adminPhotoURL || ''}
                        alt={subscription.adminName || subscription.adminUsername || 'Criador'}
                      />
                      <AvatarFallback className="text-lg">
                        {(subscription.adminName || subscription.adminUsername || 'C').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {subscription.adminName || subscription.adminUsername || 'Criador'}
                          </h3>
                          {subscription.adminUsername && subscription.adminName && (
                            <p className="text-sm text-muted-foreground">
                              @{subscription.adminUsername}
                            </p>
                          )}
                        </div>

                        <Badge variant="default" className="flex items-center space-x-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>Ativo</span>
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <Badge variant="secondary">
                            {getPlanName(subscription.planId)}
                          </Badge>
                          {subscription.amount && (
                            <span className="text-muted-foreground">
                              R$ {subscription.amount.toFixed(2)}
                            </span>
                          )}
                        </div>

                        <div className="text-sm space-y-1">
                          <p><span className="font-medium">Nome:</span> {subscription.adminName || subscription.adminUsername || 'Criador'}</p>
                          <p><span className="font-medium">Forma de pagamento:</span> {getPaymentMethodLabel(subscription.paymentMethod)}</p>
                          <p><span className="font-medium">Pagamento em:</span> {formatDateTime(subscription.paymentDate || subscription.startDate)}</p>
                          <p><span className="font-medium">Vence em:</span> {formatDateTime(subscription.endDate)}</p>
                          {subscription.adminUsername && (
                            <p><span className="font-medium">Link do perfil:</span> /{subscription.adminUsername}</p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{expiryInfo.text}</span>
                        </div>
                      </div>

                      {subscription.adminUsername && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => handleViewProfile(subscription)}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Visitar Perfil
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
