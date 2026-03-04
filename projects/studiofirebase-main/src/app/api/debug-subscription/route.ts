import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { action, email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ success: false, message: 'Email é obrigatório' });
    }
    
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ success: false, message: 'Firebase Admin não disponível' });
    }
    
    if (action === 'check') {
      return await checkSubscriptionData(adminDb, email);
    } else if (action === 'fix') {
      return await fixSubscriptionData(adminDb, email);
    }
    
    return NextResponse.json({ success: false, message: 'Ação não reconhecida' });
    
  } catch (error) {
    console.error('[Debug Subscription API] Erro:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function checkSubscriptionData(adminDb: any, email: string) {
  const results = {
    email,
    users: null as any,
    subscribers: [] as any[],
    timestamp: new Date().toISOString()
  };
  
  try {
    // Verificar coleção 'users'
    const usersRef = adminDb.collection('users');
    const userQuery = await usersRef.where('email', '==', email).get();
    
    if (!userQuery.empty) {
      const userDoc = userQuery.docs[0];
      results.users = {
        id: userDoc.id,
        ...userDoc.data()
      };
    }
    
    // Verificar coleção 'subscribers'
    const subscribersRef = adminDb.collection('subscribers');
    const subscriberQuery = await subscribersRef.where('email', '==', email).get();
    
    subscriberQuery.docs.forEach((doc: any) => {
      results.subscribers.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return NextResponse.json({
      success: true,
      message: 'Dados verificados',
      data: results
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Erro ao verificar dados',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function fixSubscriptionData(adminDb: any, email: string) {
  try {
    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias
    
    // 1. Corrigir/criar na coleção 'users'
    const usersRef = adminDb.collection('users');
    const userQuery = await usersRef.where('email', '==', email).get();
    
    if (!userQuery.empty) {
      // Atualizar usuário existente
      const userDoc = userQuery.docs[0];
      await userDoc.ref.update({
        isSubscriber: true,
        subscriptionStatus: 'active',
        subscriptionType: 'monthly',
        subscriptionStartDate: now.toISOString(),
        subscriptionEndDate: endDate.toISOString(),
        lastLogin: now.toISOString(),
        updatedAt: now.toISOString(),
        paymentId: `manual-fix-${Date.now()}`
      });
      console.log(`✅ Usuário ${email} atualizado na coleção 'users'`);
    } else {
      // Criar novo usuário
      await usersRef.add({
        email: email,
        nome: email.split('@')[0],
        isSubscriber: true,
        subscriptionStatus: 'active',
        subscriptionType: 'monthly',
        subscriptionStartDate: now.toISOString(),
        subscriptionEndDate: endDate.toISOString(),
        createdAt: now.toISOString(),
        lastLogin: now.toISOString(),
        paymentId: `manual-fix-${Date.now()}`
      });
      console.log(`✅ Novo usuário ${email} criado na coleção 'users'`);
    }
    
    // 2. Corrigir/criar na coleção 'subscribers'
    const subscribersRef = adminDb.collection('subscribers');
    const subscriberQuery = await subscribersRef.where('email', '==', email).get();
    
    if (!subscriberQuery.empty) {
      // Atualizar assinatura existente
      const subscriberDoc = subscriberQuery.docs[0];
      await subscriberDoc.ref.update({
        status: 'active',
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
        updatedAt: now.toISOString()
      });
      console.log(`✅ Assinatura ${email} atualizada na coleção 'subscribers'`);
    } else {
      // Criar nova assinatura
      await subscribersRef.add({
        email: email,
        status: 'active',
        paymentMethod: 'manual-fix',
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
        amount: 99.00,
        planDuration: 30,
        createdAt: now.toISOString()
      });
      console.log(`✅ Nova assinatura ${email} criada na coleção 'subscribers'`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Assinatura corrigida com sucesso no banco de dados',
      data: {
        email,
        subscriptionEndDate: endDate.toISOString(),
        status: 'active'
      }
    });
    
  } catch (error) {
    console.error('Erro ao corrigir assinatura:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao corrigir dados',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
