'use client';

import { useCallback } from 'react';
import { InstagramSDKIntegration } from '@/services/instagram-sdk-integration';

/**
 * Hook para integração do Instagram no admin
 * Fornece métodos para login, logout e gerenciamento da conta Instagram
 */
export function useInstagramIntegration() {
    const initialize = useCallback(async () => {
        try {
            await InstagramSDKIntegration.initialize();
            return true;
        } catch (error) {
            console.error('Erro ao inicializar Instagram:', error);
            return false;
        }
    }, []);

    const login = useCallback(async (scope?: string) => {
        try {
            const response = await InstagramSDKIntegration.login(scope);
            if (response.status === 'connected' && response.accessToken) {
                return {
                    success: true,
                    accessToken: response.accessToken,
                    userID: response.userID,
                };
            }
            return { success: false, error: 'Falha ao conectar com Instagram' };
        } catch (error) {
            console.error('Erro ao fazer login com Instagram:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erro desconhecido',
            };
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await InstagramSDKIntegration.logout();
            return true;
        } catch (error) {
            console.error('Erro ao deslogar do Instagram:', error);
            return false;
        }
    }, []);

    const getProfile = useCallback(async (accessToken: string) => {
        try {
            const profile = await InstagramSDKIntegration.getInstagramProfile(accessToken);
            return profile;
        } catch (error) {
            console.error('Erro ao obter perfil:', error);
            return null;
        }
    }, []);

    const getMedia = useCallback(
        async (accessToken: string, userId?: string, limit?: number) => {
            try {
                const media = await InstagramSDKIntegration.getInstagramMedia(accessToken, userId, limit);
                return media;
            } catch (error) {
                console.error('Erro ao obter mídia:', error);
                return [];
            }
        },
        []
    );

    const publishMedia = useCallback(
        async (accessToken: string, userId: string, imageUrl: string, caption: string) => {
            try {
                const result = await InstagramSDKIntegration.publishMedia(accessToken, userId, imageUrl, caption);
                return result;
            } catch (error) {
                console.error('Erro ao publicar:', error);
                return null;
            }
        },
        []
    );

    const getInsights = useCallback(
        async (accessToken: string, userId: string, metric?: string) => {
            try {
                const insights = await InstagramSDKIntegration.getInstagramInsights(accessToken, userId, metric);
                return insights;
            } catch (error) {
                console.error('Erro ao obter insights:', error);
                return [];
            }
        },
        []
    );

    const replyToComment = useCallback(
        async (accessToken: string, commentId: string, message: string) => {
            try {
                const result = await InstagramSDKIntegration.replyToComment(accessToken, commentId, message);
                return result;
            } catch (error) {
                console.error('Erro ao responder comentário:', error);
                return null;
            }
        },
        []
    );

    const getMessages = useCallback(
        async (accessToken: string, userId: string, limit?: number) => {
            try {
                const messages = await InstagramSDKIntegration.getInstagramMessages(accessToken, userId, limit);
                return messages;
            } catch (error) {
                console.error('Erro ao obter mensagens:', error);
                return [];
            }
        },
        []
    );

    const sendMessage = useCallback(
        async (accessToken: string, conversationId: string, message: string) => {
            try {
                const result = await InstagramSDKIntegration.sendMessage(accessToken, conversationId, message);
                return result;
            } catch (error) {
                console.error('Erro ao enviar mensagem:', error);
                return null;
            }
        },
        []
    );

    const apiCall = useCallback(
        async (path: string, params?: any, method?: 'GET' | 'POST' | 'DELETE') => {
            try {
                const response = await InstagramSDKIntegration.api(path, params, method);
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
        getProfile,
        getMedia,
        publishMedia,
        getInsights,
        replyToComment,
        getMessages,
        sendMessage,
        apiCall,
    };
}
