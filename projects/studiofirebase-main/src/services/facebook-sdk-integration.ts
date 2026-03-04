'use client';

/**
 * Serviço de integração do Facebook SDK com o admin
 * Utiliza o Facebook SDK para login e obtenção de dados
 */

// Tipos para respostas do Facebook
interface FacebookAuthResponse {
    status: 'connected' | 'not_authorized' | 'unknown';
    authResponse?: {
        accessToken: string;
        expiresIn: string;
        signedRequest: string;
        userID: string;
        code?: string;
    };
    code?: string;
}

interface FacebookUser {
    id: string;
    name: string;
    email: string;
    picture?: {
        data: {
            url: string;
        };
    };
}

// Declarar tipos globais do Facebook SDK
declare global {
    interface Window {
        fbAsyncInit?: () => void;
        FB: any;
    }
}

export class FacebookSDKIntegration {
    private static isInitialized = false;
    private static appId = typeof window !== 'undefined'
        ? process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
        : '';

    private static ensureSecureContext(): void {
        if (typeof window === 'undefined') return;
        const { protocol, hostname } = window.location;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
        if (protocol !== 'https:' && !isLocalhost) {
            throw new Error('O login do Facebook exige HTTPS. Use um dominio HTTPS ou localhost.');
        }
    }

    /**
     * Inicializa o Facebook SDK carregando o script
     */
    static async initialize(): Promise<void> {
        if (typeof window === 'undefined') {
            console.error('[Facebook SDK] Window não disponível');
            return;
        }

        // Se o FB já existe e está pronto, apenas marcar como inicializado
        if (window.FB) {
            console.log('[Facebook SDK] FB já está carregado e pronto para uso');
            this.isInitialized = true;
            return Promise.resolve();
        }

        console.log('[Facebook SDK] Aguardando Facebook SDK carregar...');
        console.log('[Facebook SDK] Verificando se script facebook-jssdk existe:', !!document.getElementById('facebook-jssdk'));

        // Aguardar o SDK carregar (já está sendo carregado pelo layout.tsx)
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100; // 100 tentativas = 10 segundos

            const checkFB = setInterval(() => {
                attempts++;

                if (attempts % 10 === 0) {
                    console.log(`[Facebook SDK] Tentativa ${attempts}/${maxAttempts} - FB disponível: ${!!window.FB}`);
                }

                if (window.FB) {
                    console.log('[Facebook SDK] ✅ FB carregado com sucesso após', attempts * 100, 'ms');
                    clearInterval(checkFB);
                    this.isInitialized = true;
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error('[Facebook SDK] ❌ Timeout ao aguardar SDK carregar após', maxAttempts * 100, 'ms');
                    console.error('[Facebook SDK] Script existe:', !!document.getElementById('facebook-jssdk'));
                    console.error('[Facebook SDK] window.FB:', window.FB);
                    clearInterval(checkFB);
                    reject(new Error('Facebook SDK não carregou a tempo. Verifique sua conexão e recarregue a página.'));
                }
            }, 100); // Verificar a cada 100ms
        });
    }

    /**
     * Realiza o login com Facebook (verifica JWT Meta AI)
     */
    static async login(scope: string = 'email,public_profile'): Promise<FacebookAuthResponse> {
        await this.initialize();

        // Verificação de JWT Meta AI
        const jwt = typeof window !== 'undefined' ? (window.localStorage.getItem('meta_jwt') || window.sessionStorage.getItem('meta_jwt')) : undefined;
        function isValidJWT(token: string | undefined): boolean {
            return !!token && token.split('.').length === 3;
        }
        if (!isValidJWT(jwt)) {
            throw new Error('Sessão Meta AI inválida ou expirada. Faça login novamente.');
        }

        return new Promise((resolve, reject) => {
            try {
                this.ensureSecureContext();
                if (typeof window === 'undefined' || !window.FB) {
                    reject(new Error('Facebook SDK não está carregado'));
                    return;
                }
                window.FB.login(
                    (response: FacebookAuthResponse) => {
                        if (response.status === 'connected') {
                            resolve(response);
                        } else {
                            reject(new Error('Facebook login failed or was cancelled'));
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
     * Inicia o fluxo de Embedded Signup (WhatsApp Business App)
     */
    static async startEmbeddedSignup(configId: string): Promise<{ code: string | null }> {
        await this.initialize();

        if (!configId) {
            throw new Error('Config ID do Embedded Signup não configurado');
        }

        return new Promise((resolve, reject) => {
            try {
                this.ensureSecureContext();

                if (typeof window === 'undefined' || !window.FB) {
                    reject(new Error('Facebook SDK não está carregado'));
                    return;
                }

                window.FB.login(
                    (response: FacebookAuthResponse) => {
                        if (response?.status === 'connected') {
                            const code = response?.authResponse?.code || response?.code || null;
                            resolve({ code });
                            return;
                        }
                        reject(new Error('Embedded Signup cancelado ou falhou'));
                    },
                    {
                        config_id: configId,
                        response_type: 'code',
                        override_default_response_type: true,
                        scope: 'business_management,whatsapp_business_management,whatsapp_business_messaging',
                        extras: {
                            setup: {},
                            featureType: 'whatsapp_business_app_onboarding',
                            sessionInfoVersion: '3'
                        }
                    }
                );
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Faz logout do Facebook
     */
    static async logout(): Promise<void> {
        if (!this.isInitialized) return;

        return new Promise((resolve) => {
            try {
                // @ts-ignore
                FB.logout(() => {
                    resolve();
                });
            } catch (error) {
                console.error('Erro ao deslogar do Facebook:', error);
                resolve();
            }
        });
    }

    /**
     * Obtém o status de login atual
     */
    static async getLoginStatus(): Promise<FacebookAuthResponse> {
        await this.initialize();

        return new Promise((resolve) => {
            try {
                if (typeof window === 'undefined' || !window.FB) {
                    console.error('[Facebook SDK] FB não disponível em getLoginStatus');
                    resolve({ status: 'unknown' });
                    return;
                }

                window.FB.getLoginStatus((response: FacebookAuthResponse) => {
                    console.log('[Facebook SDK] Login status:', response);
                    resolve(response);
                });
            } catch (error) {
                console.error('[Facebook SDK] Erro ao obter status de login:', error);
                resolve({ status: 'unknown' });
            }
        });
    }

    /**
     * Obtém informações do usuário logado (verifica JWT Meta AI)
     */
    static async getUserInfo(): Promise<FacebookUser | null> {
        await this.initialize();

        // Verificação de JWT Meta AI
        const jwt = typeof window !== 'undefined' ? (window.localStorage.getItem('meta_jwt') || window.sessionStorage.getItem('meta_jwt')) : undefined;
        function isValidJWT(token: string | undefined): boolean {
            return !!token && token.split('.').length === 3;
        }
        if (!isValidJWT(jwt)) {
            throw new Error('Sessão Meta AI inválida ou expirada. Faça login novamente.');
        }

        return new Promise((resolve) => {
            try {
                if (typeof window === 'undefined' || !window.FB) {
                    console.error('[Facebook SDK] FB não disponível em getUserInfo');
                    resolve(null);
                    return;
                }
                window.FB.api(
                    '/me',
                    { fields: 'id,name,email,picture' },
                    (response: any) => {
                        if (response.error) {
                            console.error('[Facebook SDK] Erro ao obter informações do usuário:', response.error);
                            resolve(null);
                        } else {
                            console.log('[Facebook SDK] User info:', response);
                            resolve(response as FacebookUser);
                        }
                    }
                );
            } catch (error) {
                console.error('[Facebook SDK] Erro ao buscar dados do usuário:', error);
                resolve(null);
            }
        });
    }

    /**
     * Obtém as páginas do Facebook do usuário (verifica JWT Meta AI)
     */
    static async getUserPages(): Promise<any[]> {
        await this.initialize();

        // Verificação de JWT Meta AI
        const jwt = typeof window !== 'undefined' ? (window.localStorage.getItem('meta_jwt') || window.sessionStorage.getItem('meta_jwt')) : undefined;
        function isValidJWT(token: string | undefined): boolean {
            return !!token && token.split('.').length === 3;
        }
        if (!isValidJWT(jwt)) {
            throw new Error('Sessão Meta AI inválida ou expirada. Faça login novamente.');
        }

        return new Promise((resolve) => {
            try {
                // @ts-ignore
                FB.api(
                    '/me/accounts',
                    { fields: 'id,name,access_token,picture' },
                    (response: any) => {
                        if (response.error) {
                            console.error('Erro ao obter páginas:', response.error);
                            resolve([]);
                        } else {
                            resolve(response.data || []);
                        }
                    }
                );
            } catch (error) {
                console.error('Erro ao buscar páginas:', error);
                resolve([]);
            }
        });
    }

    /**
     * Faz uma requisição ao Facebook API (verifica JWT Meta AI)
     */
    static async api(
        path: string,
        params?: any,
        method: 'GET' | 'POST' | 'DELETE' = 'GET'
    ): Promise<any> {
        await this.initialize();

        // Verificação de JWT Meta AI
        const jwt = typeof window !== 'undefined' ? (window.localStorage.getItem('meta_jwt') || window.sessionStorage.getItem('meta_jwt')) : undefined;
        function isValidJWT(token: string | undefined): boolean {
            return !!token && token.split('.').length === 3;
        }
        if (!isValidJWT(jwt)) {
            throw new Error('Sessão Meta AI inválida ou expirada. Faça login novamente.');
        }

        return new Promise((resolve, reject) => {
            try {
                if (typeof window === 'undefined' || !window.FB) {
                    console.error('[Facebook SDK] FB não disponível em api');
                    reject(new Error('Facebook SDK não disponível'));
                    return;
                }
                window.FB.api(
                    path,
                    method,
                    params || {},
                    (response: any) => {
                        if (response.error) {
                            console.error(`[Facebook SDK] Erro na API ${path}:`, response.error);
                            reject(response.error);
                        } else {
                            console.log(`[Facebook SDK] Resposta da API ${path}:`, response);
                            resolve(response);
                        }
                    }
                );
            } catch (error) {
                console.error(`[Facebook SDK] Erro ao chamar API ${path}:`, error);
                reject(error);
            }
        });
    }
}
