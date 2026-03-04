/**
 * Meta SDK Integration Service
 * Handles Facebook and Instagram authentication via popup
 * Collects: name/nickname, profile photo, email (or generates random)
 */

// Facebook SDK types
interface FacebookStatusResponse {
    status: 'connected' | 'not_authorized' | 'unknown';
    authResponse?: {
        accessToken: string;
        expiresIn: string;
        signedRequest: string;
        userID: string;
    };
}

interface MetaUserProfile {
    id: string;
    name: string;
    email: string;
    picture?: string;
    platform: 'facebook' | 'instagram';
}

interface FacebookUserData {
    id: string;
    name: string;
    email?: string;
    picture?: {
        data: {
            url: string;
        };
    };
}

interface InstagramUserData {
    id: string;
    username: string;
    account_type?: string;
    media_count?: number;
}

// Instagram Business Login OAuth types
interface InstagramOAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scope: string[];
}

interface InstagramAuthCodeResponse {
    code: string;
    state?: string;
}

interface InstagramTokenResponse {
    access_token: string;
    user_id: string;
    permissions: string;
}

interface InstagramLongLivedTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

class MetaSDKIntegration {
    private appId: string;
    private instagramAppId: string;
    private instagramAppSecret: string;
    private instagramRedirectUri: string;
    private instagramScopes: string[];

    constructor() {
        this.appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';
        this.instagramAppId = '737697635744491';
        this.instagramAppSecret = process.env.INSTAGRAM_APP_SECRET || '';
        this.instagramRedirectUri = 'https://italosantos.com/';

        // Scopes para Instagram Business Login (incluindo mídia)
        this.instagramScopes = [
            'instagram_business_basic',
            'instagram_business_manage_messages',
            'instagram_business_manage_comments',
            'instagram_business_content_publish',
            'instagram_business_manage_insights'
        ];
    }

    private ensureSecureContext(): void {
        if (typeof window === 'undefined') return;
        const { protocol, hostname } = window.location;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
        if (protocol !== 'https:' && !isLocalhost) {
            throw new Error('O login do Facebook/Instagram exige HTTPS. Use um dominio HTTPS ou localhost.');
        }
    }

    /**
     * Initialize Meta SDK (Facebook)
     * Polls for window.FB to be available
     */
    async initialize(): Promise<void> {
        console.log('[Meta SDK] Initializing...');

        // Check if already loaded
        if (typeof window !== 'undefined' && window.FB) {
            console.log('[Meta SDK] Already initialized');
            return;
        }

        // Listen for SDK ready event (dispatched by FacebookSDK component)
        const sdkReadyPromise = new Promise<void>((resolve) => {
            window.addEventListener('facebook-sdk-ready', () => {
                console.log('[Meta SDK] Received facebook-sdk-ready event');
                resolve();
            }, { once: true });
        });

        // Listen for SDK error event
        const sdkErrorPromise = new Promise<void>((_, reject) => {
            window.addEventListener('facebook-sdk-error', (event: any) => {
                console.error('[Meta SDK] Received facebook-sdk-error event:', event.detail);
                reject(new Error(event.detail?.message || 'Erro ao carregar Facebook SDK'));
            }, { once: true });
        });

        // Wait for SDK to load (up to 10 seconds)
        const maxAttempts = 100;
        const interval = 100;
        let attempts = 0;

        const pollPromise = new Promise<void>((resolve, reject) => {
            const checkSDK = setInterval(() => {
                attempts++;

                if (window.FB) {
                    console.log('[Meta SDK] SDK loaded successfully via polling');
                    clearInterval(checkSDK);
                    resolve();
                    return;
                }

                if (attempts % 10 === 0) {
                    console.log(`[Meta SDK] Still waiting... (${attempts * interval}ms)`);
                }

                if (attempts >= maxAttempts) {
                    console.error('[Meta SDK] Timeout waiting for SDK');
                    console.error('[Meta SDK] Verifique se:');
                    console.error('[Meta SDK] 1. O domínio está autorizado no Facebook App Dashboard');
                    console.error('[Meta SDK] 2. Não há bloqueadores de anúncios ativos');
                    console.error('[Meta SDK] 3. O NEXT_PUBLIC_FACEBOOK_APP_ID está correto');
                    clearInterval(checkSDK);
                    reject(new Error('Timeout ao carregar Meta SDK. Verifique console para mais detalhes.'));
                }
            }, interval);
        });

        // Race between event listeners and polling
        return Promise.race([sdkReadyPromise, sdkErrorPromise, pollPromise]);
    }

