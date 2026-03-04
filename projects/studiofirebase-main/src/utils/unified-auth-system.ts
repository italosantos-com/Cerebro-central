/**
 * Sistema Unificado de Autenticação e Autorização
 * Funciona tanto em localhost quanto em Firebase
 */

export interface UnifiedAuthResult {
  isAuthenticated: boolean;
  hasSubscription: boolean;
  userEmail: string | null;
  userType: 'vip' | 'member' | null;
  source: string;
  debug?: any;
}

export interface UnifiedAccessResult {
  hasAccess: boolean;
  reason: string;
  shouldRedirect: boolean;
  redirectTo?: string;
  debug?: any;
}

/**
 * Verificação unificada de autenticação e assinatura
 * Verifica TODAS as fontes possíveis
 */
export async function checkUnifiedAuth(
  contextAuth: boolean,
  contextUserEmail: string | null,
  contextUserType: 'vip' | 'member' | null,
  userProfile: any,
  firebaseUser: any
): Promise<UnifiedAuthResult> {
  const debug: any = {};

  // 1. VERIFICAR AUTENTICAÇÃO (múltiplas fontes)
  const authSources = {
    context: contextAuth,
    localStorage: typeof window !== 'undefined' && localStorage.getItem('isAuthenticated') === 'true',
    firebaseUser: !!firebaseUser?.email,
    userProfile: !!userProfile?.email,
  };

  const isAuthenticated = Object.values(authSources).some(Boolean);
  debug.authSources = authSources;
  debug.isAuthenticated = isAuthenticated;

  // 2. OBTER EMAIL (múltiplas fontes)
  const emailSources = {
    context: contextUserEmail,
    firebaseUser: firebaseUser?.email,
    userProfile: userProfile?.email,
    localStorage: typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null,
  };

  const userEmail = Object.values(emailSources).find(email => email && email.trim() !== '') || null;
  debug.emailSources = emailSources;
  debug.userEmail = userEmail;

  // 3. VERIFICAR ASSINATURA (múltiplas fontes)
  const subscriptionSources = {
    contextVip: contextUserType === 'vip',
    userProfileSubscriber: userProfile?.isSubscriber === true,
    userProfileStatus: userProfile?.subscriptionStatus === 'active',
    localStorageSubscription: typeof window !== 'undefined' && localStorage.getItem('hasSubscription') === 'true',
    localStorageUserType: typeof window !== 'undefined' && localStorage.getItem('userType') === 'vip',
    localStorageHasPaid: typeof window !== 'undefined' && localStorage.getItem('hasPaid') === 'true',
    localStorageIsSubscriber: typeof window !== 'undefined' && localStorage.getItem('isSubscriber') === 'true',
    localStorageSubscriptionStatus: typeof window !== 'undefined' && localStorage.getItem('subscriptionStatus') === 'active',
  };

  // 4. VERIFICAÇÃO ADICIONAL VIA API (se tiver email)
  let apiSubscriptionCheck = false;
  if (userEmail && typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkSubscription',
          customerEmail: userEmail
        })
      });

      if (response.ok) {
        const data = await response.json();
        apiSubscriptionCheck = data.success && (data.isSubscriber || data.hasActiveSubscription);
        debug.apiCheck = { success: data.success, isSubscriber: data.isSubscriber, hasActiveSubscription: data.hasActiveSubscription };
      }
    } catch (error) {
      debug.apiCheckError = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  (subscriptionSources as any).apiCheck = apiSubscriptionCheck;
  const hasSubscription = Object.values(subscriptionSources).some(Boolean);
  debug.subscriptionSources = subscriptionSources;
  debug.hasSubscription = hasSubscription;

  // 5. DETERMINAR TIPO DE USUÁRIO
  let userType: 'vip' | 'member' | null = null;
  if (contextUserType === 'vip' || localStorage.getItem('userType') === 'vip') {
    userType = 'vip';
  } else if (hasSubscription) {
    userType = 'member';
  }

  // 6. DETERMINAR FONTE PRINCIPAL
  let source = 'unknown';
  if (authSources.context) source = 'context';
  else if (authSources.firebaseUser) source = 'firebase';
  else if (authSources.localStorage) source = 'localStorage';
  else if (authSources.userProfile) source = 'userProfile';

  return {
    isAuthenticated,
    hasSubscription,
    userEmail,
    userType,
    source,
    debug: process.env.NODE_ENV === 'development' ? debug : undefined
  };
}

