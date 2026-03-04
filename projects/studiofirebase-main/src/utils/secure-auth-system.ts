/**
 * Sistema de Autenticação Seguro e Confiável
 * Substitui localStorage por soluções mais seguras
 */

export interface SecureAuthState {
  isAuthenticated: boolean;
  hasSubscription: boolean;
  userEmail: string | null;
  userType: 'vip' | 'member' | null;
  source: 'session' | 'firebase' | 'api' | 'none';
  timestamp: number;
}

export interface SecureAccessResult {
  hasAccess: boolean;
  reason: string;
  shouldRedirect: boolean;
  redirectTo?: string;
  authState: SecureAuthState;
}

/**
 * 🔒 VERIFICAÇÃO SEGURA DE AUTENTICAÇÃO
 * Prioridade: sessionStorage > Firebase > API > localStorage (fallback)
 */
export async function getSecureAuthState(
  firebaseUser: any,
  userProfile: any,
  contextAuth: boolean,
  contextEmail: string | null,
  contextUserType: 'vip' | 'member' | null
): Promise<SecureAuthState> {
  
  // 1. 🥇 PRIORIDADE 1: sessionStorage (mais seguro, expira com sessão)
  if (typeof window !== 'undefined') {
    const sessionAuth = sessionStorage.getItem('secureAuth');
    if (sessionAuth) {
      try {
        const parsed = JSON.parse(sessionAuth);
        const isRecent = (Date.now() - parsed.timestamp) < 30 * 60 * 1000; // 30 min
        
        if (isRecent && parsed.isAuthenticated && parsed.userEmail) {
          return {
            ...parsed,
            source: 'session',
            timestamp: Date.now()
          };
        } else {
          // Limpar dados expirados
          sessionStorage.removeItem('secureAuth');
        }
      } catch (error) {
        sessionStorage.removeItem('secureAuth');
      }
    }
  }

  // 2. 🥈 PRIORIDADE 2: Firebase User (mais confiável)
  if (firebaseUser?.email) {
    const hasSubscription = userProfile?.isSubscriber === true || 
                           userProfile?.subscriptionStatus === 'active';
    
    const authState: SecureAuthState = {
      isAuthenticated: true,
      hasSubscription,
      userEmail: firebaseUser.email,
      userType: hasSubscription ? 'member' : null,
      source: 'firebase',
      timestamp: Date.now()
    };

    // Salvar no sessionStorage para próximas verificações
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('secureAuth', JSON.stringify(authState));
    }

    return authState;
  }

  // 3. 🥉 PRIORIDADE 3: Verificação via API (servidor)
  if (contextEmail) {
    try {
      const response = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkSubscription',
          customerEmail: contextEmail
        })
      });

      if (response.ok) {
        const data = await response.json();
        const hasSubscription = data.success && (data.isSubscriber || data.hasActiveSubscription);
        
        const authState: SecureAuthState = {
          isAuthenticated: true,
          hasSubscription,
          userEmail: contextEmail,
          userType: hasSubscription ? 'member' : null,
          source: 'api',
          timestamp: Date.now()
        };

        // Salvar no sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('secureAuth', JSON.stringify(authState));
        }

        return authState;
      }
    } catch (error) {
      console.error('Erro na verificação via API:', error);
    }
  }

  // 4. 🔄 FALLBACK: localStorage (apenas se necessário)
  if (typeof window !== 'undefined') {
    const localAuth = localStorage.getItem('isAuthenticated') === 'true';
    const localEmail = localStorage.getItem('userEmail');
    const localSubscription = localStorage.getItem('hasSubscription') === 'true';

    if (localAuth && localEmail) {
      return {
        isAuthenticated: true,
        hasSubscription: localSubscription,
        userEmail: localEmail,
        userType: localSubscription ? 'member' : null,
        source: 'session', // Mentir sobre a fonte para não confundir
        timestamp: Date.now()
      };
    }
  }

  // 5. 🚫 NENHUMA AUTENTICAÇÃO ENCONTRADA
  return {
    isAuthenticated: false,
    hasSubscription: false,
    userEmail: null,
    userType: null,
    source: 'none',
    timestamp: Date.now()
  };
}

