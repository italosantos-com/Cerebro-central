/**
 * Utilitário simplificado para verificação de acesso à galeria exclusiva
 */

export interface GalleryAccessResult {
  hasAccess: boolean;
  reason: string;
  shouldRedirect: boolean;
  redirectTo?: string;
}

export function checkGalleryAccess(
  isAuthenticated: boolean,
  userEmail: string | null,
  userType: 'vip' | 'member' | null,
  userProfile: any,
  firebaseUser: any
): GalleryAccessResult {
  // Log detalhado para debug
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [GalleryAccess] Verificando acesso com dados:', {
      isAuthenticated,
      userEmail,
      userType,
      userProfile_isSubscriber: userProfile?.isSubscriber,
      firebaseUser_email: firebaseUser?.email,
      localStorage_isAuthenticated: localStorage.getItem('isAuthenticated'),
      localStorage_hasSubscription: localStorage.getItem('hasSubscription'),
      localStorage_userType: localStorage.getItem('userType'),
      localStorage_hasPaid: localStorage.getItem('hasPaid')
    })
  }

  // 1. Verificar se está autenticado (múltiplas fontes)
  const isUserAuthenticated = (
    isAuthenticated ||
    localStorage.getItem('isAuthenticated') === 'true' ||
    !!firebaseUser?.email ||
    !!userProfile?.email
  );

  const hasEmail = (
    userEmail ||
    firebaseUser?.email ||
    userProfile?.email ||
    localStorage.getItem('userEmail')
  );

  if (!isUserAuthenticated || !hasEmail) {
    if (process.env.NODE_ENV === 'development') {
      console.log('❌ [GalleryAccess] Não autenticado:', { isUserAuthenticated, hasEmail })
    }
    return {
      hasAccess: false,
      reason: 'Usuário não autenticado',
      shouldRedirect: true,
      redirectTo: '/auth/face'
    };
  }

  // 2. Verificar se tem assinatura (múltiplas fontes - mais abrangente)
  const subscriptionChecks = {
    userTypeVip: userType === 'vip',
    userProfileSubscriber: userProfile?.isSubscriber === true,
    localStorageSubscription: localStorage.getItem('hasSubscription') === 'true',
    localStorageUserTypeVip: localStorage.getItem('userType') === 'vip',
    localStorageHasPaid: localStorage.getItem('hasPaid') === 'true',
    // Verificações adicionais para casos edge
    localStorageIsSubscriber: localStorage.getItem('isSubscriber') === 'true',
    localStorageSubscriptionStatus: localStorage.getItem('subscriptionStatus') === 'active'
  };

  const hasSubscription = Object.values(subscriptionChecks).some(check => check === true);

  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [GalleryAccess] Verificações de assinatura:', subscriptionChecks)
    console.log('🔍 [GalleryAccess] Tem assinatura:', hasSubscription)
  }

  if (!hasSubscription) {
    if (process.env.NODE_ENV === 'development') {
      console.log('❌ [GalleryAccess] Sem assinatura ativa')
    }
    return {
      hasAccess: false,
      reason: 'Usuário sem assinatura ativa',
      shouldRedirect: true,
      redirectTo: '/assinante'
    };
  }

  // 3. Acesso liberado
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ [GalleryAccess] Acesso liberado!')
  }
  return {
    hasAccess: true,
    reason: 'Acesso autorizado',
    shouldRedirect: false
  };
}

export function setAccessCookies() {
  // Definir cookies para o middleware
  const maxAge = 30 * 24 * 60 * 60; // 30 dias
  document.cookie = `isAuthenticated=true; path=/; max-age=${maxAge}`;
  document.cookie = `hasSubscription=true; path=/; max-age=${maxAge}`;
}

export function clearAccessData() {
  // Limpar dados de acesso
  localStorage.removeItem('hasSubscription');
  localStorage.removeItem('userType');
  localStorage.removeItem('hasPaid');
  document.cookie = 'hasSubscription=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

export function clearAllAuthData() {
  // Limpar todos os dados de autenticação
  localStorage.clear();
  sessionStorage.clear();
  document.cookie = 'isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'hasSubscription=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}
