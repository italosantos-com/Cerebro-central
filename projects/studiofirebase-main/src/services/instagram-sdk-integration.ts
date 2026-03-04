'use client';

/**
 * Serviço de integração do Instagram API com Instagram Login
 * Utiliza o Facebook SDK para autenticação e oferece métodos para gerenciar conta Instagram
 */

import { FacebookSDKIntegration } from './facebook-sdk-integration';

// Tipos para Instagram
interface InstagramAuthResponse {
    status: 'connected' | 'not_authorized' | 'unknown';
    accessToken?: string;
    userID?: string;
}

interface InstagramUser {
    id: string;
    username: string;
    name: string;
    biography: string;
    profile_picture_url: string;
    website: string;
    ig_id: string;
}

interface InstagramMedia {
    id: string;
    caption: string;
    media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
    media_url: string;
    timestamp: string;
    like_count: number;
    comments_count: number;
}

interface InstagramInsights {
    id: string;
    name: string;
    period: string;
    values: Array<{ value: number }>;
    total_value: number;
}

export class InstagramSDKIntegration {
    private static isInitialized = false;
    private static appId = typeof window !== 'undefined'
        ? process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
        : '';

    /**
     * Inicializa o Instagram SDK (utiliza Facebook SDK)
     */
    static async initialize(): Promise<void> {
        if (this.isInitialized) return;
        await FacebookSDKIntegration.initialize();
        this.isInitialized = true;
    }