    /**
     * Generate random email when not available
     */
    private generateRandomEmail(): string {
        const randomId = Math.random().toString(36).substring(2, 10);
        const timestamp = Date.now().toString(36);
        return `user_${randomId}${timestamp}@italosantos.com`;
    }

    /**
     * Facebook Login via Popup
     * Collects: name, email, profile picture
     */
    async loginWithFacebook(): Promise<MetaUserProfile> {
        console.log('[Meta SDK] Starting Facebook login...');

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
            } catch (error) {
                reject(error);
                return;
            }

            if (!window.FB) {
                reject(new Error('Facebook SDK não carregado'));
                return;
            }

            window.FB.login(
                (response: FacebookStatusResponse) => {
                    console.log('[Meta SDK] Facebook login response:', response);

                    if (response.status === 'connected' && response.authResponse) {
                        const accessToken = response.authResponse.accessToken;

                        window.FB.api(
                            '/me',
                            { fields: 'id,name,email,picture.type(large)' },
                            (userResponse: FacebookUserData) => {
                                console.log('[Meta SDK] Facebook user data:', userResponse);

                                const profile: MetaUserProfile = {
                                    id: userResponse.id,
                                    name: userResponse.name || 'Usuário Facebook',
                                    email: userResponse.email || this.generateRandomEmail(),
                                    picture: userResponse.picture?.data?.url,
                                    platform: 'facebook',
                                };

                                console.log('[Meta SDK] Facebook profile collected:', profile);
                                resolve(profile);
                            }
                        );
                    } else {
                        console.error('[Meta SDK] Facebook login failed:', response);
                        reject(new Error('Falha ao autenticar com Facebook'));
                    }
                },
                {
                    scope: 'email,public_profile',
                    return_scopes: true,
                    auth_type: 'rerequest',
                }
            );
        });
    }

    /**
     * Instagram Business Login via Popup (DEPRECATED - Use loginWithInstagramOAuth)
     * Uses Facebook SDK to connect Instagram Business account
     * Collects: username, profile data
     * @deprecated Use loginWithInstagramOAuth() instead for proper OAuth flow
     */
    async loginWithInstagramLegacy(): Promise<MetaUserProfile> {
        console.log('[Meta SDK] Starting Instagram login (LEGACY - Facebook SDK)...');

        await this.initialize();

        return new Promise((resolve, reject) => {
            if (!window.FB) {
                reject(new Error('Facebook SDK não carregado'));
                return;
            }

            // Instagram Business Login requires Facebook authentication first
            window.FB.login(
                (response: FacebookStatusResponse) => {
                    console.log('[Meta SDK] Instagram login response:', response);

                    if (response.status === 'connected' && response.authResponse) {
                        const accessToken = response.authResponse.accessToken;

                        // Use uma função assíncrona separada para processar a resposta
                        (async () => {
                            try {
                                // Get Facebook Pages
                                const pagesResponse = await this.getFacebookPages(accessToken);
                                console.log('[Meta SDK] Facebook Pages:', pagesResponse);

                                if (!pagesResponse || pagesResponse.length === 0) {
                                    reject(new Error('Nenhuma página encontrada. Você precisa ter uma página no Facebook conectada ao Instagram Business.'));
                                    return;
                                }

                                // Get first page (or let user choose in future)
                                const pageId = pagesResponse[0].id;
                                const pageAccessToken = pagesResponse[0].access_token;

                                // Get Instagram Business Account connected to Page
                                const instagramAccount = await this.getInstagramBusinessAccount(pageId, pageAccessToken);
                                console.log('[Meta SDK] Instagram account:', instagramAccount);

                                if (!instagramAccount) {
                                    reject(new Error('Nenhuma conta do Instagram Business encontrada conectada a esta página.'));
                                    return;
                                }

                                // Get Instagram profile data
                                const instagramProfile = await this.getInstagramProfile(instagramAccount.id, pageAccessToken);
                                console.log('[Meta SDK] Instagram profile:', instagramProfile);

                                const profile: MetaUserProfile = {
                                    id: instagramAccount.id,
                                    name: instagramProfile.username || instagramProfile.name || 'Usuário Instagram',
                                    email: this.generateRandomEmail(), // Instagram doesn't provide email
                                    picture: instagramProfile.profile_picture_url,
                                    platform: 'instagram',
                                };

                                console.log('[Meta SDK] Instagram profile collected:', profile);
                                resolve(profile);
                            } catch (error) {
                                console.error('[Meta SDK] Instagram data fetch failed:', error);
                                reject(error);
                            }
                        })();
                    } else {
                        console.error('[Meta SDK] Instagram login failed:', response);
                        reject(new Error('Falha ao autenticar com Instagram'));
                    }
                },
                {
                    scope: 'email,public_profile,pages_show_list,instagram_basic,instagram_manage_insights,pages_read_engagement',
                    return_scopes: true,
                    auth_type: 'rerequest',
                }
            );
        });
    }

    /**
     * Get Facebook Pages for the authenticated user
     */
    private getFacebookPages(accessToken: string): Promise<any[]> {
        return new Promise((resolve, reject) => {
            window.FB.api(
                '/me/accounts',
                { access_token: accessToken },
                (response: any) => {
                    if (response && !response.error) {
                        resolve(response.data || []);
                    } else {
                        reject(new Error(response.error?.message || 'Erro ao buscar páginas'));
                    }
                }
            );
        });
    }

    /**
     * Get Instagram Business Account connected to a Facebook Page
     */
    private getInstagramBusinessAccount(pageId: string, pageAccessToken: string): Promise<any> {
        return new Promise((resolve, reject) => {
            window.FB.api(
                `/${pageId}`,
                { fields: 'instagram_business_account', access_token: pageAccessToken },
                (response: any) => {
                    if (response && !response.error) {
                        resolve(response.instagram_business_account || null);
                    } else {
                        reject(new Error(response.error?.message || 'Erro ao buscar conta do Instagram'));
                    }
                }
            );
        });
    }

    /**
     * Get Instagram profile data
     */
    private getInstagramProfile(instagramAccountId: string, accessToken: string): Promise<any> {
        return new Promise((resolve, reject) => {
            window.FB.api(
                `/${instagramAccountId}`,
                {
                    fields: 'id,username,name,profile_picture_url,followers_count,follows_count,media_count',
                    access_token: accessToken
                },
                (response: any) => {
                    if (response && !response.error) {
                        resolve(response);
                    } else {
                        reject(new Error(response.error?.message || 'Erro ao buscar perfil do Instagram'));
                    }
                }
            );
        });
    }

    /**
     * Get current login status
     */
    async getLoginStatus(): Promise<FacebookStatusResponse> {
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
            if (!window.FB) {
                reject(new Error('Facebook SDK não carregado'));
                return;
            }
            window.FB.getLoginStatus((response: FacebookStatusResponse) => {
                resolve(response);
            });
        });
    }

    /**
     * Logout completo de Facebook/Instagram
     * Remove tokens, limpa sessão e revoga permissões
     */
    async logout(): Promise<void> {
        await this.initialize();

        return new Promise((resolve, reject) => {
            if (!window.FB) {
                reject(new Error('Facebook SDK não carregado'));
                return;
            }

            console.log('[Meta SDK] Iniciando logout completo...');

            // Logout do Facebook SDK (revoga tokens)
            window.FB.logout(() => {
                console.log('[Meta SDK] ✅ Logout do Facebook SDK concluído');

                // Limpar sessionStorage
                sessionStorage.removeItem('fb_access_token');
                sessionStorage.removeItem('instagram_oauth_state');
                sessionStorage.removeItem('instagram_profile');

                console.log('[Meta SDK] ✅ SessionStorage limpo');

                resolve();
            });
        });
    }

    /**
     * Revoga permissões de uma integração específica
     */
    async revokePermissions(userId: string): Promise<void> {
        await this.initialize();

        return new Promise((resolve, reject) => {
            if (!window.FB) {
                reject(new Error('Facebook SDK não carregado'));
                return;
            }

            // Revogar permissões via Graph API
            window.FB.api(
                `/${userId}/permissions`,
                'DELETE',
                (response: any) => {
                    if (response && !response.error) {
                        console.log('[Meta SDK] Permissões revogadas com sucesso');
                        resolve();
                    } else {
                        console.error('[Meta SDK] Erro ao revogar permissões:', response.error);
                        reject(new Error(response.error?.message || 'Erro ao revogar permissões'));
                    }
                }
            );
        });
    }

    // ==================== INSTAGRAM BUSINESS LOGIN (OAuth Flow) ====================

    /**
     * Gera a URL de autorização para Instagram Business Login
     * Usa o formato exato da documentação oficial do Instagram
     */
    getInstagramAuthUrl(state?: string): string {
        // URL atualizada conforme solicitação (hardcoded para garantir parâmetros exatos)
        let authUrl = "https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=737697635744491&redirect_uri=https://italosantos.com/&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights";

        if (state) {
            authUrl += `&state=${state}`;
        }

        console.log('[Meta SDK] Instagram Auth URL:', authUrl);

        return authUrl;
    }

    /**
     * Instagram Business Login via OAuth (RECOMENDADO)
     * Redireciona para autorização oficial do Instagram
     * @returns Redirection URL - não retorna Promise pois redireciona a página
     */
    loginWithInstagram(state?: string): string {
        console.log('[Meta SDK] Instagram OAuth Login - Gerando URL de autorização...');
        return this.getInstagramAuthUrl(state);
    }

    /**
     * Abre popup para autorização do Instagram Business Login (ALTERNATIVO)
     * Não recomendado - use redirect completo com loginWithInstagram()
     */
    async loginWithInstagramOAuthPopup(): Promise<MetaUserProfile> {
        return new Promise((resolve, reject) => {
            // Gerar state para CSRF protection
            const state = Math.random().toString(36).substring(2, 15);
            sessionStorage.setItem('instagram_oauth_state', state);

            const authUrl = this.getInstagramAuthUrl(state);

            // Abrir popup
            const width = 600;
            const height = 700;
            const left = (window.innerWidth - width) / 2;
            const top = (window.innerHeight - height) / 2;

            const popup = window.open(
                authUrl,
                'Instagram Business Login',
                `width=${width},height=${height},left=${left},top=${top}`
            );

            if (!popup) {
                reject(new Error('Popup bloqueado. Por favor, permita popups para este site.'));
                return;
            }

            // Verificar quando o popup fecha ou redireciona
            const checkPopup = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkPopup);
                    // Verificar se há token no sessionStorage (salvo pelo callback)
                    const profile = sessionStorage.getItem('instagram_profile');
                    if (profile) {
                        sessionStorage.removeItem('instagram_profile');
                        resolve(JSON.parse(profile));
                    } else {
                        reject(new Error('Autorização cancelada ou falhou'));
                    }
                }
            }, 500);
        });
    }

    /**
     * Troca o authorization code por um short-lived access token
     * DEVE SER CHAMADO NO BACKEND (API Route)
     */
    async exchangeInstagramCodeForToken(code: string): Promise<InstagramTokenResponse> {
        const response = await fetch('https://api.instagram.com/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: this.instagramAppId,
                client_secret: this.instagramAppSecret,
                grant_type: 'authorization_code',
                redirect_uri: this.instagramRedirectUri,
                code: code
            }).toString()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error_message || 'Erro ao trocar código por token');
        }

        const data = await response.json();
        console.log('[Meta SDK] Short-lived token obtido:', data);

        return data.data?.[0] || data;
    }

    /**
     * Troca short-lived token por long-lived token (válido por 60 dias)
     * DEVE SER CHAMADO NO BACKEND (API Route)
     */
    async getInstagramLongLivedToken(shortLivedToken: string): Promise<InstagramLongLivedTokenResponse> {
        const params = new URLSearchParams({
            grant_type: 'ig_exchange_token',
            client_secret: this.instagramAppSecret,
            access_token: shortLivedToken
        });

        const response = await fetch(
            `https://graph.instagram.com/access_token?${params.toString()}`,
            { method: 'GET' }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Erro ao obter long-lived token');
        }

        const data = await response.json();
        console.log('[Meta SDK] Long-lived token obtido (válido por 60 dias)');

        return data;
    }

    /**
     * Renova long-lived token (deve ter pelo menos 24h de vida)
     * DEVE SER CHAMADO NO BACKEND (API Route)
     */
    async refreshInstagramToken(longLivedToken: string): Promise<InstagramLongLivedTokenResponse> {
        const params = new URLSearchParams({
            grant_type: 'ig_refresh_token',
            access_token: longLivedToken
        });

        const response = await fetch(
            `https://graph.instagram.com/refresh_access_token?${params.toString()}`,
            { method: 'GET' }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Erro ao renovar token');
        }

        const data = await response.json();
        console.log('[Meta SDK] Token renovado (válido por mais 60 dias)');

        return data;
    }

    /**
     * Obtém dados do perfil Instagram usando o access token
     */
    async getInstagramProfileData(userId: string, accessToken: string): Promise<any> {
        const params = new URLSearchParams({
            fields: 'id,username,account_type,media_count',
            access_token: accessToken
        });

        const response = await fetch(
            `https://graph.instagram.com/${userId}?${params.toString()}`,
            { method: 'GET' }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Erro ao buscar perfil');
        }

        return response.json();
    }
}

// Export singleton instance
export const metaSDK = new MetaSDKIntegration();
export type { MetaUserProfile };
