import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({
        success: false,
        message: 'Firebase Admin não disponível',
        healthy: false
      });
    }

    const healthCheck = {
      timestamp: new Date().toISOString(),
      collections: {} as any,
      issues: [] as string[],
      healthy: true,
      consistency: {} as any
    };

    // 1. Verificar coleção 'users'
    try {
      const usersRef = adminDb.collection('users');
      const usersSnapshot = await usersRef.limit(5).get();

      healthCheck.collections.users = {
        exists: true,
        count: usersSnapshot.size,
        sample: usersSnapshot.docs.map((doc: any) => ({
          id: doc.id,
          email: doc.data().email,
          isSubscriber: doc.data().isSubscriber,
          subscriptionStatus: doc.data().subscriptionStatus,
          subscriptionEndDate: doc.data().subscriptionEndDate
        }))
      };

      // Verificar se há usuários sem assinatura válida
      const invalidUsers = usersSnapshot.docs.filter((doc: any) => {
        const data = doc.data();
        return data.isSubscriber === true && (!data.subscriptionEndDate || new Date(data.subscriptionEndDate) < new Date());
      });

      if (invalidUsers.length > 0) {
        healthCheck.issues.push(`${invalidUsers.length} usuários com assinatura expirada mas isSubscriber=true`);
        healthCheck.healthy = false;
      }

    } catch (error) {
      healthCheck.collections.users = { exists: false, error: error instanceof Error ? error.message : 'Unknown error' };
      healthCheck.issues.push('Erro ao acessar coleção users');
      healthCheck.healthy = false;
    }

    // 2. Verificar coleção 'subscribers'
    try {
      const subscribersRef = adminDb.collection('subscribers');
      const subscribersSnapshot = await subscribersRef.limit(5).get();

      healthCheck.collections.subscribers = {
        exists: true,
        count: subscribersSnapshot.size,
        sample: subscribersSnapshot.docs.map((doc: any) => ({
          id: doc.id,
          email: doc.data().email,
          status: doc.data().status,
          endDate: doc.data().endDate,
          paymentMethod: doc.data().paymentMethod
        }))
      };

      // Verificar se há assinaturas ativas sem data de fim
      const invalidSubscriptions = subscribersSnapshot.docs.filter((doc: any) => {
        const data = doc.data();
        return data.status === 'active' && (!data.endDate || new Date(data.endDate) < new Date());
      });

      if (invalidSubscriptions.length > 0) {
        healthCheck.issues.push(`${invalidSubscriptions.length} assinaturas ativas mas sem data válida`);
        healthCheck.healthy = false;
      }

    } catch (error) {
      healthCheck.collections.subscribers = { exists: false, error: error instanceof Error ? error.message : 'Unknown error' };
      healthCheck.issues.push('Erro ao acessar coleção subscribers');
      healthCheck.healthy = false;
    }

    // 3. Verificar coleção 'photos' (conteúdo exclusivo)
    try {
      const photosRef = adminDb.collection('photos');
      const photosSnapshot = await photosRef.limit(3).get();

      healthCheck.collections.photos = {
        exists: true,
        count: photosSnapshot.size,
        sample: photosSnapshot.docs.map((doc: any) => ({
          id: doc.id,
          title: doc.data().title,
          url: doc.data().url,
          createdAt: doc.data().createdAt
        }))
      };

    } catch (error) {
      healthCheck.collections.photos = { exists: false, error: error instanceof Error ? error.message : 'Unknown error' };
      healthCheck.issues.push('Erro ao acessar coleção photos');
    }

    // 4. Verificar coleção 'videos' (conteúdo exclusivo)
    try {
      const videosRef = adminDb.collection('videos');
      const videosSnapshot = await videosRef.limit(3).get();

      healthCheck.collections.videos = {
        exists: true,
        count: videosSnapshot.size,
        sample: videosSnapshot.docs.map((doc: any) => ({
          id: doc.id,
          title: doc.data().title,
          videoUrl: doc.data().videoUrl,
          createdAt: doc.data().createdAt
        }))
      };

    } catch (error) {
      healthCheck.collections.videos = { exists: false, error: error instanceof Error ? error.message : 'Unknown error' };
      healthCheck.issues.push('Erro ao acessar coleção videos');
    }

    // 5. Verificar consistência entre users e subscribers
    try {
      const usersWithSubscription = await adminDb.collection('users')
        .where('isSubscriber', '==', true)
        .get();

      const activeSubscribers = await adminDb.collection('subscribers')
        .where('status', '==', 'active')
        .get();

      healthCheck.consistency = {
        usersWithSubscription: usersWithSubscription.size,
        activeSubscribers: activeSubscribers.size,
        consistent: usersWithSubscription.size === activeSubscribers.size
      };

      if (!healthCheck.consistency.consistent) {
        healthCheck.issues.push(`Inconsistência: ${usersWithSubscription.size} usuários assinantes vs ${activeSubscribers.size} assinaturas ativas`);
        healthCheck.healthy = false;
      }

    } catch (error) {
      healthCheck.issues.push('Erro ao verificar consistência entre coleções');
      healthCheck.healthy = false;
    }

    return NextResponse.json({
      success: true,
      healthy: healthCheck.healthy,
      data: healthCheck
    });

  } catch (error) {
    console.error('[Database Health] Erro:', error);
    return NextResponse.json({
      success: false,
      healthy: false,
      message: 'Erro ao verificar saúde do banco de dados',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'fix-all') {
      return await fixAllDatabaseIssues();
    }

    return NextResponse.json({ success: false, message: 'Ação não reconhecida' });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Erro ao processar ação',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function fixAllDatabaseIssues() {
  console.log('[Database Health] Iniciando correção de problemas...');

  const adminDb = getAdminDb();
  if (!adminDb) {
    console.error('[Database Health] Firebase Admin não disponível');
    return NextResponse.json({ success: false, message: 'Firebase Admin não disponível' });
  }

  const fixes: string[] = [];

  try {
    // 1. Corrigir usuários com assinatura expirada
    console.log('[Database Health] Buscando usuários com assinatura expirada...');
    const expiredUsers = await adminDb.collection('users')
      .where('isSubscriber', '==', true)
      .get();
    console.log(`[Database Health] Encontrados ${expiredUsers.size} usuários com assinatura ativa`);

    for (const doc of expiredUsers.docs) {
      const data = doc.data();
      if (!data.subscriptionEndDate || new Date(data.subscriptionEndDate) < new Date()) {
        const newEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await doc.ref.update({
          subscriptionEndDate: newEndDate.toISOString(),
          subscriptionStatus: 'active',
          updatedAt: new Date().toISOString()
        });
        fixes.push(`Corrigida assinatura expirada para ${data.email}`);
      }
    }

    // 2. Corrigir assinaturas sem data válida
    console.log('[Database Health] Buscando assinaturas com data inválida...');
    const invalidSubscriptions = await adminDb.collection('subscribers')
      .where('status', '==', 'active')
      .get();
    console.log(`[Database Health] Encontradas ${invalidSubscriptions.size} assinaturas ativas`);

    for (const doc of invalidSubscriptions.docs) {
      const data = doc.data();
      if (!data.endDate || new Date(data.endDate) < new Date()) {
        console.log(`[Database Health] Corrigindo assinatura: ${data.email}`);
        const newEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await doc.ref.update({
          endDate: newEndDate.toISOString(),
          updatedAt: new Date().toISOString()
        });
        fixes.push(`Corrigida data de fim para assinatura ${data.email}`);
      }
    }

    // 3. Sincronizar usuários e assinaturas
    console.log('[Database Health] Sincronizando usuários e assinaturas...');
    const usersWithSubscription = await adminDb.collection('users')
      .where('isSubscriber', '==', true)
      .get();
    console.log(`[Database Health] Encontrados ${usersWithSubscription.size} usuários com assinatura`);

    for (const userDoc of usersWithSubscription.docs) {
      const userData = userDoc.data();
      const existingSubscription = await adminDb.collection('subscribers')
        .where('email', '==', userData.email)
        .where('status', '==', 'active')
        .get();

      if (existingSubscription.empty) {
        // Criar assinatura correspondente
        console.log(`[Database Health] Criando assinatura para: ${userData.email}`);
        await adminDb.collection('subscribers').add({
          email: userData.email,
          status: 'active',
          paymentMethod: 'sync-fix',
          startDate: userData.subscriptionStartDate || new Date().toISOString(),
          endDate: userData.subscriptionEndDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 99.00,
          planDuration: 30,
          createdAt: new Date().toISOString()
        });
        fixes.push(`Criada assinatura correspondente para ${userData.email}`);
      }
    }

    console.log(`[Database Health] Correção concluída: ${fixes.length} problemas corrigidos`);
    return NextResponse.json({
      success: true,
      message: `${fixes.length} problemas corrigidos`,
      fixes: fixes
    });

  } catch (error) {
    console.error('[Database Health] Erro ao corrigir problemas:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao corrigir problemas do banco',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
