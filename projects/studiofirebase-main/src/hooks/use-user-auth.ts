import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthProvider';

export function useUserAuth() {
  const { user, userProfile, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  // Função para limpar todos os dados
  const clearAllData = useCallback(() => {
    // Limpar localStorage (exceto configurações que devem persistir)
    const keysToKeep = ['theme', 'language', 'ageConfirmed'];
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !keysToKeep.includes(key)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    // Limpar sessionStorage
    sessionStorage.clear();
    // Limpar cookies de autenticação
    const authCookies = ['adminAuthenticated', 'adminUser', 'userSession', 'authToken'];
    authCookies.forEach(cookieName => {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
  }, []);

  // Função de logout
  const handleLogout = useCallback(async () => {
    try {
      toast({
        title: 'Saindo...',
        description: 'Aguarde um momento.',
      });
      // Fazer logout do contexto de autenticação
      await logout();

      // Limpar dados locais
      clearAllData();
      toast({
        title: 'Logout realizado',
        description: 'Você foi desconectado com sucesso.',
      });
      router.push('/');
    } catch (error) {
      // Mesmo com erro, limpar dados locais
      clearAllData();
      toast({
        variant: 'destructive',
        title: 'Erro ao sair',
        description: 'Não foi possível fazer logout. Tente novamente.',
      });
      router.push('/');
    }
  }, [logout, router, toast, clearAllData]);

  // Verificar autenticação na inicialização
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // Sistema de limpeza de cache usando APIs padrão do navegador
  useEffect(() => {
    let isNavigating = false;
    let hasInteracted = false;
    let lastActivity = Date.now();
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos

    // Detectar interação do usuário
    const handleUserActivity = () => {
      hasInteracted = true;
      lastActivity = Date.now();
    };

    // Detectar navegação interna (Next.js)
    const handleNavigationStart = () => {
      isNavigating = true;
    };

    const handleNavigationEnd = () => {
      setTimeout(() => {
        isNavigating = false;
      }, 100);
    };

    // Detectar quando o usuário realmente sai do site (Page Visibility API)
    const handlePageHide = (event: PageTransitionEvent) => {
      // Se não está navegando internamente e o usuário interagiu
      if (!isNavigating && hasInteracted) {
        // Verificar se foi inatividade prolongada
        const timeSinceLastActivity = Date.now() - lastActivity;
        if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
          clearAllData();
        } else {
          // Usuário saiu ativamente do site
          clearAllData();
        }
      }
    };

    // Detectar fechamento da aba/janela (beforeunload)
    const handleBeforeUnload = () => {
      if (hasInteracted) {
        clearAllData();
      }
    };

    // Event listeners para interação do usuário
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Event listeners para navegação
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    // Detectar navegação do Next.js
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      handleNavigationStart();
      const result = originalPushState.apply(this, args);
      handleNavigationEnd();
      return result;
    };

    history.replaceState = function (...args) {
      handleNavigationStart();
      const result = originalReplaceState.apply(this, args);
      handleNavigationEnd();
      return result;
    };

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      // Restaurar funções originais
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [clearAllData]);
  return {
    user,
    userProfile,
    isLoading,
    handleLogout,
    clearAllData
  };
}
