'use server'

import { getAdminDb, getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { UserSubscription, SUBSCRIPTION_PLANS } from '@/lib/subscription-manager';

async function resolveRequestingAdminScope(requestingAdminUid?: string | null): Promise<{
  adminUid: string | null;
  isMainAdmin: boolean;
}> {
  const adminUid = typeof requestingAdminUid === 'string' && requestingAdminUid.trim()
    ? requestingAdminUid.trim()
    : null;

  if (!adminUid) {
    return { adminUid: null, isMainAdmin: false };
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return { adminUid, isMainAdmin: false };
  }

  try {
    const adminSnap = await adminDb.collection('admins').doc(adminUid).get();
    const isMainAdmin = adminSnap.exists && Boolean((adminSnap.data() as any)?.isMainAdmin);
    return { adminUid, isMainAdmin };
  } catch {
    // Se falhar, assume não-main para evitar vazar dados
    return { adminUid, isMainAdmin: false };
  }
}

// Função para serializar objetos Firestore (converte Timestamps e remove classes)
function serializeFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  // Se é um Timestamp do Firestore
  if (data && typeof data === 'object' && '_seconds' in data && '_nanoseconds' in data) {
    return new Date((data as any)._seconds * 1000).toISOString() as any;
  }

  // Se é um Date
  if (data instanceof Date) {
    return data.toISOString() as any;
  }

  // Se é um array
  if (Array.isArray(data)) {
    return data.map(item => serializeFirestoreData(item)) as any;
  }

  // Se é um objeto
  if (typeof data === 'object') {
    const serialized: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        serialized[key] = serializeFirestoreData((data as any)[key]);
      }
    }
    return serialized;
  }

  return data;
}