/**
 * Verificação de acesso à galeria exclusiva
 */
export async function checkGalleryAccess(
  contextAuth: boolean,
  contextUserEmail: string | null,
  contextUserType: 'vip' | 'member' | null,
  userProfile: any,
  firebaseUser: any
): Promise<UnifiedAccessResult> {
  const authResult = await checkUnifiedAuth(
    contextAuth,
    contextUserEmail,
    contextUserType,
    userProfile,
    firebaseUser
  );

  if (process.env.NODE_ENV === 'development') {

  }

  // Não autenticado
  if (!authResult.isAuthenticated || !authResult.userEmail) {
    return {
      hasAccess: false,
      reason: 'Usuário não autenticado',
      shouldRedirect: true,
      redirectTo: '/auth/face',
      debug: authResult.debug
    };
  }

  // Sem assinatura
  if (!authResult.hasSubscription) {
    return {
      hasAccess: false,
      reason: 'Usuário sem assinatura ativa',
      shouldRedirect: true,
      redirectTo: '/assinante',
      debug: authResult.debug
    };
  }

  // Acesso liberado
  return {
    hasAccess: true,
    reason: 'Acesso autorizado',
    shouldRedirect: false,
    debug: authResult.debug
  };
}

/**
 * Definir cookies de acesso para o middleware
 */
export function setUnifiedAccessCookies(authResult: UnifiedAuthResult) {
  if (typeof window !== 'undefined') {
    const maxAge = 30 * 24 * 60 * 60; // 30 dias
    
    if (authResult.isAuthenticated) {
      document.cookie = `isAuthenticated=true; path=/; max-age=${maxAge}`;
    }
    
    if (authResult.hasSubscription) {
      document.cookie = `hasSubscription=true; path=/; max-age=${maxAge}`;
    }
    
    if (authResult.userEmail) {
      document.cookie = `userEmail=${authResult.userEmail}; path=/; max-age=${maxAge}`;
    }
    
    if (authResult.userType) {
      document.cookie = `userType=${authResult.userType}; path=/; max-age=${maxAge}`;
    }
  }
}

/**
 * Limpar todos os dados de autenticação
 */
export function clearUnifiedAuthData() {
  if (typeof window !== 'undefined') {
    // Limpar localStorage
    const keysToRemove = [
      'isAuthenticated', 'userEmail', 'hasSubscription', 'userType', 
      'hasPaid', 'isSubscriber', 'subscriptionStatus'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Limpar sessionStorage
    sessionStorage.clear();
    
    // Limpar cookies
    const cookiesToRemove = [
      'isAuthenticated', 'hasSubscription', 'userEmail', 'userType'
    ];
    
    cookiesToRemove.forEach(cookie => {
      document.cookie = `${cookie}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
  }
}

/**
 * Ativar assinatura localmente (após pagamento)
 */
export function activateLocalSubscription(userEmail: string, userType: 'vip' | 'member' = 'member') {
  if (typeof window !== 'undefined') {
    localStorage.setItem('hasSubscription', 'true');
    localStorage.setItem('isSubscriber', 'true');
    localStorage.setItem('subscriptionStatus', 'active');
    localStorage.setItem('userType', userType);
    localStorage.setItem('hasPaid', 'true');
    localStorage.setItem('userEmail', userEmail);
    localStorage.setItem('isAuthenticated', 'true');
    
    // Definir cookies também
    const maxAge = 30 * 24 * 60 * 60; // 30 dias
    document.cookie = `isAuthenticated=true; path=/; max-age=${maxAge}`;
    document.cookie = `hasSubscription=true; path=/; max-age=${maxAge}`;
    document.cookie = `userEmail=${userEmail}; path=/; max-age=${maxAge}`;
    document.cookie = `userType=${userType}; path=/; max-age=${maxAge}`;
  }
}
