import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';

// Webhook unificado para processar pagamentos bem-sucedidos
export async function POST(request: NextRequest) {
  try {
    console.log('[Payment Success Webhook] Processando pagamento...');
    
    const body = await request.json();
    console.log('[Payment Success Webhook] Dados recebidos:', body);
    
    // Extrair informações do pagamento
    const {
      email,
      userId,
      paymentId,
      paymentMethod,
      amount,
      status,
      transactionId,
      payerId,
      paymentDate
    } = body;
    
    if (!email) {
      console.error('[Payment Success Webhook] Email não fornecido');
      return NextResponse.json({
        success: false,
        message: 'Email é obrigatório'
      }, { status: 400 });
    }
    
    if (status !== 'approved' && status !== 'completed' && status !== 'success') {
      console.log('[Payment Success Webhook] Pagamento não aprovado:', status);
      return NextResponse.json({
        success: false,
        message: 'Pagamento não aprovado'
      }, { status: 400 });
    }
    
    console.log('[Payment Success Webhook] Processando pagamento aprovado para:', email);
    
    const now = new Date();
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 1); // 30 dias
    
    const adminDb = getAdminDb();
    // 1. ATUALIZAR/CRIAR USUÁRIO NA COLEÇÃO 'users'
    if (adminDb) {
      try {
        const usersRef = adminDb.collection('users');
        const userQuery = await usersRef.where('email', '==', email).get();
        
        if (!userQuery.empty) {
          // Atualizar usuário existente
          const userDoc = userQuery.docs[0];
          await userDoc.ref.update({
            isSubscriber: true,
            subscriptionStatus: 'active',
            subscriptionStartDate: now.toISOString(),
            subscriptionEndDate: expirationDate.toISOString(),
            paymentMethod: paymentMethod || 'pix',
            amount: amount || 99.00,
            planDuration: 30,
            lastPaymentId: paymentId || transactionId,
            lastPaymentDate: paymentDate || now.toISOString(),
            updatedAt: now.toISOString()
          });
          console.log('[Payment Success Webhook] Usuário atualizado:', userDoc.id);
        } else {
          // Criar novo usuário
          const newUserRef = await usersRef.add({
            email: email,
            displayName: email.split('@')[0],
            uid: userId || `user_${Date.now()}`,
            isSubscriber: true,
            subscriptionStatus: 'active',
            subscriptionStartDate: now.toISOString(),
            subscriptionEndDate: expirationDate.toISOString(),
            paymentMethod: paymentMethod || 'pix',
            amount: amount || 99.00,
            planDuration: 30,
            lastPaymentId: paymentId || transactionId,
            lastPaymentDate: paymentDate || now.toISOString(),
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
          });
          console.log('[Payment Success Webhook] Novo usuário criado:', newUserRef.id);
        }
      } catch (error) {
        console.error('[Payment Success Webhook] Erro ao atualizar usuário:', error);
      }
    }
    
    // 2. SALVAR NA COLEÇÃO 'subscribers' (histórico de pagamentos)
    if (adminDb) {
      try {
  const adminApp = getAdminApp();
        const subscribersRef = adminDb.collection('subscribers');
        await subscribersRef.add({
          userId: userId || `user_${Date.now()}`,
          email: email,
          paymentId: paymentId || transactionId,
          paymentMethod: paymentMethod || 'pix',
          amount: amount || 99.00,
          status: 'active',
          startDate: now.toISOString(),
          endDate: expirationDate.toISOString(),
          planDuration: 30,
          payerId: payerId,
          transactionId: transactionId,
          paymentDate: paymentDate || now.toISOString(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        });
        console.log('[Payment Success Webhook] Assinatura salva na coleção subscribers');
      } catch (error) {
        console.error('[Payment Success Webhook] Erro ao salvar assinatura:', error);
      }
    }
    
    const adminApp = getAdminApp();
    // 3. SALVAR NO REALTIME DATABASE (backup)
    if (adminApp) {
      try {
        const rtdb = getDatabase(adminApp);
        const subscriptionsRef = rtdb.ref('subscriptions');
        const newSubscriptionRef = subscriptionsRef.push();
        
        await newSubscriptionRef.set({
          userId: userId || `user_${Date.now()}`,
          email: email,
          paymentId: paymentId || transactionId,
          paymentMethod: paymentMethod || 'pix',
          amount: amount || 99.00,
          status: 'active',
          startDate: now.toISOString(),
          endDate: expirationDate.toISOString(),
          planDuration: 30,
          payerId: payerId,
          transactionId: transactionId,
          paymentDate: paymentDate || now.toISOString(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        });
        
        // Atualizar índice do usuário
        const userSubscriptionRef = rtdb.ref(`users/${userId || `user_${Date.now()}`}/subscription`);
        await userSubscriptionRef.set(newSubscriptionRef.key);
        
        console.log('[Payment Success Webhook] Assinatura salva no Realtime Database');
      } catch (error) {
        console.error('[Payment Success Webhook] Erro ao salvar no RTDB:', error);
      }
    }
    
    console.log('[Payment Success Webhook] Pagamento processado com sucesso para:', email);
    
    return NextResponse.json({
      success: true,
      message: 'Pagamento processado com sucesso',
      email: email,
      subscriptionStatus: 'active',
      expirationDate: expirationDate.toISOString()
    });
    
  } catch (error) {
    console.error('[Payment Success Webhook] Erro geral:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
