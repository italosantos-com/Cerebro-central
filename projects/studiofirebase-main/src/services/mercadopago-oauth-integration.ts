/**
 * Mercado Pago OAuth Integration Service
 * Implementa os fluxos completos de autenticação OAuth do Mercado Pago:
 * 1. Authorization Code (com PKCE) - para acessar recursos de terceiros
 * 2. Client Credentials - para acessar recursos próprios
 * 
 * Baseado na documentação oficial:
 * https://www.mercadopago.com.br/developers/pt/docs/security/oauth/introduction
 */

import { generateRandomString, sha256, base64UrlEncode } from '../utils/crypto-helpers';

// Tipos de fluxo OAuth
type GrantType = 'authorization_code' | 'client_credentials' | 'refresh_token';

// Métodos de Code Challenge PKCE
type CodeChallengeMethod = 'S256' | 'plain';

// Configuração OAuth do Mercado Pago
interface MercadoPagoOAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}

// Dados PKCE para segurança adicional
interface PKCEData {
    codeVerifier: string;
    codeChallenge: string;
    codeChallengeMethod: CodeChallengeMethod;
}

// Resposta do Access Token
interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    user_id?: number;
    refresh_token?: string;
    public_key?: string;
    live_mode?: boolean;
}

// Dados do usuário Mercado Pago
interface MercadoPagoUser {
    id: number;
    nickname: string;
    email: string;
    first_name: string;
    last_name: string;
    country_id: string;
    site_id: string;
}

// Resultado da autenticação
export interface AuthResult {
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    publicKey?: string;
    userId?: number;
    user?: MercadoPagoUser;
    expiresIn?: number;
    error?: string;
    message?: string;
}

export class MercadoPagoOAuthIntegration {
    private config: MercadoPagoOAuthConfig;
    private authBaseUrl = 'https://auth.mercadopago.com.br/authorization';
    private tokenUrl = 'https://api.mercadopago.com/oauth/token';
    private userInfoUrl = 'https://api.mercadopago.com/users/me';

    constructor(config?: Partial<MercadoPagoOAuthConfig>) {
        // Configuração com valores padrão do ambiente
        const origin = typeof window !== 'undefined' ? window.location.origin : '';

        this.config = {
            clientId: config?.clientId || process.env.NEXT_PUBLIC_MERCADOPAGO_CLIENT_ID || '',
            clientSecret: config?.clientSecret || process.env.MERCADOPAGO_CLIENT_SECRET || '',
            redirectUri: config?.redirectUri || process.env.NEXT_PUBLIC_MERCADOPAGO_REDIRECT_URI || `${origin}/auth/mercadopago/callback`,
        };

        if (!this.config.clientId) {
            console.warn('[MercadoPago OAuth] Client ID não configurado');
        }
    }    // ========================================
    // PKCE - Proof Key for Code Exchange
    // ========================================

    /**
     * Gera dados PKCE para segurança adicional no fluxo OAuth
     * PKCE adiciona uma camada extra de proteção contra ataques de interceptação
     */
    private async generatePKCE(method: CodeChallengeMethod = 'S256'): Promise<PKCEData> {
        // Gerar code_verifier: 43-128 caracteres aleatórios
        const codeVerifier = generateRandomString(128);

        let codeChallenge: string;

        if (method === 'S256') {
            // Transformar code_verifier em code_challenge usando SHA256 + BASE64URL
            const hash = await sha256(codeVerifier);
            codeChallenge = base64UrlEncode(hash);
        } else {
            // Plain: code_challenge = code_verifier
            codeChallenge = codeVerifier;
        }

        return {
            codeVerifier,
            codeChallenge,
            codeChallengeMethod: method,
        };
    }

