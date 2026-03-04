"use client";

import { useEffect, useState, useCallback } from 'react';

/**
 * Hook simplificado para reCAPTCHA v2 Checkbox
 * Carrega o script automaticamente e fornece o token
 */
export function useRecaptchaV2(action: string = 'submit') {
  const [isReady, setIsReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    // Carregar script do reCAPTCHA se ainda não estiver carregado
    if (!siteKey) {
      setError('RECAPTCHA_SITE_KEY não configurado');
      return;
    }

    if ((window as any).grecaptcha) {
      setIsReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsReady(true);
    };
    script.onerror = () => {
      setError('Erro ao carregar reCAPTCHA');
    };
    document.head.appendChild(script);

    return () => {
      // Não remover script, mantém em cache
    };
  }, [siteKey]);

  const executeRecaptcha = useCallback(async (customAction?: string): Promise<string | null> => {
    if (!isReady || !siteKey) {
      setError('reCAPTCHA não está pronto');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const grecaptcha = (window as any).grecaptcha;
      if (!grecaptcha) {
        setError('reCAPTCHA não disponível');
        return null;
      }

      const recaptchaToken = await grecaptcha.execute(siteKey, {
        action: customAction || action,
      });

      setToken(recaptchaToken);
      return recaptchaToken;
    } catch (err: any) {
      const errorMsg = err?.message || 'Erro ao executar reCAPTCHA';
      setError(errorMsg);
      console.error('[useRecaptchaV2] Erro:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isReady, siteKey, action]);

  const resetRecaptcha = useCallback(() => {
    setToken(null);
    setError(null);
  }, []);

  return {
    isReady,
    token,
    error,
    isLoading,
    executeRecaptcha,
    resetRecaptcha,
  };
}

/**
 * Verificar token do reCAPTCHA v2 no servidor
 */
export async function verifyRecaptchaTokenV2(token: string): Promise<{
  success: boolean;
  valid: boolean;
  score?: number;
  error?: string;
}> {
  try {
    if (!token) {
      return {
        success: false,
        valid: false,
        error: 'Token não fornecido',
      };
    }

    const response = await fetch('/api/recaptcha/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        action: 'submit',
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        valid: false,
        error: `HTTP ${response.status}`,
      };
    }

    const result = await response.json();
    return {
      success: result.success || false,
      valid: result.valid || false,
      score: result.score,
      error: result.error,
    };
  } catch (error: any) {
    console.error('[verifyRecaptchaTokenV2] Erro:', error);
    return {
      success: false,
      valid: false,
      error: error.message || 'Erro ao verificar reCAPTCHA',
    };
  }
}
