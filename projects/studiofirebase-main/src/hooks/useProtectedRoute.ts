'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthProvider';

interface UseProtectedRouteOptions {
  redirectTo?: string;
  requireAuth?: boolean;
}

export function useProtectedRoute({
  redirectTo = '/login',
  requireAuth = true
}: UseProtectedRouteOptions = {}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user) {
        router.push(redirectTo);
      } else if (!requireAuth && user) {
        router.push('/perfil');
      }
    }
  }, [user, loading, router, redirectTo, requireAuth]);

  return { user, loading };
}

export function useRequireAuth() {
  return useProtectedRoute({ requireAuth: true });
}

export function useRequireGuest() {
  return useProtectedRoute({ requireAuth: false, redirectTo: '/perfil' });
}
