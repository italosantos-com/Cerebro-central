'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFaceIDAuth } from '@/contexts/face-id-auth-context';
import { useAuth } from '@/contexts/AuthProvider';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresAuth?: boolean;
  requiresSubscription?: boolean;
  redirectTo?: string;
  fallbackComponent?: React.ReactNode;
}

export default function ProtectedRoute({
  children,
  requiresAuth = true,
  requiresSubscription = false,
  redirectTo = '/auth/face',
  fallbackComponent
}: ProtectedRouteProps) {
  const { isAuthenticated, userType } = useFaceIDAuth();
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        // Verificar autenticação básica (Face ID OU Firebase Auth válido)
        const isAuthenticatedAny = isAuthenticated || !!user;
        if (requiresAuth && !isAuthenticatedAny) {
          console.log('🚫 ProtectedRoute: Usuário não autenticado');
          setIsLoading(false);
          router.replace(redirectTo);
          return;
        }

        // Verificar se requer assinatura
        if (requiresSubscription) {
          if (!isAuthenticatedAny) {
            console.log('🚫 ProtectedRoute: Usuário não autenticado para conteúdo premium');
            setIsLoading(false);
            router.replace('/auth/face');
            return;
          }

          // Verificar se tem assinatura ativa
          const hasActiveSubscription = await checkSubscriptionStatus();
          if (!hasActiveSubscription) {
            console.log('🚫 ProtectedRoute: Usuário sem assinatura ativa');
            setIsLoading(false);
            router.replace('/assinante');
            return;
          }
        }

        console.log('✅ ProtectedRoute: Acesso autorizado');
        setIsAuthorized(true);
        setIsLoading(false);
      } catch (error) {
        console.error('❌ Erro ao verificar autorização:', error);
        setIsLoading(false);
        router.replace(redirectTo);
      }
    };

    checkAuthorization();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userType, requiresAuth, requiresSubscription, router, redirectTo]); // checkSubscriptionStatus e user são estáveis

  // Função para verificar status da assinatura
  const checkSubscriptionStatus = async (): Promise<boolean> => {
    try {
      // Verificar localStorage primeiro
      const hasSubscription = localStorage.getItem('hasSubscription') === 'true';
      const subscriptionExpiry = localStorage.getItem('subscriptionExpiry');

      if (hasSubscription && subscriptionExpiry) {
        const expiryDate = new Date(subscriptionExpiry);
        const now = new Date();

        if (expiryDate > now) {
          // Definir cookie para middleware
          document.cookie = `hasSubscription=true; path=/; max-age=${Math.floor((expiryDate.getTime() - now.getTime()) / 1000)}`;
          return true;
        } else {
          // Assinatura expirada
          localStorage.removeItem('hasSubscription');
          localStorage.removeItem('subscriptionExpiry');
          document.cookie = 'hasSubscription=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
      }

      // Se for VIP, considerar como assinatura ativa
      if (userType === 'vip') {
        localStorage.setItem('hasSubscription', 'true');
        // VIP não expira (ou expira em 1 ano)
        const vipExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        localStorage.setItem('subscriptionExpiry', vipExpiry);
        document.cookie = `hasSubscription=true; path=/; max-age=${365 * 24 * 60 * 60}`;
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Erro ao verificar assinatura:', error);
      return false;
    }
  };

  // Loading state
  if (isLoading) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Se não autorizado, não renderizar nada (o redirecionamento já foi feito)
  if (!isAuthorized) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecionando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