// Função unificada para buscar todas as assinaturas usando a mesma fonte de dados
// MODIFICADO: Agora busca TODOS os usuários cadastrados, não apenas assinantes
async function getAllSubscriptionsFromUnifiedSource(
  scopedAdminUid?: string | null,
  isMainAdmin?: boolean
): Promise<UserSubscription[]> {
  const subscriptions: UserSubscription[] = [];

  try {
    console.log('[Actions] Buscando TODOS os usuários cadastrados...');

    const adminDb = getAdminDb();

    if (!adminDb) {
      console.error('[Actions] AdminDb não inicializado');
      return subscriptions;
    }

    // 1. Buscar TODOS os usuários da coleção 'users' (não apenas isSubscriber = true)
    try {
      console.log('[Actions] Buscando da coleção users...');
      const usersSnapshot = scopedAdminUid && !isMainAdmin
        ? await adminDb.collection('users').where('adminUid', '==', scopedAdminUid).get()
        : await adminDb.collection('users').get();

      usersSnapshot.forEach((doc: any) => {
        const userData = doc.data();

        // Determinar status baseado em isSubscriber e subscriptionStatus
        let status: 'active' | 'expired' | 'canceled' = 'expired';
        if (userData.isSubscriber === true && userData.subscriptionStatus === 'active') {
          status = 'active';
        } else if (userData.subscriptionStatus === 'canceled') {
          status = 'canceled';
        }

        const subscription: UserSubscription = {
          id: doc.id,
          userId: userData.uid || userData.userId || doc.id,
          planId: userData.planId || (userData.isSubscriber ? 'monthly' : 'free'),
          adminUid: userData.adminUid,
          email: userData.email || 'Sem e-mail',
          paymentId: userData.paymentId || userData.transactionId || 'N/A',
          paymentMethod: userData.paymentMethod || (userData.isSubscriber ? 'pix' : 'N/A'),
          status: status,
          startDate: userData.subscriptionStartDate || userData.createdAt || new Date().toISOString(),
          endDate: userData.subscriptionEndDate || userData.expiresAt || new Date().toISOString(),
          autoRenew: userData.autoRenew || false,
          createdAt: userData.createdAt || new Date().toISOString(),
          updatedAt: userData.updatedAt || new Date().toISOString()
        };
        subscriptions.push(subscription);
      });

      console.log(`[Actions] Encontrados ${usersSnapshot.size} usuários na coleção users`);
    } catch (error) {
      console.error('[Actions] Erro ao buscar da coleção users:', error);
    }

    // 2. Buscar da coleção 'subscribers' (mesma fonte dos pagamentos)
    try {
      console.log('[Actions] Buscando da coleção subscribers...');
      const subscribersSnapshot = scopedAdminUid && !isMainAdmin
        ? await adminDb.collection('subscribers').where('adminUid', '==', scopedAdminUid).get()
        : await adminDb.collection('subscribers').get();

      subscribersSnapshot.forEach((doc: any) => {
        const data = doc.data();
        const subscription: UserSubscription = {
          id: doc.id,
          userId: data.userId || data.customerId || '',
          planId: data.planId || 'monthly',
          adminUid: data.adminUid,
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

      // console.log(`[Actions] Encontradas ${subscribersSnapshot.size} assinaturas na coleção subscribers`);
    } catch (error) {
      console.error('[Actions] Erro ao buscar da coleção subscribers:', error);
    }
  } catch (error) {
    console.error('[Actions] Erro geral ao buscar assinaturas do Firestore:', error);
  }

  // 3. Buscar da coleção 'subscriptions' (Realtime Database - backup)
  const adminApp = getAdminApp();
  if (adminApp) {
    try {
      const rtdb = getDatabase(adminApp);
      const subscriptionsRef = rtdb.ref('subscriptions');
      const snapshot = await subscriptionsRef.once('value');
      const subscriptionsData = snapshot.val();

      if (subscriptionsData) {
        const subs = Object.values(subscriptionsData) as UserSubscription[];
        if (scopedAdminUid && !isMainAdmin) {
          subscriptions.push(
            ...subs.filter((s) => Boolean((s as any)?.adminUid) && (s as any).adminUid === scopedAdminUid)
          );
        } else {
          subscriptions.push(...subs);
        }
        // console.log(`[Actions] Encontradas ${subs.length} assinaturas no Realtime Database`);
      }
    } catch (error) {
      console.error('[Actions] Erro ao buscar do Realtime Database:', error);
    }
  }

  // Deduplicate subscriptions by userId (prefer the most recent or most complete entry)
  const deduplicatedMap = new Map<string, UserSubscription>();
  
  for (const subscription of subscriptions) {
    // Prioritize userId, only use email as fallback if userId is truly missing
    const key = subscription.userId || subscription.email;
    
    if (!key) continue;
    
    const existing = deduplicatedMap.get(key);
    
    if (!existing) {
      deduplicatedMap.set(key, subscription);
    } else {
      // Keep the subscription with more complete data or most recent update
      // Prefer entries with valid timestamps; if both/neither have timestamps, prefer the new one
      const existingDate = existing.updatedAt ? new Date(existing.updatedAt) : new Date(0);
      const newDate = subscription.updatedAt ? new Date(subscription.updatedAt) : new Date(0);
      
      // If timestamps are equal (both missing or same time), prefer entries with userId over email-only
      if (newDate.getTime() === existingDate.getTime()) {
        if (subscription.userId && !existing.userId) {
          deduplicatedMap.set(key, subscription);
        }
      } else if (newDate > existingDate) {
        deduplicatedMap.set(key, subscription);
      }
    }
  }
  
  const deduplicated = Array.from(deduplicatedMap.values());
  console.log(`[Actions] Total de assinaturas encontradas: ${subscriptions.length}, após deduplicação: ${deduplicated.length}`);
  return deduplicated;
}

export async function createSubscription(
  data: {
  userId: string;
  email: string;
  planId: string;
  paymentId: string;
  paymentMethod: 'pix' | 'paypal' | 'mercadopago' | 'google_pay';
  },
  requestingAdminUid?: string
) {
  try {
    // console.log('[Actions] Criando assinatura:', data);

    const { adminUid: scopedAdminUid, isMainAdmin } = await resolveRequestingAdminScope(requestingAdminUid);
    const shouldStampAdminUid = Boolean(scopedAdminUid) && !isMainAdmin;

    const adminDb = getAdminDb();
    // Salvar na coleção 'users' (mesma fonte dos usuários)
    if (adminDb) {
      const usersRef = adminDb.collection('users');
      const userQuery = await usersRef.where('email', '==', data.email).get();

      if (!userQuery.empty) {
        // Atualizar usuário existente
        const userDoc = userQuery.docs[0];
        await userDoc.ref.update({
          ...(shouldStampAdminUid ? { adminUid: scopedAdminUid } : {}),
          isSubscriber: true,
          subscriptionStatus: 'active',
          planId: data.planId,
          paymentId: data.paymentId,
          paymentMethod: data.paymentMethod,
          subscriptionStartDate: new Date().toISOString(),
          subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 99,
          updatedAt: new Date().toISOString()
        });
        // console.log('[Actions] Usuário atualizado com assinatura');
      } else {
        // Criar novo usuário
        await usersRef.add({
          ...(shouldStampAdminUid ? { adminUid: scopedAdminUid } : {}),
          email: data.email,
          uid: data.userId,
          isSubscriber: true,
          subscriptionStatus: 'active',
          planId: data.planId,
          paymentId: data.paymentId,
          paymentMethod: data.paymentMethod,
          subscriptionStartDate: new Date().toISOString(),
          subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 99,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        // console.log('[Actions] Novo usuário criado com assinatura');
      }
    }

    // Salvar na coleção 'subscribers' (mesma fonte dos pagamentos)
    if (adminDb) {
      const subscribersRef = adminDb.collection('subscribers');
      await subscribersRef.add({
        ...(shouldStampAdminUid ? { adminUid: scopedAdminUid } : {}),
        userId: data.userId,
        email: data.email,
        planId: data.planId,
        paymentId: data.paymentId,
        paymentMethod: data.paymentMethod,
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 99,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      // console.log('[Actions] Assinatura salva na coleção subscribers');
    }

    return { success: true, message: 'Assinatura criada com sucesso' };
  } catch (error: any) {
    console.error('Erro ao criar assinatura:', error);
    return { success: false, error: error.message };
  }
}

export async function checkUserSubscription(userId: string) {
  try {
    // console.log('[Actions] Verificando assinatura para userId:', userId);

    const adminDb = getAdminDb();
    // Verificar na coleção 'users' (mesma fonte dos usuários)
    if (adminDb) {
      const usersRef = adminDb.collection('users');
      const userQuery = await usersRef.where('uid', '==', userId).get();

      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
        const userData = userDoc.data();

        if (userData.isSubscriber === true) {
          const plan = SUBSCRIPTION_PLANS.find(p => p.id === (userData.planId || 'monthly'));

          const result = {
            success: true,
            isActive: true,
            subscription: {
              id: userDoc.id,
              userId: userData.uid,
              planId: userData.planId || 'monthly',
              email: userData.email,
              paymentId: userData.paymentId,
              paymentMethod: userData.paymentMethod || 'pix',
              status: 'active',
              startDate: userData.subscriptionStartDate,
              endDate: userData.subscriptionEndDate,
              autoRenew: false,
              createdAt: userData.createdAt,
              updatedAt: userData.updatedAt
            },
            plan
          };

          // Serializar para remover objetos Firestore
          return serializeFirestoreData(result);
        }
      }
    }

    return {
      success: true,
      isActive: false,
      subscription: null,
      plan: null
    };
  } catch (error: any) {
    console.error('Erro ao verificar assinatura:', error);
    return { success: false, error: error.message };
  }
}

export async function cancelUserSubscription(subscriptionId: string, requestingAdminUid?: string) {
  try {
    // console.log('[Actions] Cancelando assinatura:', subscriptionId);

    const { adminUid: scopedAdminUid, isMainAdmin } = await resolveRequestingAdminScope(requestingAdminUid);
    const isScoped = Boolean(scopedAdminUid) && !isMainAdmin;
    let changed = false;

    const adminDb = getAdminDb();
    // Cancelar na coleção 'users'
    if (adminDb) {
      const userDoc = adminDb.collection('users').doc(subscriptionId);
      const userSnapshot = await userDoc.get();

      if (userSnapshot.exists) {
        const userData = userSnapshot.data() as any;
        if (!isScoped || userData?.adminUid === scopedAdminUid) {
          await userDoc.update({
            isSubscriber: false,
            subscriptionStatus: 'canceled',
            updatedAt: new Date().toISOString()
          });
          changed = true;
          // console.log('[Actions] Assinatura cancelada na coleção users');
        }
      }
    }

    // Cancelar na coleção 'subscribers'
    if (adminDb) {
      const subscriberDoc = adminDb.collection('subscribers').doc(subscriptionId);
      const subscriberSnapshot = await subscriberDoc.get();

      if (subscriberSnapshot.exists) {
        const subscriberData = subscriberSnapshot.data() as any;
        if (!isScoped || subscriberData?.adminUid === scopedAdminUid) {
          await subscriberDoc.update({
            status: 'canceled',
            updatedAt: new Date().toISOString()
          });
          changed = true;
          // console.log('[Actions] Assinatura cancelada na coleção subscribers');
        }
      }
    }

    if (isScoped && !changed) {
      return { success: false, error: 'Assinatura não encontrada para este administrador' };
    }

    return { success: true, message: 'Assinatura cancelada com sucesso' };
  } catch (error: any) {
    console.error('Erro ao cancelar assinatura:', error);
    return { success: false, error: error.message };
  }
}

export async function getAllSubscriptionsAdmin(requestingAdminUid?: string) {
  try {
    console.log('[Actions] Buscando todas as assinaturas...');
    
    // Verificar se o adminDb está disponível
    const adminDb = getAdminDb();
    if (!adminDb) {
      console.error('[Actions] AdminDb não está inicializado');
      return { 
        success: false, 
        error: 'Banco de dados admin não inicializado',
        subscriptions: [] 
      };
    }

    const { adminUid: scopedAdminUid, isMainAdmin } = await resolveRequestingAdminScope(requestingAdminUid);
    const subscriptions = await getAllSubscriptionsFromUnifiedSource(scopedAdminUid, isMainAdmin);

    const subscriptionsWithPlans = subscriptions.map(sub => ({
      ...sub,
      plan: SUBSCRIPTION_PLANS.find(p => p.id === sub.planId)
    }));

    console.log('[Actions] Retornando assinaturas com planos:', subscriptionsWithPlans.length);

    // Serializar os dados para remover objetos Firestore (Timestamps, etc)
    const serializedSubscriptions = serializeFirestoreData(subscriptionsWithPlans);

    return { success: true, subscriptions: serializedSubscriptions };
  } catch (error: any) {
    console.error('[Actions] Erro ao buscar assinaturas:', error);
    
    // Retornar erro mais específico
    const errorMessage = error?.message || error?.toString() || 'Erro desconhecido';
    console.error('[Actions] Stack trace:', error?.stack);
    
    return { 
      success: false, 
      error: `Erro ao buscar assinaturas: ${errorMessage}`,
      subscriptions: [] 
    };
  }
}

export async function cleanupExpiredSubscriptions(requestingAdminUid?: string) {
  try {
    // console.log('[Actions] Iniciando cleanup de assinaturas expiradas...');
    let expiredCount = 0;

    const { isMainAdmin } = await resolveRequestingAdminScope(requestingAdminUid);
    if (!isMainAdmin) {
      return { success: false, error: 'Apenas o administrador principal pode executar o cleanup' };
    }

    const adminDb = getAdminDb();
    // Cleanup na coleção 'users'
    if (adminDb) {
      const usersSnapshot = await adminDb.collection('users').where('isSubscriber', '==', true).get();

      for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        if (userData.subscriptionEndDate) {
          const endDate = new Date(userData.subscriptionEndDate);
          if (endDate <= new Date()) {
            await doc.ref.update({
              isSubscriber: false,
              subscriptionStatus: 'expired',
              updatedAt: new Date().toISOString()
            });
            expiredCount++;
          }
        }
      }
    }

    // Cleanup na coleção 'subscribers'
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
    }

    // console.log(`[Actions] Cleanup concluído: ${expiredCount} assinaturas expiradas`);
    return { success: true, cleanupCount: expiredCount };
  } catch (error: any) {
    console.error('Erro no cleanup:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteTestSubscriptions(requestingAdminUid?: string) {
  try {
    // console.log('[Actions] Iniciando exclusão de assinaturas de teste...');
    let deletedCount = 0;

    const { isMainAdmin } = await resolveRequestingAdminScope(requestingAdminUid);
    if (!isMainAdmin) {
      return { success: false, error: 'Apenas o administrador principal pode excluir assinaturas de teste' };
    }

    const adminDb = getAdminDb();
    // Excluir da coleção 'users'
    if (adminDb) {
      const usersSnapshot = await adminDb.collection('users').where('isSubscriber', '==', true).get();

      for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        const email = userData.email?.toLowerCase() || '';

        // Verificar se é uma assinatura de teste
        if (email.includes('test') ||
          email.includes('@test.com') ||
          email.includes('exemplo') ||
          email.includes('demo') ||
          userData.paymentId?.includes('test') ||
          userData.planId?.includes('test')) {

          await doc.ref.delete();
          deletedCount++;
          // console.log(`[Actions] Excluída assinatura de teste: ${email}`);
        }
      }
    }

    // Excluir da coleção 'subscribers'
    if (adminDb) {
      const subscribersSnapshot = await adminDb.collection('subscribers').get();

      for (const doc of subscribersSnapshot.docs) {
        const data = doc.data();
        const email = data.email?.toLowerCase() || '';

        // Verificar se é uma assinatura de teste
        if (email.includes('test') ||
          email.includes('@test.com') ||
          email.includes('exemplo') ||
          email.includes('demo') ||
          data.paymentId?.includes('test') ||
          data.planId?.includes('test')) {

          await doc.ref.delete();
          deletedCount++;
          // console.log(`[Actions] Excluída assinatura de teste: ${email}`);
        }
      }
    }

    // console.log(`[Actions] Exclusão concluída: ${deletedCount} assinaturas de teste excluídas`);
    return { success: true, deletedCount };
  } catch (error: any) {
    console.error('Erro ao excluir assinaturas de teste:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Presentear membro com dias grátis de assinatura
 * Adiciona dias à assinatura existente ou cria uma nova
 */
export async function giftSubscriptionDays(
  userId: string,
  email: string,
  days: number,
  requestingAdminUid?: string
): Promise<{ success: boolean; error?: string; subscription?: UserSubscription }> {
  try {
    console.log(`[Actions] Presenteando ${email} com ${days} dias de assinatura...`);

    const { adminUid: scopedAdminUid, isMainAdmin } = await resolveRequestingAdminScope(requestingAdminUid);
    const shouldStampAdminUid = Boolean(scopedAdminUid) && !isMainAdmin;

    const adminDb = getAdminDb();
    if (!adminDb) {
      return { success: false, error: 'Banco de dados não disponível' };
    }

    // Buscar assinatura existente do usuário
    let existingSubscription: UserSubscription | null = null;
    let userDocRef: any = null;

    // Verificar na coleção 'users'
    const userSnapshot = await adminDb.collection('users').doc(userId).get();
    if (userSnapshot.exists) {
      const userData = userSnapshot.data();

      if (shouldStampAdminUid && (userData as any)?.adminUid && (userData as any).adminUid !== scopedAdminUid) {
        return { success: false, error: 'Sem permissão para presentear este usuário' };
      }

      userDocRef = userSnapshot.ref;

      if (userData?.isSubscriber && userData?.subscriptionEndDate) {
        existingSubscription = {
          id: userSnapshot.id,
          userId: userId,
          planId: userData.planId || 'monthly',
          email: email,
          paymentId: userData.paymentId || `gift-${Date.now()}`,
          paymentMethod: 'gift',
          status: userData.subscriptionStatus || 'active',
          startDate: userData.subscriptionStartDate || new Date().toISOString(),
          endDate: userData.subscriptionEndDate,
          autoRenew: false,
          createdAt: userData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
    }

    const now = new Date();
    let newEndDate: Date;

    if (existingSubscription) {
      // Se já tem assinatura ativa, adicionar dias à data de expiração
      const currentEndDate = new Date(existingSubscription.endDate);

      // Se a assinatura já expirou, começar de hoje
      if (currentEndDate < now) {
        newEndDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      } else {
        // Adicionar dias à data atual de expiração
        newEndDate = new Date(currentEndDate.getTime() + days * 24 * 60 * 60 * 1000);
      }
    } else {
      // Nova assinatura: começar de hoje
      newEndDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    }

    const updatedSubscription: UserSubscription = {
      id: userId,
      userId: userId,
      planId: 'gift',
      email: email,
      paymentId: `gift-${Date.now()}`,
      paymentMethod: 'gift',
      status: 'active',
      startDate: existingSubscription?.startDate || now.toISOString(),
      endDate: newEndDate.toISOString(),
      autoRenew: false,
      createdAt: existingSubscription?.createdAt || now.toISOString(),
      updatedAt: now.toISOString()
    };

    // Atualizar no Firestore - coleção 'users'
    if (userDocRef) {
      await userDocRef.update({
        ...(shouldStampAdminUid ? { adminUid: scopedAdminUid } : {}),
        isSubscriber: true,
        subscriptionStatus: 'active',
        subscriptionStartDate: updatedSubscription.startDate,
        subscriptionEndDate: updatedSubscription.endDate,
        planId: updatedSubscription.planId,
        paymentMethod: 'gift',
        updatedAt: now.toISOString(),
        giftedDays: (userSnapshot.data()?.giftedDays || 0) + days,
        lastGiftDate: now.toISOString()
      });
    } else {
      // Criar novo documento se não existir
      await adminDb.collection('users').doc(userId).set({
        ...(shouldStampAdminUid ? { adminUid: scopedAdminUid } : {}),
        uid: userId,
        email: email,
        isSubscriber: true,
        subscriptionStatus: 'active',
        subscriptionStartDate: updatedSubscription.startDate,
        subscriptionEndDate: updatedSubscription.endDate,
        planId: 'gift',
        paymentMethod: 'gift',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        giftedDays: days,
        lastGiftDate: now.toISOString()
      });
    }

    // Adicionar também na coleção 'subscribers' para backup
    await adminDb.collection('subscribers').doc(userId).set({
      ...(shouldStampAdminUid ? { adminUid: scopedAdminUid } : {}),
      userId: userId,
      email: email,
      planId: 'gift',
      paymentMethod: 'gift',
      status: 'active',
      startDate: updatedSubscription.startDate,
      endDate: updatedSubscription.endDate,
      autoRenew: false,
      createdAt: existingSubscription?.createdAt || now.toISOString(),
      updatedAt: now.toISOString(),
      giftedDays: days,
      lastGiftDate: now.toISOString()
    }, { merge: true });

    console.log(`[Actions] ✅ Presenteado com sucesso: ${email} - ${days} dias até ${newEndDate.toLocaleDateString('pt-BR')}`);

    return {
      success: true,
      subscription: updatedSubscription
    };
  } catch (error: any) {
    console.error('Erro ao presentear assinatura:', error);
    return { success: false, error: error.message };
  }
}
