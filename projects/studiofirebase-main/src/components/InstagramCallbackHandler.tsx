'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

/**
 * Componente que detecta callback do Instagram OAuth
 * Processa o code recebido e redireciona para a API
 */
export function InstagramCallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const code = searchParams?.get?.('code');
    const error = searchParams?.get?.('error');
    const errorDescription = searchParams?.get?.('error_description');

    // Se não há parâmetros de Instagram, não fazer nada
    if (!code && !error) {
      return;
    }

    console.log('[Instagram Callback Handler] Detectado callback do Instagram');

    // Se houve erro
    if (error) {
      console.error('[Instagram Callback Handler] Erro:', errorDescription);
      
      toast({
        variant: 'destructive',
        title: 'Erro ao conectar Instagram',
        description: errorDescription || 'Autorização negada',
      });

      // Redirecionar para integrations
      router.push('/admin/integrations?instagram_error=' + encodeURIComponent(errorDescription || 'Erro desconhecido'));
      return;
    }

    // Se recebeu o code, processar via API
    if (code) {
      console.log('[Instagram Callback Handler] Code recebido, processando...');

      // Mostrar loading
      toast({
        title: 'Conectando Instagram...',
        description: 'Processando autorização, aguarde...',
      });

      // Redirecionar para a API route que processa o token
      window.location.href = `/api/auth/instagram/callback?code=${code}`;
    }
  }, [searchParams, router, toast]);

  return null; // Componente invisível
}
