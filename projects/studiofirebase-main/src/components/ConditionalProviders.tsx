'use client';

import { FaceIDAuthProvider } from '@/contexts/face-id-auth-context';
import { AuthProvider } from '@/contexts/AuthProvider';
import Layout from '@/components/layout/layout';
import { usePathname } from 'next/navigation';
import { LocalizationProvider } from '@/contexts/LocalizationContext';
import { useEffect } from 'react';
import { isAdminRoutePath } from '@/config/admin-routes';

const CONDITIONAL_PROVIDERS_DEBUG_VERSION = '2025-12-15.1';

function isVerboseDebugEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_VERBOSE_DEBUG === 'true') {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem('verboseDebug') === 'true';
  } catch {
    return false;
  }
}

export function ConditionalProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAdminRoute = isAdminRoutePath(pathname);

  useEffect(() => {
    if (isVerboseDebugEnabled()) {
      console.info(`[ConditionalProviders] route decision (v=${CONDITIONAL_PROVIDERS_DEBUG_VERSION})`, {
        pathname,
        isAdminRoute
      });
    }
  }, [pathname, isAdminRoute]);

  // 🔒 Rotas admin não usam wrappers visuais/site, mas continuam com AuthProvider
  // para evitar crashes de hooks compartilhados (useAuth) em componentes comuns.
  if (isAdminRoute) {
    return (
      <AuthProvider>
        <LocalizationProvider>
          {children}
        </LocalizationProvider>
      </AuthProvider>
    );
  }

  // Para outras rotas, usar os providers normais
  return (
    <AuthProvider>
      <FaceIDAuthProvider>
        <LocalizationProvider>
          <Layout>
            {children}
          </Layout>
        </LocalizationProvider>
      </FaceIDAuthProvider>
    </AuthProvider>
  );
}