    /**
     * Armazena dados PKCE no sessionStorage para uso posterior
     */
    private storePKCE(pkce: PKCEData): void {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('mercadopago_pkce', JSON.stringify(pkce));
        }
    }

    /**
     * Recupera dados PKCE armazenados
     */
    private retrievePKCE(): PKCEData | null {
        if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem('mercadopago_pkce');
            if (stored) {
                return JSON.parse(stored);
            }
        }
        return null;
    }

    /**
     * Limpa dados PKCE armazenados
     */
    private clearPKCE(): void {
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('mercadopago_pkce');
        }
    }

    // ========================================
    // AUTHORIZATION CODE FLOW (com PKCE)
    // ========================================

    /**
     * Inicia o fluxo Authorization Code com PKCE
     * Usado quando você precisa acessar recursos de terceiros (vendedores)
     * 
     * @param usePKCE - Habilitar PKCE (recomendado para segurança adicional)
     * @param state - Identificador único para validação CSRF
     * @returns URL de autorização para redirecionar o usuário
     */
    public async getAuthorizationUrl(usePKCE: boolean = true, state?: string): Promise<string> {
        if (!this.config.clientId) {
            throw new Error('Client ID do Mercado Pago não configurado');
        }

        const authUrl = new URL(this.authBaseUrl);

        // Parâmetros obrigatórios
        authUrl.searchParams.set('client_id', this.config.clientId);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('platform_id', 'mp');
        authUrl.searchParams.set('redirect_uri', this.config.redirectUri);

        // State para proteção CSRF
        const stateValue = state || generateRandomString(32);
        authUrl.searchParams.set('state', stateValue);

        // Armazenar state para validação posterior
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('mercadopago_state', stateValue);
        }

        // Adicionar PKCE se habilitado
        if (usePKCE) {
            const pkce = await this.generatePKCE('S256');
            authUrl.searchParams.set('code_challenge', pkce.codeChallenge);
            authUrl.searchParams.set('code_challenge_method', pkce.codeChallengeMethod);

            // Armazenar code_verifier para uso na troca do token
            this.storePKCE(pkce);
        }

        // Log para debug
        console.log('[MercadoPago OAuth] URL gerada:', authUrl.toString());

        return authUrl.toString();
    }

    /**
     * Redireciona o usuário para a página de autorização do Mercado Pago
     */
    public async redirectToAuthorization(usePKCE: boolean = true): Promise<void> {
        const authUrl = await this.getAuthorizationUrl(usePKCE);
        if (typeof window !== 'undefined') {
            window.location.href = authUrl;
        }
    }    /**
     * Abre popup para autorização (melhor UX que redirect)
     */
    public async openAuthorizationPopup(usePKCE: boolean = true): Promise<AuthResult> {
        return new Promise(async (resolve, reject) => {
            const authUrl = await this.getAuthorizationUrl(usePKCE);

            // Abrir popup
            const width = 500;
            const height = 700;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;

            const popup = window.open(
                authUrl,
                'MercadoPago OAuth',
                `width=${width},height=${height},left=${left},top=${top},popup=1`
            );

            if (!popup) {
                reject(new Error('Popup bloqueado pelo navegador'));
                return;
            }

            // Listener para mensagem do popup
            const messageHandler = async (event: MessageEvent) => {
                if (event.origin !== window.location.origin) return;

                const data = event.data;
                if (data.platform === 'mercadopago') {
                    window.removeEventListener('message', messageHandler);
                    popup?.close();

                    if (data.success) {
                        resolve({
                            success: true,
                            accessToken: data.accessToken,
                            refreshToken: data.refreshToken,
                            publicKey: data.publicKey,
                            userId: data.userId,
                            user: data.user,
                            expiresIn: data.expiresIn,
                        });
                    } else {
                        resolve({
                            success: false,
                            error: data.error,
                            message: data.message,
                        });
                    }
                }
            };

            window.addEventListener('message', messageHandler);

            // Timeout de 10 minutos (aumentado para evitar expiração prematura)
            const timeoutId = setTimeout(() => {
                window.removeEventListener('message', messageHandler);
                if (popup && !popup.closed) {
                    popup.close();
                }
                reject(new Error('Timeout: Janela de autorização expirou após 10 minutos'));
            }, 10 * 60 * 1000);

            // Verificar se popup foi fechado manualmente
            const checkClosed = setInterval(() => {
                if (popup && popup.closed) {
                    clearInterval(checkClosed);
                    clearTimeout(timeoutId);
                    window.removeEventListener('message', messageHandler);
                    reject(new Error('Janela de autorização foi fechada'));
                }
            }, 1000);
        });
    }

    /**
     * Troca o código de autorização por um Access Token
     * Chamado após o redirect do Mercado Pago
     * 
     * @param code - Código de autorização recebido
     * @param state - State recebido (para validação CSRF)
     * @param usePKCE - Se PKCE foi usado na autorização
     */
    public async exchangeCodeForToken(
        code: string,
        state?: string,
        usePKCE: boolean = true
    ): Promise<AuthResult> {
        try {
            // Validar state (proteção CSRF)
            if (state && typeof window !== 'undefined') {
                const storedState = sessionStorage.getItem('mercadopago_state');
                if (storedState !== state) {
                    return {
                        success: false,
                        error: 'invalid_state',
                        message: 'State inválido - possível ataque CSRF',
                    };
                }
                sessionStorage.removeItem('mercadopago_state');
            }

            // Preparar body da requisição
            const body: Record<string, string> = {
                client_secret: this.config.clientSecret,
                client_id: this.config.clientId,
                grant_type: 'authorization_code',
                code,
                redirect_uri: this.config.redirectUri,
            };

            // Adicionar code_verifier se PKCE foi usado
            if (usePKCE) {
                const pkce = this.retrievePKCE();
                if (pkce) {
                    body.code_verifier = pkce.codeVerifier;
                    this.clearPKCE();
                }
            }

            // Trocar código por token
            const response = await fetch(this.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                },
                body: new URLSearchParams(body),
            });

            const tokenData: TokenResponse = await response.json();

            if (!response.ok || !tokenData.access_token) {
                console.error('[MercadoPago OAuth] Erro ao trocar código:', tokenData);
                return {
                    success: false,
                    error: 'token_exchange_failed',
                    message: 'Falha ao obter Access Token',
                };
            }

            // Buscar informações do usuário
            const user = await this.getUserInfo(tokenData.access_token);

            return {
                success: true,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                publicKey: tokenData.public_key,
                userId: tokenData.user_id,
                user,
                expiresIn: tokenData.expires_in,
            };
        } catch (error) {
            console.error('[MercadoPago OAuth] Erro no exchangeCodeForToken:', error);
            return {
                success: false,
                error: 'exception',
                message: error instanceof Error ? error.message : 'Erro desconhecido',
            };
        }
    }

    // ========================================
    // CLIENT CREDENTIALS FLOW
    // ========================================

    /**
     * Obtém Access Token usando Client Credentials
     * Usado quando você precisa acessar seus próprios recursos (sem interação do usuário)
     * 
     * Este fluxo é ideal para:
     * - Operações em nome próprio
     * - Serviços backend automatizados
     * - Integrações server-to-server
     */
    public async getClientCredentialsToken(): Promise<AuthResult> {
        try {
            if (!this.config.clientId || !this.config.clientSecret) {
                return {
                    success: false,
                    error: 'missing_credentials',
                    message: 'Client ID ou Client Secret não configurados',
                };
            }

            const response = await fetch(this.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                },
                body: new URLSearchParams({
                    client_id: this.config.clientId,
                    client_secret: this.config.clientSecret,
                    grant_type: 'client_credentials',
                }),
            });

            const tokenData: TokenResponse = await response.json();

            if (!response.ok || !tokenData.access_token) {
                console.error('[MercadoPago OAuth] Erro client_credentials:', tokenData);
                return {
                    success: false,
                    error: 'client_credentials_failed',
                    message: 'Falha ao obter token com client_credentials',
                };
            }

            return {
                success: true,
                accessToken: tokenData.access_token,
                expiresIn: tokenData.expires_in, // Válido por 6 horas
            };
        } catch (error) {
            console.error('[MercadoPago OAuth] Erro no getClientCredentialsToken:', error);
            return {
                success: false,
                error: 'exception',
                message: error instanceof Error ? error.message : 'Erro desconhecido',
            };
        }
    }

    // ========================================
    // REFRESH TOKEN FLOW
    // ========================================

    /**
     * Renova Access Token usando Refresh Token
     * Permite atualizar o Access Token sem interação do usuário
     * 
     * @param refreshToken - Refresh Token obtido no fluxo Authorization Code
     */
    public async refreshAccessToken(refreshToken: string): Promise<AuthResult> {
        try {
            if (!this.config.clientId || !this.config.clientSecret) {
                return {
                    success: false,
                    error: 'missing_credentials',
                    message: 'Client ID ou Client Secret não configurados',
                };
            }

            const response = await fetch(this.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                },
                body: new URLSearchParams({
                    client_id: this.config.clientId,
                    client_secret: this.config.clientSecret,
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                }),
            });

            const tokenData: TokenResponse = await response.json();

            if (!response.ok || !tokenData.access_token) {
                console.error('[MercadoPago OAuth] Erro ao renovar token:', tokenData);
                return {
                    success: false,
                    error: 'refresh_token_failed',
                    message: 'Falha ao renovar Access Token',
                };
            }

            return {
                success: true,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                publicKey: tokenData.public_key,
                userId: tokenData.user_id,
                expiresIn: tokenData.expires_in,
            };
        } catch (error) {
            console.error('[MercadoPago OAuth] Erro no refreshAccessToken:', error);
            return {
                success: false,
                error: 'exception',
                message: error instanceof Error ? error.message : 'Erro desconhecido',
            };
        }
    }

    // ========================================
    // USER INFO
    // ========================================

    /**
     * Busca informações do usuário autenticado
     */
    public async getUserInfo(accessToken: string): Promise<MercadoPagoUser | undefined> {
        try {
            const response = await fetch(this.userInfoUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                console.error('[MercadoPago OAuth] Erro ao buscar usuário:', response.status);
                return undefined;
            }

            const userData: MercadoPagoUser = await response.json();
            return userData;
        } catch (error) {
            console.error('[MercadoPago OAuth] Erro no getUserInfo:', error);
            return undefined;
        }
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    /**
     * Valida se um Access Token está válido
     */
    public async validateToken(accessToken: string): Promise<boolean> {
        try {
            const response = await fetch(this.userInfoUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Logout - limpa dados locais
     */
    public logout(): void {
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('mercadopago_state');
            sessionStorage.removeItem('mercadopago_pkce');
            sessionStorage.removeItem('mercadopago_access_token');
            sessionStorage.removeItem('mercadopago_refresh_token');
        }
    }
}

// Exportar instância singleton
export const mercadoPagoOAuth = new MercadoPagoOAuthIntegration();
