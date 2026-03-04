/**
 * Debug e correção de dados de assinatura no banco de dados Firebase
 */

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore';

export async function debugDatabaseSubscription(userEmail: string) {
  console.log('🔍 =====================================');
  console.log('🔍 DEBUG BANCO DE DADOS - ASSINATURA');
  console.log('🔍 =====================================');
  console.log('📧 Email do usuário:', userEmail);
  
  try {
    // 1. Verificar na coleção 'users'
    console.log('\n📊 Verificando coleção "users"...');
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('email', '==', userEmail));
    const userSnapshot = await getDocs(userQuery);
    
    if (!userSnapshot.empty) {
      const userDoc = userSnapshot.docs[0];
      const userData = userDoc.data();
      console.log('✅ Usuário encontrado na coleção "users":');
      console.table({
        id: userDoc.id,
        email: userData.email,
        isSubscriber: userData.isSubscriber,
        subscriptionStatus: userData.subscriptionStatus,
        subscriptionType: userData.subscriptionType,
        subscriptionStartDate: userData.subscriptionStartDate,
        subscriptionEndDate: userData.subscriptionEndDate,
        paymentId: userData.paymentId,
        lastLogin: userData.lastLogin,
        createdAt: userData.createdAt
      });
    } else {
      console.log('❌ Usuário NÃO encontrado na coleção "users"');
    }
    
    // 2. Verificar na coleção 'subscribers'
    console.log('\n📊 Verificando coleção "subscribers"...');
    const subscribersRef = collection(db, 'subscribers');
    const subscriberQuery = query(subscribersRef, where('email', '==', userEmail));
    const subscriberSnapshot = await getDocs(subscriberQuery);
    
    if (!subscriberSnapshot.empty) {
      console.log('✅ Assinatura encontrada na coleção "subscribers":');
      subscriberSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`📋 Assinatura ${index + 1}:`);
        console.table({
          id: doc.id,
          email: data.email,
          status: data.status,
          startDate: data.startDate,
          endDate: data.endDate,
          paymentMethod: data.paymentMethod,
          amount: data.amount,
          planDuration: data.planDuration,
          createdAt: data.createdAt
        });
      });
    } else {
      console.log('❌ Assinatura NÃO encontrada na coleção "subscribers"');
    }
    
    // 3. Verificar via API
    console.log('\n📊 Verificando via API...');
    const response = await fetch('/api/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'checkSubscription',
        customerEmail: userEmail
      })
    });
    
    if (response.ok) {
      const apiData = await response.json();
      console.log('✅ Resposta da API:');
      console.table({
        success: apiData.success,
        isSubscriber: apiData.isSubscriber,
        hasActiveSubscription: apiData.hasActiveSubscription,
        message: apiData.message
      });
      
      if (apiData.subscription) {
        console.log('📋 Dados da assinatura via API:');
        console.table(apiData.subscription);
      }
    } else {
      console.log('❌ Erro na API:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar banco de dados:', error);
  }
  
  console.log('\n🔍 =====================================');
  console.log('🔍 FIM DEBUG BANCO DE DADOS');
  console.log('🔍 =====================================');
}

export async function fixDatabaseSubscription(userEmail: string) {
  console.log('🔧 =====================================');
  console.log('🔧 CORRIGINDO ASSINATURA NO BANCO');
  console.log('🔧 =====================================');
  
  try {
    // 1. Corrigir na coleção 'users'
    console.log('🔧 Corrigindo coleção "users"...');
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('email', '==', userEmail));
    const userSnapshot = await getDocs(userQuery);
    
    if (!userSnapshot.empty) {
      const userDoc = userSnapshot.docs[0];
      await updateDoc(userDoc.ref, {
        isSubscriber: true,
        subscriptionStatus: 'active',
        subscriptionType: 'monthly',
        subscriptionStartDate: new Date().toISOString(),
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
        lastLogin: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log('✅ Usuário atualizado na coleção "users"');
    } else {
      // Criar usuário se não existir
      const newUserRef = doc(collection(db, 'users'));
      await setDoc(newUserRef, {
        email: userEmail,
        nome: userEmail.split('@')[0],
        isSubscriber: true,
        subscriptionStatus: 'active',
        subscriptionType: 'monthly',
        subscriptionStartDate: new Date().toISOString(),
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        paymentId: 'manual-fix-' + Date.now()
      });
      console.log('✅ Novo usuário criado na coleção "users"');
    }
    
    // 2. Criar/atualizar na coleção 'subscribers'
    console.log('🔧 Corrigindo coleção "subscribers"...');
    const subscribersRef = collection(db, 'subscribers');
    const subscriberQuery = query(subscribersRef, where('email', '==', userEmail));
    const subscriberSnapshot = await getDocs(subscriberQuery);
    
    if (!subscriberSnapshot.empty) {
      // Atualizar existente
      const subscriberDoc = subscriberSnapshot.docs[0];
      await updateDoc(subscriberDoc.ref, {
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log('✅ Assinatura atualizada na coleção "subscribers"');
    } else {
      // Criar nova assinatura
      const newSubscriberRef = doc(collection(db, 'subscribers'));
      await setDoc(newSubscriberRef, {
        email: userEmail,
        status: 'active',
        paymentMethod: 'manual-fix',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 99.00,
        planDuration: 30,
        createdAt: new Date().toISOString()
      });
      console.log('✅ Nova assinatura criada na coleção "subscribers"');
    }
    
    console.log('\n✅ Correção concluída! Dados atualizados no Firebase.');
    console.log('🔄 Recarregue a página para ver as mudanças.');
    
  } catch (error) {
    console.error('❌ Erro ao corrigir banco de dados:', error);
  }
  
  console.log('\n🔧 =====================================');
  console.log('🔧 FIM CORREÇÃO BANCO DE DADOS');
  console.log('🔧 =====================================');
}

// Disponibilizar globalmente
if (typeof window !== 'undefined') {
  (window as any).debugDatabaseSubscription = debugDatabaseSubscription;
  (window as any).fixDatabaseSubscription = fixDatabaseSubscription;
  
  console.log('🔧 Debug de banco de dados carregado!');
  console.log('📋 Comandos disponíveis:');
  console.log('  - window.debugDatabaseSubscription("seu@email.com") - Ver dados no Firebase');
  console.log('  - window.fixDatabaseSubscription("seu@email.com") - Corrigir assinatura no Firebase');
}
