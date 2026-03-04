import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';

export interface UserSubscription {
  id: string;
  userId: string;
  adminUid?: string;
  planId: string;
  email: string;
  paymentId: string;
  paymentMethod: 'pix' | 'paypal' | 'mercadopago' | 'google_pay' | 'gift';
  status: 'active' | 'expired' | 'canceled' | 'pending';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration: number;
  features: string[];
  popular?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'monthly',
    name: 'Assinatura Mensal',
    price: 99.00,
    duration: 30,
    features: [
      'Acesso total ao conteúdo exclusivo',
      'Downloads ilimitados',
      'Suporte dedicado',
      'Conteúdo em alta definição'
    ],
    popular: true
  }
];

class SubscriptionManager {
  private static rtdbUnavailable = false;
  private static firestoreUnavailable = false;

  // Função para sanitizar dados antes de enviar para o Firebase
  private sanitizeData(data: any): any {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null) {
        // Converter undefined/null para string vazia ou valor padrão
        if (key === 'amount') {
          sanitized[key] = 99.00;
        } else if (key === 'planId') {
          sanitized[key] = 'monthly';
        } else if (key === 'paymentMethod') {
          sanitized[key] = 'pix';
        } else if (key === 'status') {
          sanitized[key] = 'active';
        } else {
          sanitized[key] = '';
        }
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
  async getAllSubscriptions(): Promise<UserSubscription[]> {
    const subscriptions: UserSubscription[] = [];

    try {
      const adminApp = getAdminApp();


      // 1. Buscar do Realtime Database
      if (adminApp && !SubscriptionManager.rtdbUnavailable) {
        try {
          const rtdb = getDatabase(adminApp);
          const subscriptionsRef = rtdb.ref('subscriptions');
          const snapshot = await subscriptionsRef.once('value');
          const subscriptionsData = snapshot.val();

          if (subscriptionsData) {
            const subs = Object.entries(subscriptionsData).map(([id, data]: [string, any]) => ({
              id,
              userId: data.userId || '',
              planId: data.planId || 'monthly',
              email: data.email || '',
              paymentId: data.paymentId || '',
              paymentMethod: data.paymentMethod || 'pix',
              status: data.status || 'active',
              startDate: data.startDate || data.createdAt || new Date().toISOString(),
              endDate: data.endDate || data.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              autoRenew: data.autoRenew || false,
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString()
            }));
            subscriptions.push(...subs);

          }
        } catch (error: any) {
          SubscriptionManager.rtdbUnavailable = true;
          const message = error?.message || String(error);
          console.warn('[SubscriptionManager] RTDB indisponível, usando apenas Firestore.', message);
        }
      }

      const adminDb = getAdminDb();
      // 2. Buscar do Firestore
      if (adminDb && !SubscriptionManager.firestoreUnavailable) {
        try {
          const subscribersSnapshot = await adminDb.collection('subscribers').get();

          subscribersSnapshot.forEach((doc: any) => {
            const data = doc.data();
            const subscription: UserSubscription = {
              id: doc.id,
              userId: data.userId || data.customerId || '',
              planId: data.planId || 'monthly',
              email: data.email || data.customerEmail || '',
              paymentId: data.paymentId || data.transactionId || '',
              paymentMethod: data.paymentMethod || 'pix',
              status: data.status || 'active',
              startDate: data.startDate || data.createdAt || new Date().toISOString(),
              endDate: data.endDate || data.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              autoRenew: data.autoRenew || false,
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString()
            };
            subscriptions.push(subscription);
          });


        } catch (error: any) {
          SubscriptionManager.firestoreUnavailable = true;
          const message = error?.message || String(error);
          console.warn('[SubscriptionManager] Firestore indisponível durante leitura de assinaturas.', message);
        }
      }


      return subscriptions;
    } catch (error) {

      return [];
    }
  }

  async createSubscription(data: {
    userId: string;
    email: string;
    planId: string;
    paymentId: string;
    paymentMethod: 'pix' | 'paypal' | 'mercadopago' | 'google_pay';
    amount?: number;
    adminUid?: string;
  }): Promise<string> {
    try {
      console.log('[SubscriptionManager] Criando assinatura:', data);
      console.log('[SubscriptionManager] NODE_ENV:', process.env.NODE_ENV);

      const now = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      let subscriptionId = '';

      // Tentar usar Firebase Admin SDK
      const adminApp = getAdminApp();
      const adminDb = getAdminDb();

      console.log('[SubscriptionManager] Admin App obtido:', !!adminApp);
      console.log('[SubscriptionManager] Admin DB obtido:', !!adminDb);

      if (adminApp && adminDb) {
        try {
          console.log('[SubscriptionManager] 🚀 Usando Firebase Admin SDK...');

          // Salvar no Realtime Database
          const rtdb = getDatabase(adminApp);
          const subscriptionsRef = rtdb.ref('subscriptions');
          const newSubscriptionRef = subscriptionsRef.push();

          await newSubscriptionRef.set({
            userId: data.userId || '',
            email: data.email || '',
            planId: data.planId || 'monthly',
            paymentId: data.paymentId || '',
            paymentMethod: data.paymentMethod || 'pix',
            status: 'active',
            startDate: now.toISOString(),
            endDate: endDate.toISOString(),
            amount: data.amount || 99.00,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            ...(data.adminUid ? { adminUid: data.adminUid } : {})
          });

          subscriptionId = newSubscriptionRef.key!;
          console.log('[SubscriptionManager] ✅ Assinatura criada no RTDB (Admin):', subscriptionId);

          // Salvar no Firestore
          const subscribersRef = adminDb.collection('subscribers');
          const newSubscriberDoc = await subscribersRef.add({
            userId: data.userId || '',
            email: data.email || '',
            planId: data.planId || 'monthly',
            paymentId: data.paymentId || '',
            paymentMethod: data.paymentMethod || 'pix',
            status: 'active',
            startDate: now.toISOString(),
            endDate: endDate.toISOString(),
            amount: data.amount || 99.00,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            ...(data.adminUid ? { adminUid: data.adminUid } : {})
          });

          console.log('[SubscriptionManager] ✅ Assinatura criada no Firestore (Admin):', newSubscriberDoc.id);

          // 🔄 ATUALIZAR PERFIL DO USUÁRIO para mostrar como assinante (IGUAL AOS OUTROS MÉTODOS)
          try {
            console.log('[SubscriptionManager]  Atualizando perfil do usuário...');

            // Buscar usuário por email ou userId (MESMA LÓGICA DOS OUTROS MÉTODOS)
            const usersRef = adminDb.collection('users');
            let userQuery;

            if (data.userId) {
              userQuery = await usersRef.where('uid', '==', data.userId).get();
            }

            if (!userQuery || userQuery.empty) {
              userQuery = await usersRef.where('email', '==', data.email).get();
            }

            if (userQuery && !userQuery.empty) {
              // ✅ USUÁRIO EXISTE - ATUALIZAR (IGUAL AO PAYPAL)
              const userDoc = userQuery.docs[0];
              await userDoc.ref.update({
                isSubscriber: true,
                subscriptionStatus: 'active',
                planId: data.planId || 'monthly',
                paymentId: data.paymentId || '',
                paymentMethod: data.paymentMethod || 'pix',
                subscriptionStartDate: now.toISOString(),
                subscriptionEndDate: endDate.toISOString(),
                amount: data.amount || 99.00,
                updatedAt: now.toISOString(),
                ...(data.adminUid ? { adminUid: data.adminUid } : {})
              });

              console.log('[SubscriptionManager] ✅ Perfil do usuário atualizado com sucesso!');
            } else {
              // ✅ USUÁRIO NÃO EXISTE - CRIAR NOVO (IGUAL AO PAYPAL)
              console.log('[SubscriptionManager]  Usuário não encontrado, criando novo perfil...');

              await usersRef.add({
                email: data.email,
                uid: data.userId,
                isSubscriber: true,
                subscriptionStatus: 'active',
                planId: data.planId || 'monthly',
                paymentId: data.paymentId || '',
                paymentMethod: data.paymentMethod || 'pix',
                subscriptionStartDate: now.toISOString(),
                subscriptionEndDate: endDate.toISOString(),
                amount: data.amount || 99.00,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
                ...(data.adminUid ? { adminUid: data.adminUid } : {})
              });

              console.log('[SubscriptionManager] ✅ Novo perfil de usuário criado com sucesso!');
            }
          } catch (profileError) {
            console.error('[SubscriptionManager] ❌ Erro ao atualizar/criar perfil do usuário:', profileError);
            // Não falhar a criação da assinatura por causa do erro no perfil
          }

        } catch (adminError) {
          console.error('[SubscriptionManager] ❌ Erro no Admin SDK:', adminError);
          throw adminError;
        }
      } else {
        console.error('[SubscriptionManager] ❌ Admin SDK não disponível');
        throw new Error('Firebase Admin SDK não está disponível');
      }

      // Verificação final
      if (!subscriptionId) {
        console.error('[SubscriptionManager] ❌ CRÍTICO: Nenhum ID foi gerado!');
        throw new Error('Falha ao criar assinatura - nenhum ID gerado');
      }

      console.log('[SubscriptionManager] ✅ SUCCESS: Assinatura criada com ID:', subscriptionId);
      return subscriptionId;
    } catch (error) {
      console.error('[SubscriptionManager] ❌ Erro ao criar assinatura:', error);
      throw error;
    }
  }

  async updateSubscriptionStatus(subscriptionId: string, status: UserSubscription['status']): Promise<void> {
    try {
      console.log(`[SubscriptionManager] Atualizando status da assinatura ${subscriptionId} para ${status}`);

      const adminApp = getAdminApp();
      // Atualizar no Realtime Database
      if (adminApp) {
        const rtdb = getDatabase(adminApp);
        const subscriptionRef = rtdb.ref(`subscriptions/${subscriptionId}`);

        await subscriptionRef.update({
          status,
          updatedAt: new Date().toISOString()
        });

        console.log('[SubscriptionManager] Status atualizado no RTDB');
      }

      const adminDb = getAdminDb();
      // Atualizar no Firestore
      if (adminDb) {
        const subscriberDoc = adminDb.collection('subscribers').doc(subscriptionId);
        await subscriberDoc.update({
          status,
          updatedAt: new Date().toISOString()
        });

        console.log('[SubscriptionManager] Status atualizado no Firestore');
      }
    } catch (error) {
      console.error('[SubscriptionManager] Erro ao atualizar status:', error);
      throw error;
    }
  }

  async cleanupExpiredSubscriptions(): Promise<number> {
    try {
      console.log('[SubscriptionManager] Iniciando cleanup de assinaturas expiradas...');
      let expiredCount = 0;

      const adminApp = getAdminApp();
      // Cleanup no Realtime Database
      if (adminApp) {
        const rtdb = getDatabase(adminApp);
        const subscriptionsRef = rtdb.ref('subscriptions');
        const snapshot = await subscriptionsRef.once('value');
        const subscriptions = snapshot.val();

        if (subscriptions) {
          const updates: any = {};

          Object.entries(subscriptions).forEach(([id, data]: [string, any]) => {
            if (data.status === 'active' && data.endDate) {
              const endDate = new Date(data.endDate);
              if (endDate <= new Date()) {
                updates[`${id}/status`] = 'expired';
                updates[`${id}/updatedAt`] = new Date().toISOString();
                expiredCount++;
              }
            }
          });

          if (Object.keys(updates).length > 0) {
            await subscriptionsRef.update(updates);
            console.log(`[SubscriptionManager] ${expiredCount} assinaturas expiradas atualizadas no RTDB`);
          }
        }
      }

      const adminDb = getAdminDb();
      // Cleanup no Firestore
      if (adminDb) {
        const subscribersSnapshot = await adminDb.collection('subscribers').where('status', '==', 'active').get();

        for (const doc of subscribersSnapshot.docs) {
          const data = doc.data();
          if (data.endDate) {
            const endDate = new Date(data.endDate);
            if (endDate <= new Date()) {
              await doc.ref.update({
                status: 'expired',
                updatedAt: new Date().toISOString()
              });
              expiredCount++;
            }
          }
        }

        console.log(`[SubscriptionManager] ${expiredCount} assinaturas expiradas atualizadas no Firestore`);
      }

      return expiredCount;
    } catch (error) {
      console.error('[SubscriptionManager] Erro no cleanup:', error);
      throw error;
    }
  }

  async isSubscriptionActive(userId: string): Promise<boolean> {
    try {
      console.log(`[SubscriptionManager] Verificando se assinatura está ativa para userId: ${userId}`);

      const adminApp = getAdminApp();
      // Verificar no Realtime Database
      if (adminApp) {
        const rtdb = getDatabase(adminApp);
        const userRef = rtdb.ref(`users/${userId}/subscription`);
        const snapshot = await userRef.once('value');
        const subscriptionId = snapshot.val();

        if (subscriptionId) {
          const subscriptionRef = rtdb.ref(`subscriptions/${subscriptionId}`);
          const subscriptionSnapshot = await subscriptionRef.once('value');
          const subscription = subscriptionSnapshot.val();

          if (subscription && subscription.status === 'active') {
            const now = new Date();
            const endDate = new Date(subscription.endDate);

            if (endDate > now) {
              console.log('[SubscriptionManager] Assinatura ativa encontrada no RTDB');
              return true;
            }
          }
        }
      }

      const adminDb = getAdminDb();
      // Verificar no Firestore
      if (adminDb) {
        const subscribersSnapshot = await adminDb.collection('subscribers')
          .where('userId', '==', userId)
          .get();

        const activeDocs = subscribersSnapshot.docs.filter((doc) => (doc.data() as any)?.status === 'active');
        if (activeDocs.length > 0) {
          console.log('[SubscriptionManager] Assinatura ativa encontrada no Firestore');
          return true;
        }
      }

      console.log('[SubscriptionManager] Nenhuma assinatura ativa encontrada');
      return false;
    } catch (error) {
      console.error('[SubscriptionManager] Erro ao verificar assinatura:', error);
      return false;
    }
  }

  async getUserActiveSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      console.log(`[SubscriptionManager] Buscando assinatura ativa para userId: ${userId}`);

      const adminApp = getAdminApp();
      // Buscar no Realtime Database
      if (adminApp) {
        const rtdb = getDatabase(adminApp);
        const userRef = rtdb.ref(`users/${userId}/subscription`);
        const snapshot = await userRef.once('value');
        const subscriptionId = snapshot.val();

        if (subscriptionId) {
          const subscriptionRef = rtdb.ref(`subscriptions/${subscriptionId}`);
          const subscriptionSnapshot = await subscriptionRef.once('value');
          const subscription = subscriptionSnapshot.val();

          if (subscription && subscription.status === 'active') {
            const now = new Date();
            const endDate = new Date(subscription.endDate);

            if (endDate > now) {
              console.log('[SubscriptionManager] Assinatura ativa encontrada no RTDB');
              return {
                id: subscriptionId,
                userId: subscription.userId,
                planId: subscription.planId || 'monthly',
                email: subscription.email,
                paymentId: subscription.paymentId,
                paymentMethod: subscription.paymentMethod || 'pix',
                status: 'active',
                startDate: subscription.startDate,
                endDate: subscription.endDate,
                autoRenew: subscription.autoRenew || false,
                createdAt: subscription.createdAt,
                updatedAt: subscription.updatedAt
              };
            }
          }
        }
      }

      const adminDb = getAdminDb();
      // Buscar no Firestore
      if (adminDb) {
        const subscribersSnapshot = await adminDb.collection('subscribers')
          .where('userId', '==', userId)
          .get();

        const activeDocs = subscribersSnapshot.docs.filter((doc) => (doc.data() as any)?.status === 'active');
        if (activeDocs.length > 0) {
          const doc = activeDocs[0];
          const data = doc.data();

          console.log('[SubscriptionManager] Assinatura ativa encontrada no Firestore');
          return {
            id: doc.id,
            userId: data.userId,
            planId: data.planId || 'monthly',
            email: data.email,
            paymentId: data.paymentId,
            paymentMethod: data.paymentMethod || 'pix',
            status: 'active',
            startDate: data.startDate,
            endDate: data.endDate,
            autoRenew: data.autoRenew || false,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          };
        }
      }

      console.log('[SubscriptionManager] Nenhuma assinatura ativa encontrada');
      return null;
    } catch (error) {
      console.error('[SubscriptionManager] Erro ao buscar assinatura:', error);
      return null;
    }
  }

  async getSubscriptionByPaymentId(paymentId: string): Promise<UserSubscription | null> {
    try {
      console.log(`[SubscriptionManager] Buscando assinatura por paymentId: ${paymentId}`);

      const adminApp = getAdminApp();
      // Buscar no Realtime Database
      if (adminApp) {
        const rtdb = getDatabase(adminApp);
        const subscriptionsRef = rtdb.ref('subscriptions');
        const snapshot = await subscriptionsRef.orderByChild('paymentId').equalTo(paymentId).once('value');
        const subscriptions = snapshot.val();

        if (subscriptions) {
          const subscriptionId = Object.keys(subscriptions)[0];
          const subscription = subscriptions[subscriptionId];

          console.log('[SubscriptionManager] Assinatura encontrada no RTDB');
          return {
            id: subscriptionId,
            userId: subscription.userId,
            planId: subscription.planId || 'monthly',
            email: subscription.email,
            paymentId: subscription.paymentId,
            paymentMethod: subscription.paymentMethod || 'pix',
            status: subscription.status || 'active',
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            autoRenew: subscription.autoRenew || false,
            createdAt: subscription.createdAt,
            updatedAt: subscription.updatedAt
          };
        }
      }

      const adminDb = getAdminDb();
      // Buscar no Firestore
      if (adminDb) {
        const subscribersSnapshot = await adminDb.collection('subscribers')
          .where('paymentId', '==', paymentId)
          .get();

        if (!subscribersSnapshot.empty) {
          const doc = subscribersSnapshot.docs[0];
          const data = doc.data();

          console.log('[SubscriptionManager] Assinatura encontrada no Firestore');
          return {
            id: doc.id,
            userId: data.userId,
            planId: data.planId || 'monthly',
            email: data.email,
            paymentId: data.paymentId,
            paymentMethod: data.paymentMethod || 'pix',
            status: data.status || 'active',
            startDate: data.startDate,
            endDate: data.endDate,
            autoRenew: data.autoRenew || false,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          };
        }
      }

      console.log('[SubscriptionManager] Nenhuma assinatura encontrada para este paymentId');
      return null;
    } catch (error) {
      console.error('[SubscriptionManager] Erro ao buscar assinatura por paymentId:', error);
      return null;
    }
  }

  async hasActiveSubscription(email: string): Promise<boolean> {
    try {
      console.log('[SubscriptionManager] 🔍 Verificando assinatura ativa para:', email);

      const adminDb = getAdminDb();
      if (!adminDb) {
        console.log('[SubscriptionManager] ❌ Admin DB não disponível');
        return false;
      }

      // 🔍 VERIFICAÇÃO DUPLA: Users + Subscribers
      console.log('[SubscriptionManager] 🔍 VERIFICAÇÃO DUPLA - Users + Subscribers');

      // 1️⃣ VERIFICAR USERS COLLECTION (campo isSubscriber)
      console.log('[SubscriptionManager] 🔍 1️⃣ Verificando campo isSubscriber na coleção users...');
      const usersRef = adminDb.collection('users');
      const userQuery = await usersRef.where('email', '==', email).get();

      type FirestoreDocRef = {
        ref: { update: (data: Record<string, unknown>) => Promise<unknown> };
        data: () => any;
        id: string;
      };

      let userIsSubscriber = false;
      let userDoc: FirestoreDocRef | null = null;

      if (!userQuery.empty) {
        userDoc = userQuery.docs[0];
        const userData = userDoc.data();
        userIsSubscriber = userData.isSubscriber === true;

        console.log('[SubscriptionManager] 🔍 Usuário encontrado na coleção users:', {
          email: userData.email,
          isSubscriber: userData.isSubscriber,
          subscriptionStatus: userData.subscriptionStatus,
          subscriptionEndDate: userData.subscriptionEndDate
        });
      } else {
        console.log('[SubscriptionManager] ⚠️ Usuário NÃO encontrado na coleção users');
      }

      // 2️⃣ VERIFICAR SUBSCRIBERS COLLECTION (status active)
      console.log('[SubscriptionManager] 🔍 2️⃣ Verificando status na coleção subscribers...');
      const subscribersRef = adminDb.collection('subscribers');
      const subscriberQuery = await subscribersRef.where('email', '==', email).get();

      let hasActiveSubscription = false;
      let subscriptionDoc: FirestoreDocRef | null = null;

      if (!subscriberQuery.empty) {
        console.log('[SubscriptionManager] 🔍 Encontradas', subscriberQuery.size, 'assinaturas para:', email);

        // Verificar cada assinatura
        const now = new Date();

        subscriberQuery.forEach((doc: any) => {
          const data = doc.data();
          console.log('[SubscriptionManager] 🔍 Analisando assinatura:', {
            id: doc.id,
            email: data.email,
            status: data.status,
            startDate: data.startDate,
            endDate: data.endDate,
            createdAt: data.createdAt
          });

          if (data.status === 'active') {
            const endDate = new Date(data.endDate || data.expiresAt);

            if (endDate > now) {
              hasActiveSubscription = true;
              subscriptionDoc = doc;
              console.log('[SubscriptionManager] ✅ Assinatura ativa válida encontrada:', {
                id: doc.id,
                endDate: endDate.toISOString(),
                daysUntilExpiry: Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              });
            } else {
              console.log('[SubscriptionManager] ⚠️ Assinatura com status "active" mas EXPIRADA:', {
                id: doc.id,
                endDate: endDate.toISOString(),
                daysExpired: Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
              });

              // 🔧 CORREÇÃO AUTOMÁTICA: Marcar como expirada
              try {
                doc.ref.update({ status: 'expired' });
                console.log('[SubscriptionManager] 🔧 Assinatura marcada como expirada automaticamente');
              } catch (updateError) {
                console.error('[SubscriptionManager] ❌ Erro ao marcar assinatura como expirada:', updateError);
              }
            }
          } else {
            console.log('[SubscriptionManager] ℹ️ Assinatura com status diferente de "active":', {
              id: doc.id,
              status: data.status
            });
          }
        });
      } else {
        console.log('[SubscriptionManager] ✅ Nenhuma assinatura encontrada na coleção subscribers');
      }

      // 🔍 VERIFICAÇÃO FINAL: AMBOS devem estar corretos
      const finalResult = userIsSubscriber && hasActiveSubscription;

      console.log('[SubscriptionManager] 🔍 VERIFICAÇÃO FINAL:', {
        'users.isSubscriber': userIsSubscriber,
        'subscribers.status_active': hasActiveSubscription,
        'RESULTADO_FINAL': finalResult
      });

      // 🔧 SINCRONIZAÇÃO AUTOMÁTICA se houver inconsistência
      if (userIsSubscriber !== hasActiveSubscription) {
        console.log('[SubscriptionManager] ⚠️ INCONSISTÊNCIA DETECTADA! Sincronizando...');

        if (userIsSubscriber && !hasActiveSubscription) {
          // Usuário marcado como assinante mas não tem assinatura ativa
          console.log('[SubscriptionManager] 🔧 Corrigindo: usuário marcado como assinante mas sem assinatura ativa');
          if (userDoc) {
            await userDoc.ref.update({
              isSubscriber: false,
              subscriptionStatus: 'inactive',
              updatedAt: new Date().toISOString()
            });
            console.log('[SubscriptionManager] ✅ Usuário marcado como não assinante');
          }
        } else if (!userIsSubscriber && hasActiveSubscription) {
          // Usuário tem assinatura ativa mas não está marcado como assinante
          console.log('[SubscriptionManager] 🔧 Corrigindo: usuário tem assinatura ativa mas não está marcado como assinante');
          if (userDoc) {
            await userDoc.ref.update({
              isSubscriber: true,
              subscriptionStatus: 'active',
              updatedAt: new Date().toISOString()
            });
            console.log('[SubscriptionManager] ✅ Usuário marcado como assinante');
          }
        }

        // Atualizar resultado após sincronização
        return hasActiveSubscription; // Se tem assinatura ativa, permitir
      }

      return finalResult;
    } catch (error) {
      console.error('[SubscriptionManager] ❌ Erro ao verificar assinatura ativa:', error);
      return false;
    }
  }
}

export const subscriptionManager = new SubscriptionManager();
