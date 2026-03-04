"use client";

import { useEffect, useState, useCallback } from 'react';

// Declare types for window.grecaptcha
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



interface UseRecaptchaEnterpriseOptions {
    action: string;
    containerSelector?: string;
    invisible?: boolean;
}

interface UseRecaptchaEnterpriseReturn {
    isReady: boolean;
    executeRecaptcha: () => Promise<string | null>;
    resetRecaptcha: () => void;
    error: string | null;
    isLoading: boolean;
    widgetId?: number;
}

/**
 * Hook unificado para reCAPTCHA Enterprise
 * Suporta tanto invisible quanto visible widgets
 * 
 * @param options - Configurações do reCAPTCHA
 * @returns Estado e funções para controlar o reCAPTCHA
 */

// Componente removido: não usar mais reCAPTCHA Enterprise
export function useRecaptchaEnterprise() {
    return {
        isReady: false,
        executeRecaptcha: async () => null,
        resetRecaptcha: () => {},
        error: 'reCAPTCHA Enterprise removido',
        isLoading: false
    };
}

/**
 * Hooks simplificados para ações comuns
 */
export function useRecaptchaLogin() {
    return useRecaptchaEnterprise();
}

export function useRecaptchaRegister() {
    return useRecaptchaEnterprise();
}

export function useRecaptchaSubmit() {
    return useRecaptchaEnterprise();
}

export function useRecaptchaPhone() {
    return useRecaptchaEnterprise();
}

// Função utilitária para verificar token no servidor
export async function verifyRecaptchaToken(token: string, expectedAction: string, userIP?: string) {
    try {
        const response = await fetch('/api/recaptcha/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token,
                expectedAction,
                userIP
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        return result;

    } catch (error) {
        console.error('[reCAPTCHA Enterprise] Erro na verificação:', error);
        return {
            success: false,
            score: 0,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
        };
    }
}

// Compatibilidade com código existente
// Usar apenas o hook padrão userecaptcha