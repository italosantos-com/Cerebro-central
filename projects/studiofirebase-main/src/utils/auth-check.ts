/**
 * Utilitário para verificação simplificada de autenticação
 * Usado nos componentes de pagamento para verificar se o usuário está logado
 */

export interface AuthCheckResult {
  isAuthenticated: boolean;
  hasEmail: boolean;
  isValid: boolean;
}

export function checkUserAuthentication(
  isAuthenticated: boolean,
  userEmail: string | null,
  userProfile: any,
  firebaseUser: any
): AuthCheckResult {
  // Verificar múltiplas fontes de autenticação
  const localStorage_auth = typeof window !== 'undefined' && localStorage.getItem('isAuthenticated') === 'true';
  const context_auth = isAuthenticated;
  const hasFirebaseUser = firebaseUser && firebaseUser.email;
  const hasUserProfile = userProfile && userProfile.email;
  const hasUserEmail = userEmail && userEmail.trim() !== '';
  

  
  // Critérios simplificados: qualquer forma de autenticação válida
  const isUserAuthenticated = localStorage_auth || context_auth || hasFirebaseUser;
  const hasEmail = hasUserEmail || hasUserProfile || hasFirebaseUser;
  const isValid = isUserAuthenticated && hasEmail;
  
  return {
    isAuthenticated: isUserAuthenticated,
    hasEmail,
    isValid
  };
}

export function showAuthError(toast: any, router: any) {
  toast({
    variant: 'destructive',
    title: 'Login necessário',
    description: 'Faça login para acessar os pagamentos.'
  });
  
  // Redirecionar após pequeno delay
  setTimeout(() => {
    router.push('/auth/face');
  }, 2000);
}