    /**
     * Faz login com Instagram
     * Retorna access_token que permite operações no Instagram
     */
    static async login(scope: string = 'instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages,instagram_business_manage_comments'): Promise<InstagramAuthResponse> {
        await this.initialize();

        return new Promise((resolve, reject) => {
            try {
                // @ts-ignore
                window.FB.login(
                    (response: any) => {
                        if (response.status === 'connected' && response.authResponse) {
                            resolve({
                                status: 'connected',
                                accessToken: response.authResponse.accessToken,
                                userID: response.authResponse.userID,
                            });
                        } else {
                            reject(new Error('Instagram login failed or was cancelled'));
                        }
                    },
                    { scope }
                );
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Faz logout do Instagram
     */
    static async logout(): Promise<void> {
        if (!this.isInitialized) return;
        await FacebookSDKIntegration.logout();
    }

    /**
     * Obtém informações do perfil do Instagram
     */
    static async getInstagramProfile(accessToken: string): Promise<InstagramUser | null> {
        return new Promise((resolve) => {
            try {
                // @ts-ignore
                window.FB.api(
                    '/me',
                    {
                        fields: 'id,username,name,biography,profile_picture_url,website,ig_id',
                        access_token: accessToken,
                    },
                    (response: any) => {
                        if (response.error) {
                            console.error('Erro ao obter perfil do Instagram:', response.error);
                            resolve(null);
                        } else {
                            resolve(response as InstagramUser);
                        }
                    }
                );
            } catch (error) {
                console.error('Erro ao buscar perfil:', error);
                resolve(null);
            }
        });
    }

    /**
     * Obtém mídia (posts/fotos) do Instagram
     */
    static async getInstagramMedia(
        accessToken: string,
        userId?: string,
        limit: number = 10
    ): Promise<InstagramMedia[]> {
        return new Promise((resolve) => {
            try {
                const path = userId ? `/${userId}/media` : '/me/media';

                // @ts-ignore
                window.FB.api(
                    path,
                    {
                        fields: 'id,caption,media_type,media_url,timestamp,like_count,comments_count',
                        limit,
                        access_token: accessToken,
                    },
                    (response: any) => {
                        if (response.error) {
                            console.error('Erro ao obter mídia:', response.error);
                            resolve([]);
                        } else {
                            resolve((response.data || []) as InstagramMedia[]);
                        }
                    }
                );
            } catch (error) {
                console.error('Erro ao buscar mídia:', error);
                resolve([]);
            }
        });
    }

    /**
     * Publica uma imagem/vídeo no Instagram
     */
    static async publishMedia(
        accessToken: string,
        userId: string,
        imageUrl: string,
        caption: string
    ): Promise<{ id: string } | null> {
        return new Promise((resolve) => {
            try {
                // @ts-ignore
                window.FB.api(
                    `/${userId}/media`,
                    'POST',
                    {
                        image_url: imageUrl,
                        caption,
                        access_token: accessToken,
                    },
                    (response: any) => {
                        if (response.error) {
                            console.error('Erro ao publicar:', response.error);
                            resolve(null);
                        } else {
                            resolve(response);
                        }
                    }
                );
            } catch (error) {
                console.error('Erro ao publicar media:', error);
                resolve(null);
            }
        });
    }

    /**
     * Obtém insights (estatísticas) da conta Instagram
     */
    static async getInstagramInsights(
        accessToken: string,
        userId: string,
        metric: string = 'impressions,reach,profile_views'
    ): Promise<InstagramInsights[]> {
        return new Promise((resolve) => {
            try {
                // @ts-ignore
                window.FB.api(
                    `/${userId}/insights`,
                    {
                        metric,
                        period: 'day',
                        access_token: accessToken,
                    },
                    (response: any) => {
                        if (response.error) {
                            console.error('Erro ao obter insights:', response.error);
                            resolve([]);
                        } else {
                            resolve((response.data || []) as InstagramInsights[]);
                        }
                    }
                );
            } catch (error) {
                console.error('Erro ao buscar insights:', error);
                resolve([]);
            }
        });
    }

    /**
     * Responde a comentários no Instagram
     */
    static async replyToComment(
        accessToken: string,
        commentId: string,
        message: string
    ): Promise<{ id: string } | null> {
        return new Promise((resolve) => {
            try {
                // @ts-ignore
                window.FB.api(
                    `/${commentId}/replies`,
                    'POST',
                    {
                        message,
                        access_token: accessToken,
                    },
                    (response: any) => {
                        if (response.error) {
                            console.error('Erro ao responder comentário:', response.error);
                            resolve(null);
                        } else {
                            resolve(response);
                        }
                    }
                );
            } catch (error) {
                console.error('Erro ao responder comentário:', error);
                resolve(null);
            }
        });
    }

    /**
     * Obtém mensagens diretas (DMs)
     */
    static async getInstagramMessages(
        accessToken: string,
        userId: string,
        limit: number = 10
    ): Promise<any[]> {
        return new Promise((resolve) => {
            try {
                // @ts-ignore
                window.FB.api(
                    `/${userId}/conversations`,
                    {
                        fields: 'id,participants,senders,snippet,updated_time',
                        limit,
                        access_token: accessToken,
                    },
                    (response: any) => {
                        if (response.error) {
                            console.error('Erro ao obter mensagens:', response.error);
                            resolve([]);
                        } else {
                            resolve((response.data || []) as any[]);
                        }
                    }
                );
            } catch (error) {
                console.error('Erro ao buscar mensagens:', error);
                resolve([]);
            }
        });
    }

    /**
     * Envia mensagem direta
     */
    static async sendMessage(
        accessToken: string,
        conversationId: string,
        message: string
    ): Promise<{ id: string } | null> {
        return new Promise((resolve) => {
            try {
                // @ts-ignore
                window.FB.api(
                    `/${conversationId}/messages`,
                    'POST',
                    {
                        message,
                        access_token: accessToken,
                    },
                    (response: any) => {
                        if (response.error) {
                            console.error('Erro ao enviar mensagem:', response.error);
                            resolve(null);
                        } else {
                            resolve(response);
                        }
                    }
                );
            } catch (error) {
                console.error('Erro ao enviar mensagem:', error);
                resolve(null);
            }
        });
    }

    /**
     * Chamada genérica à Instagram Graph API
     */
    static async api(
        path: string,
        params?: any,
        method: 'GET' | 'POST' | 'DELETE' = 'GET'
    ): Promise<any> {
        await this.initialize();

        return new Promise((resolve, reject) => {
            try {
                // @ts-ignore
                window.FB.api(path, method, params || {}, (response: any) => {
                    if (response.error) {
                        reject(response.error);
                    } else {
                        resolve(response);
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }
}
