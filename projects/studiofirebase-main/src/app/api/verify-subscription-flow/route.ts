import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email é obrigatório' 
      });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ 
        success: false, 
        message: 'Firebase Admin não disponível' 
      });
    }

    console.log(`🔍 [SubscriptionFlow] Verificando assinatura para: ${email}`);

    const result = {
      email,
      timestamp: new Date().toISOString(),
      checks: {} as any,
      finalDecision: {
        isSubscriber: false,
        source: 'none',
        reason: ''
      }
    };

    // 1. Verificar na coleção 'users'
    console.log(`📊 [SubscriptionFlow] Verificando coleção 'users'...`);
    try {
      const usersRef = adminDb.collection('users');
      const userQuery = await usersRef.where('email', '==', email).get();
      
      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
        const userData = userDoc.data();
        
        result.checks.users = {
          found: true,
          data: {
            id: userDoc.id,
            email: userData.email,
            isSubscriber: userData.isSubscriber,
            subscriptionStatus: userData.subscriptionStatus,
            subscriptionType: userData.subscriptionType,
            subscriptionStartDate: userData.subscriptionStartDate,
            subscriptionEndDate: userData.subscriptionEndDate,
            paymentId: userData.paymentId,
            lastLogin: userData.lastLogin
          }
        };

        // Verificar se é assinante ativo na coleção users
        const isActiveUser = userData.isSubscriber === true && 
          userData.subscriptionEndDate && 
          new Date(userData.subscriptionEndDate) > new Date();

        if (isActiveUser) {
          result.finalDecision = {
            isSubscriber: true,
            source: 'users collection',
            reason: `Usuário com isSubscriber=true e subscriptionEndDate válida até ${userData.subscriptionEndDate}`
          };
        }

        console.log(`✅ [SubscriptionFlow] Usuário encontrado na coleção 'users':`, {
          isSubscriber: userData.isSubscriber,
          subscriptionStatus: userData.subscriptionStatus,
          subscriptionEndDate: userData.subscriptionEndDate,
          isActive: isActiveUser
        });
      } else {
        result.checks.users = { found: false };
        console.log(`❌ [SubscriptionFlow] Usuário NÃO encontrado na coleção 'users'`);
      }
    } catch (error) {
      result.checks.users = { 
        found: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
      console.error(`❌ [SubscriptionFlow] Erro ao verificar coleção 'users':`, error);
    }

    // 2. Verificar na coleção 'subscribers'
    console.log(`📊 [SubscriptionFlow] Verificando coleção 'subscribers'...`);
    try {
      const subscribersRef = adminDb.collection('subscribers');
      const subscriberQuery = await subscribersRef
        .where('email', '==', email)
        .where('status', '==', 'active')
        .get();
      
      if (!subscriberQuery.empty) {
        const subscriberDoc = subscriberQuery.docs[0];
        const subscriberData = subscriberDoc.data();
        
        result.checks.subscribers = {
          found: true,
          data: {
            id: subscriberDoc.id,
            email: subscriberData.email,
            status: subscriberData.status,
            paymentMethod: subscriberData.paymentMethod,
            startDate: subscriberData.startDate,
            endDate: subscriberData.endDate,
            amount: subscriberData.amount,
            planDuration: subscriberData.planDuration
          }
        };

        // Verificar se a assinatura está ativa
        const isActiveSubscription = subscriberData.status === 'active' &&
          subscriberData.endDate &&
          new Date(subscriberData.endDate) > new Date();

        if (isActiveSubscription && !result.finalDecision.isSubscriber) {
          result.finalDecision = {
            isSubscriber: true,
            source: 'subscribers collection',
            reason: `Assinatura ativa até ${subscriberData.endDate}`
          };
        }

        console.log(`✅ [SubscriptionFlow] Assinatura encontrada na coleção 'subscribers':`, {
          status: subscriberData.status,
          endDate: subscriberData.endDate,
          isActive: isActiveSubscription
        });
      } else {
        result.checks.subscribers = { found: false };
        console.log(`❌ [SubscriptionFlow] Assinatura NÃO encontrada na coleção 'subscribers'`);
      }
    } catch (error) {
      result.checks.subscribers = { 
        found: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
      console.error(`❌ [SubscriptionFlow] Erro ao verificar coleção 'subscribers':`, error);
    }

    // 3. Decisão final
    if (!result.finalDecision.isSubscriber) {
      result.finalDecision.reason = 'Nenhuma assinatura ativa encontrada em ambas as coleções';
    }

    console.log(`🎯 [SubscriptionFlow] Decisão final:`, result.finalDecision);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[SubscriptionFlow] Erro geral:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao verificar fluxo de assinatura',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
