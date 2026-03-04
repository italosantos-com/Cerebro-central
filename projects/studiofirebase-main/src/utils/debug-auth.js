/**
 * Script de Debug para Verificar Estado de Autenticação
 * Execute no console do navegador: window.debugAuth()
 */

window.debugAuth = function() {
  console.log('🔍 =================================');
  console.log('🔍 DEBUG DE AUTENTICAÇÃO');
  console.log('🔍 =================================');
  
  // 1. Verificar localStorage
  console.log('📦 localStorage:');
  console.log('  - isAuthenticated:', localStorage.getItem('isAuthenticated'));
  console.log('  - hasSubscription:', localStorage.getItem('hasSubscription'));
  console.log('  - userEmail:', localStorage.getItem('userEmail'));
  console.log('  - userType:', localStorage.getItem('userType'));
  console.log('  - isSubscriber:', localStorage.getItem('isSubscriber'));
  console.log('  - subscriptionStatus:', localStorage.getItem('subscriptionStatus'));
  console.log('  - hasPaid:', localStorage.getItem('hasPaid'));
  
  // 2. Verificar sessionStorage
  console.log('\n📦 sessionStorage:');
  console.log('  - isAuthenticated:', sessionStorage.getItem('isAuthenticated'));
  console.log('  - hasSubscription:', sessionStorage.getItem('hasSubscription'));
  console.log('  - userEmail:', sessionStorage.getItem('userEmail'));
  
  // 3. Verificar cookies
  console.log('\n🍪 cookies:');
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});
  console.log('  - isAuthenticated:', cookies.isAuthenticated);
  console.log('  - hasSubscription:', cookies.hasSubscription);
  console.log('  - userEmail:', cookies.userEmail);
  console.log('  - userType:', cookies.userType);
  
  // 4. Verificar URL atual
  console.log('\n🌐 URL atual:', window.location.href);
  console.log('🌐 Path:', window.location.pathname);
  
  console.log('\n🔍 =================================');
  console.log('🔍 FIM DO DEBUG');
  console.log('🔍 =================================');
  
  // Retornar dados estruturados
  return {
    localStorage: {
      isAuthenticated: localStorage.getItem('isAuthenticated'),
      hasSubscription: localStorage.getItem('hasSubscription'),
      userEmail: localStorage.getItem('userEmail'),
      userType: localStorage.getItem('userType'),
      isSubscriber: localStorage.getItem('isSubscriber'),
      subscriptionStatus: localStorage.getItem('subscriptionStatus'),
      hasPaid: localStorage.getItem('hasPaid')
    },
    cookies: cookies,
    url: window.location.href,
    path: window.location.pathname
  };
};

window.fixAuth = function() {
  console.log('🔧 Corrigindo autenticação...');
  
  // Definir dados básicos de assinante
  localStorage.setItem('isAuthenticated', 'true');
  localStorage.setItem('hasSubscription', 'true');
  localStorage.setItem('userEmail', 'rica@gmail.com');
  localStorage.setItem('userType', 'member');
  localStorage.setItem('isSubscriber', 'true');
  localStorage.setItem('subscriptionStatus', 'active');
  localStorage.setItem('hasPaid', 'true');
  
  // Definir cookies também
  const maxAge = 30 * 24 * 60 * 60; // 30 dias
  document.cookie = `isAuthenticated=true; path=/; max-age=${maxAge}`;
  document.cookie = `hasSubscription=true; path=/; max-age=${maxAge}`;
  document.cookie = `userEmail=rica@gmail.com; path=/; max-age=${maxAge}`;
  document.cookie = `userType=member; path=/; max-age=${maxAge}`;
  
  console.log('✅ Autenticação corrigida! Recarregue a página.');
  
  // Recarregar a página após 1 segundo
  setTimeout(() => {
    window.location.reload();
  }, 1000);
};

console.log('🔍 Debug de autenticação carregado!');
console.log('📋 Comandos disponíveis:');
console.log('  - window.debugAuth() - Ver estado atual');
console.log('  - window.fixAuth() - Corrigir autenticação');
