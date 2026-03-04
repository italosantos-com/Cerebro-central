'use client';

import { useCallback } from 'react';
import { FacebookSDKIntegration } from '@/services/facebook-sdk-integration';

/**
 * Hook para integração do Facebook no admin
 * Fornece métodos para login, logout e gerenciamento da sessão
 */
export function useFacebookIntegration() {
    const initialize = useCallback(async () => {
        try {
            await FacebookSDKIntegration.initialize();
            return true;
        } catch (error) {
            console.error('Erro ao inicializar Facebook:', error);
            return false;
        }
    }, []);

    const login = useCallback(async (scope?: string) => {
        try {
            const response = await FacebookSDKIntegration.login(scope);
            if (response.status === 'connected' && response.authResponse) {
                return {
                    success: true,
                    accessToken: response.authResponse.accessToken,
                    userID: response.authResponse.userID,
                };
            }
            return { success: false, error: 'Falha ao conectar com Facebook' };
        } catch (error) {
            console.error('Erro ao fazer login com Facebook:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido',
            };
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await FacebookSDKIntegration.logout();
            return true;
        } catch (error) {
            console.error('Erro ao deslogar do Facebook:', error);
            return false;
        }
    }, []);

    const getLoginStatus = useCallback(async () => {
        try {
            const status = await FacebookSDKIntegration.getLoginStatus();
            return status;
        } catch (error) {
            console.error('Erro ao obter status de login:', error);
            return { status: 'unknown' };
        }
    }, []);

    const getUserInfo = useCallback(async () => {
        try {
            const userInfo = await FacebookSDKIntegration.getUserInfo();
            return userInfo;
        } catch (error) {
            console.error('Erro ao obter informações do usuário:', error);
            return null;
        }
    }, []);

    const getUserPages = useCallback(async () => {
        try {
            const pages = await FacebookSDKIntegration.getUserPages();
            return pages;
        } catch (error) {
            console.error('Erro ao obter páginas:', error);
            return [];
        }
    }, []);

    const apiCall = useCallback(
        async (path: string, params?: any, method?: 'GET' | 'POST' | 'DELETE') => {
            try {
                const response = await FacebookSDKIntegration.api(path, params, method);
                return response;
            } catch (error) {
                console.error('Erro ao fazer chamada de API:', error);
                throw error;
            }
        },
        []
    );

    return {
        initialize,
        login,
        logout,
        getLoginStatus,
        getUserInfo,
        getUserPages,
        apiCall,
    };
}
