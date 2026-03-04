// Função para limpar dados residuais de autenticação
export function clearAuthData() {
  
  
  // Limpar localStorage
  const keysToRemove = [
    'isAuthenticated',
    'userEmail',
    'userName',
    'userType',
    'hasSubscription',
    'subscriptionExpiry',
    'customerEmail',
    'currentPixPaymentId',
    'userSubscription',
    'hasPaid'
  ];
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Limpar sessionStorage
  sessionStorage.clear();
  
  // Limpar cookies
  const cookiesToClear = [
    'isAuthenticated',
    'hasSubscription',
    'userEmail',
    'userType'
  ];
  
  cookiesToClear.forEach(name => {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
    document.cookie = `${name}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
  });
  
  
}

// Função para verificar se há dados residuais suspeitos
export function checkForResidualData() {
  
  
  const suspiciousData = {
    localStorage: {} as Record<string, any>,
    sessionStorage: {} as Record<string, any>,
    cookies: {} as Record<string, any>
  };
  
  // Verificar localStorage
  const localStorageKeys = [
    'isAuthenticated',
    'userEmail',
    'userName',
    'userType',
    'hasSubscription',
    'customerEmail',
    'currentPixPaymentId'
  ];
  
  localStorageKeys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      suspiciousData.localStorage[key] = value;
    }
  });
  
  // Verificar sessionStorage
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key) {
      suspiciousData.sessionStorage[key] = sessionStorage.getItem(key);
    }
  }
  
  // Verificar cookies
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      acc[name] = value;
    }
    return acc;
  }, {} as Record<string, string>);
  
  suspiciousData.cookies = cookies;
  
  
  
  return suspiciousData;
}

// Função para verificar se o usuário está realmente autenticado
export function isUserReallyAuthenticated() {
  const localStorage_auth = localStorage.getItem('isAuthenticated') === 'true';
  const sessionStorage_auth = sessionStorage.getItem('isAuthenticated') === 'true';
  const hasUserEmail = localStorage.getItem('userEmail') || sessionStorage.getItem('userEmail');
  
  // Verificar se há dados suspeitos
  const hasSuspiciousData = checkForResidualData();
  
  // Se há dados de autenticação mas não há email válido, é suspeito
  if ((localStorage_auth || sessionStorage_auth) && !hasUserEmail) {

    return false;
  }
  
  // Se há email mas não há autenticação, também é suspeito
  if (hasUserEmail && !localStorage_auth && !sessionStorage_auth) {

    return false;
  }
  
  return localStorage_auth || sessionStorage_auth;
}

// Função para forçar logout e limpeza
export function forceLogout() {
  
  
  // Limpar todos os dados
  clearAuthData();
  
  // Redirecionar para login
  if (typeof window !== 'undefined') {
    window.location.href = '/auth/face';
  }
}
