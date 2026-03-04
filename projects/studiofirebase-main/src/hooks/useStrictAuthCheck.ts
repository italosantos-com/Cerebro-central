"use client";

import { useEffect, useState, useCallback } from 'react';
import { useFaceIDAuth } from '@/contexts/face-id-auth-context';
import { useAuth } from '@/contexts/AuthProvider';
import { clearAuthData, checkForResidualData } from '@/lib/auth-cleanup';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export type StrictAuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

interface UseStrictAuthCheckOptions {
  revalidateDelayMs?: number;
}

export function useStrictAuthCheck(options: UseStrictAuthCheckOptions = {}) {
  const { revalidateDelayMs = 1500 } = options;
  const { isAuthenticated, userEmail } = useFaceIDAuth();
  const { user: firebaseUser, userProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [authStatus, setAuthStatus] = useState<StrictAuthStatus>('checking');

  const suspiciousPatterns = [/elon\s*musk/i, /test@/i, /example@/i];

  const evaluateAuth = useCallback(() => {
    try {
      const residualData = checkForResidualData();
      const localStorage_auth = localStorage.getItem('isAuthenticated') === 'true';
      const sessionStorage_auth = sessionStorage.getItem('isAuthenticated') === 'true';
      const context_auth = isAuthenticated;
      const hasUserEmail = !!(userEmail && userEmail.trim() !== '');
      const hasUserProfile = !!(userProfile && userProfile.email);
      const hasFirebaseUser = !!(firebaseUser && firebaseUser.email);

      const isAuthenticatedAnywhere = localStorage_auth || sessionStorage_auth || context_auth || hasFirebaseUser;
      const hasValidEmail = hasUserEmail || hasUserProfile || hasFirebaseUser;

      const hasSuspiciousData = Object.values(residualData.localStorage).some(value =>
        typeof value === 'string' && suspiciousPatterns.some(p => p.test(value))
      );

      if (hasSuspiciousData) {
        clearAuthData();
        setAuthStatus('unauthenticated');
        toast({
          variant: 'destructive',
          title: 'Dados Suspeitos Detectados',
          description: 'Dados de autenticação foram limpos por segurança.'
        });
        router.push('/auth/face');
        return;
      }

      if (!isAuthenticatedAnywhere || !hasValidEmail) {
        setAuthStatus('unauthenticated');
        return;
      }

      setAuthStatus('authenticated');
    } catch (e) {
      // Em caso de erro inesperado, marcar como não autenticado sem travar a aplicação.
      setAuthStatus('unauthenticated');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userEmail, userProfile, firebaseUser, router, toast]); // suspiciousPatterns é constante

  useEffect(() => {
    evaluateAuth();
    const timeout = setTimeout(evaluateAuth, revalidateDelayMs);
    return () => clearTimeout(timeout);
  }, [evaluateAuth, revalidateDelayMs]);

  const getUserEmail = useCallback(() => {
    if (authStatus !== 'authenticated') return '';
    const email = firebaseUser?.email || userProfile?.email || userEmail || localStorage.getItem('userEmail') || '';
    if (!email || email.trim() === '') return '';
    return email;
  }, [authStatus, firebaseUser?.email, userProfile?.email, userEmail]);

  const requireAuthOrRedirect = useCallback(() => {
    if (authStatus === 'authenticated') return true;
    toast({
      title: '🔐 Autenticação Necessária',
      description: 'Você precisa criar uma conta ou fazer login para continuar.',
      variant: 'destructive'
    });
    router.push('/auth/face');
    return false;
  }, [authStatus, router, toast]);

  return { authStatus, getUserEmail, requireAuthOrRedirect };
}