/**
 * 🔐 VERIFICAÇÃO DE ACESSO À GALERIA
 */
export async function checkSecureGalleryAccess(
  firebaseUser: any,
  userProfile: any,
  contextAuth: boolean,
  contextEmail: string | null,
  contextUserType: 'vip' | 'member' | null
): Promise<SecureAccessResult> {
  
  const authState = await getSecureAuthState(
    firebaseUser,
    userProfile,
    contextAuth,
    contextEmail,
    contextUserType
  );

  console.log('🔒 [SecureAuth] Estado da autenticação:', authState);

  // Não autenticado
  if (!authState.isAuthenticated || !authState.userEmail) {
    return {
      hasAccess: false,
      reason: 'Usuário não autenticado',
      shouldRedirect: true,
      redirectTo: '/auth/face',
      authState
    };
  }

  // Sem assinatura
  if (!authState.hasSubscription) {
    return {
      hasAccess: false,
      reason: 'Usuário sem assinatura ativa',
      shouldRedirect: true,
      redirectTo: '/assinante',
      authState
    };
  }

  // ✅ Acesso liberado
  return {
    hasAccess: true,
    reason: 'Acesso autorizado',
    shouldRedirect: false,
    authState
  };
}

/**
 * 💾 SALVAR AUTENTICAÇÃO SEGURA (após login/pagamento)
 */
export function setSecureAuth(
  userEmail: string,
  hasSubscription: boolean,
  userType: 'vip' | 'member' = 'member'
) {
  const authState: SecureAuthState = {
    isAuthenticated: true,
    hasSubscription,
    userEmail,
    userType,
    source: 'session',
    timestamp: Date.now()
  };

  if (typeof window !== 'undefined') {
    // 1. sessionStorage (principal)
    sessionStorage.setItem('secureAuth', JSON.stringify(authState));
    
    // 2. localStorage (fallback temporário)
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('hasSubscription', hasSubscription.toString());
    localStorage.setItem('userEmail', userEmail);
    localStorage.setItem('userType', userType);
    
    // 3. Cookies (para middleware)
    const maxAge = 8 * 60 * 60; // 8 horas (não 30 dias!)
    document.cookie = `isAuthenticated=true; path=/; max-age=${maxAge}; SameSite=Strict`;
    document.cookie = `hasSubscription=${hasSubscription}; path=/; max-age=${maxAge}; SameSite=Strict`;
  }
}

/**
 * 🗑️ LIMPAR AUTENTICAÇÃO SEGURA (logout)
 */
export function clearSecureAuth() {
  if (typeof window !== 'undefined') {
    // Limpar sessionStorage
    sessionStorage.removeItem('secureAuth');
    
    // Limpar localStorage
    const keysToRemove = [
      'isAuthenticated', 'hasSubscription', 'userEmail', 'userType',
      'isSubscriber', 'subscriptionStatus', 'hasPaid'
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Limpar sessionStorage completamente
    sessionStorage.clear();
    
    // Limpar cookies
    const cookiesToClear = ['isAuthenticated', 'hasSubscription', 'userEmail', 'userType'];
    cookiesToClear.forEach(cookie => {
      document.cookie = `${cookie}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
  }
}

/**
 * 🔄 RENOVAR AUTENTICAÇÃO (chamado periodicamente)
 */
export async function refreshSecureAuth(firebaseUser: any, userProfile: any): Promise<boolean> {
  if (firebaseUser?.email) {
    const hasSubscription = userProfile?.isSubscriber === true || 
                           userProfile?.subscriptionStatus === 'active';
    
    setSecureAuth(firebaseUser.email, hasSubscription, hasSubscription ? 'member' : 'member');
    return true;
  }
  return false;
}
