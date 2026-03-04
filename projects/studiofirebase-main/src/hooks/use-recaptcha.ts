"use client";

import { useEffect, useState } from 'react';

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LchOQosAAAAAJHtFnbWvP4xhePZaVhg4NRd2cEj';

interface UseRecaptchaOptions {
    action: string;
}

interface UseRecaptchaReturn {
    isReady: boolean;
    executeRecaptcha: () => Promise<string | null>;
    error: string | null;
}

/**
 * Hook para usar reCAPTCHA Enterprise no cliente
 * 
 * @param options - Opções do reCAPTCHA
 * @returns Estado e função para executar o reCAPTCHA
 */
export function useRecaptcha({ action }: UseRecaptchaOptions): UseRecaptchaReturn {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Verificar se o grecaptcha já está carregado
        if (typeof window !== 'undefined' && window.grecaptcha?.enterprise) {
            setIsReady(true);
            return;
        }

        // Carregar o script do reCAPTCHA
        const script = document.createElement('script');
        script.src = `https://www.google.com/recaptcha/enterprise.js?render=${RECAPTCHA_SITE_KEY}`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            if (window.grecaptcha?.enterprise) {
                window.grecaptcha.enterprise.ready(() => {
                    console.log('[reCAPTCHA] SDK carregado e pronto');
                    setIsReady(true);
                });
            }
        };

        script.onerror = () => {
            console.error('[reCAPTCHA] Erro ao carregar SDK');
            setError('Falha ao carregar reCAPTCHA');
        };

        document.head.appendChild(script);

        return () => {
            // Cleanup não é necessário, o script permanece para uso posterior
        };
    }, []);

    const executeRecaptcha = async (): Promise<string | null> => {
        if (!isReady || !window.grecaptcha?.enterprise) {
            console.warn('[reCAPTCHA] SDK não está pronto ainda');
            return null;
        }

        try {
            const token = await window.grecaptcha.enterprise.execute(RECAPTCHA_SITE_KEY, {
                action: action,
            });

            console.log(`[reCAPTCHA] Token gerado para ação: ${action}`);
            return token;
        } catch (error) {
            console.error('[reCAPTCHA] Erro ao executar:', error);
            setError(error instanceof Error ? error.message : 'Erro desconhecido');
            return null;
        }
    };

    return {
        isReady,
        executeRecaptcha,
        error,
    };
}

/**
 * Executa reCAPTCHA e retorna token
 * Função helper para uso direto sem hook
 * 
 * @param action - Nome da ação
 * @returns Token do reCAPTCHA ou null
 */
export async function executeRecaptcha(action: string): Promise<string | null> {
    if (typeof window === 'undefined' || !window.grecaptcha?.enterprise) {
        console.error('[reCAPTCHA] SDK não está disponível');
        return null;
    }

    try {
        await new Promise<void>((resolve) => {
            if (window.grecaptcha?.enterprise) {
                window.grecaptcha.enterprise.ready(() => resolve());
            } else {
                resolve();
            }
        });

        if (!window.grecaptcha?.enterprise) {
            throw new Error('reCAPTCHA not available');
        }

        const token = await window.grecaptcha.enterprise.execute(RECAPTCHA_SITE_KEY, {
            action: action,
        });

        console.log(`[reCAPTCHA] Token gerado para ação: ${action}`);
        return token;
    } catch (error) {
        console.error('[reCAPTCHA] Erro ao executar:', error);
        return null;
    }
}

// Tipos globais para TypeScript
declare global {
    interface Window {
        grecaptcha?: {
            enterprise?: {
                ready: (callback: () => void) => void;
                execute: (siteKey: string, options: { action: string }) => Promise<string>;
                reset: () => void;
                render: (container: string | Element, options?: any) => number;
            };
        };
    }
}
