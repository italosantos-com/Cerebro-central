/**
 * Debug específico para problemas de acesso à galeria
 */

export function debugGalleryAccess() {
  console.log('🔍 ========================================');
  console.log('🔍 DEBUG GALERIA EXCLUSIVA');
  console.log('🔍 ========================================');
  
  // 1. URL atual
  console.log('🌐 URL atual:', window.location.href);
  console.log('🌐 Pathname:', window.location.pathname);
  
  // 2. localStorage
  console.log('\n📦 localStorage:');
  const localStorageData = {
    isAuthenticated: localStorage.getItem('isAuthenticated'),
    hasSubscription: localStorage.getItem('hasSubscription'),
    userEmail: localStorage.getItem('userEmail'),
    userType: localStorage.getItem('userType'),
    isSubscriber: localStorage.getItem('isSubscriber'),
    subscriptionStatus: localStorage.getItem('subscriptionStatus'),
    hasPaid: localStorage.getItem('hasPaid')
  };
  console.table(localStorageData);
  
  // 3. sessionStorage
  console.log('\n📦 sessionStorage:');
  const secureAuth = sessionStorage.getItem('secureAuth');
  if (secureAuth) {
    try {
      const parsed = JSON.parse(secureAuth);
      console.table(parsed);
    } catch (e) {
      console.log('❌ Erro ao parsear secureAuth:', secureAuth);
    }
  } else {
    console.log('❌ Nenhum secureAuth encontrado');
  }
  
  // 4. cookies
  console.log('\n🍪 Cookies:');
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key) acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
  console.table(cookies);
  
  // 5. Verificar se há redirecionamentos ativos
  console.log('\n🔄 Verificando redirecionamentos...');
  
  // Verificar se há timers ativos
  const timers = (window as any).__debugTimers || [];
  console.log('⏰ Timers ativos:', timers.length);
  
  console.log('\n🔍 ========================================');
  console.log('🔍 FIM DEBUG GALERIA');
  console.log('🔍 ========================================');
  
  return {
    url: window.location.href,
    localStorage: localStorageData,
    sessionStorage: secureAuth ? JSON.parse(secureAuth) : null,
    cookies
  };
}

export function fixGalleryAccess() {
  console.log('🔧 Corrigindo acesso à galeria...');
  
  // Limpar tudo primeiro
  sessionStorage.clear();
  
  // Definir dados corretos
  const authData = {
    isAuthenticated: true,
    hasSubscription: true,
    userEmail: 'rica@gmail.com',
    userType: 'member',
    source: 'session',
    timestamp: Date.now()
  };
  
  // sessionStorage (principal)
  sessionStorage.setItem('secureAuth', JSON.stringify(authData));
  
  // localStorage (fallback)
  localStorage.setItem('isAuthenticated', 'true');
  localStorage.setItem('hasSubscription', 'true');
  localStorage.setItem('userEmail', 'rica@gmail.com');
  localStorage.setItem('userType', 'member');
  localStorage.setItem('isSubscriber', 'true');
  localStorage.setItem('subscriptionStatus', 'active');
  localStorage.setItem('hasPaid', 'true');
  
  // cookies
  const maxAge = 8 * 60 * 60; // 8 horas
  document.cookie = `isAuthenticated=true; path=/; max-age=${maxAge}; SameSite=Strict`;
  document.cookie = `hasSubscription=true; path=/; max-age=${maxAge}; SameSite=Strict`;
  document.cookie = `userEmail=rica@gmail.com; path=/; max-age=${maxAge}; SameSite=Strict`;
  document.cookie = `userType=member; path=/; max-age=${maxAge}; SameSite=Strict`;
  
  console.log('✅ Dados corrigidos! Tentando acessar galeria...');
  
  // Tentar navegar para galeria
  setTimeout(() => {
    window.location.href = '/galeria-assinantes';
  }, 1000);
}

// Disponibilizar globalmente
(window as any).debugGalleryAccess = debugGalleryAccess;
(window as any).fixGalleryAccess = fixGalleryAccess;

console.log('🔍 Debug de galeria carregado!');
console.log('📋 Comandos disponíveis:');
console.log('  - window.debugGalleryAccess() - Ver estado atual');
console.log('  - window.fixGalleryAccess() - Corrigir e acessar galeria');
