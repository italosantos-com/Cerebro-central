/**
 * Botão de Login/Logout do Mercado Pago
 * Integra OAuth completo com fluxos Authorization Code e Client Credentials
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { mercadoPagoOAuth, AuthResult } from '@/services/mercadopago-oauth-integration';
import { Loader2 } from 'lucide-react';

interface MercadoPagoAuthButtonProps {
    mode?: 'authorization_code' | 'client_credentials';
    usePKCE?: boolean;
    onSuccess?: (data: AuthResult) => void;
    onError?: (error: string) => void;
    className?: string;
}

export function MercadoPagoAuthButton({
    mode = 'authorization_code',
    usePKCE = true,
    onSuccess,
    onError,
    className,
}: MercadoPagoAuthButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userInfo, setUserInfo] = useState<any>(null);
    const { toast } = useToast();

    // Verificar se já está autenticado
    useEffect(() => {
        const checkAuth = async () => {
            if (typeof window !== 'undefined') {
                const accessToken = sessionStorage.getItem('mercadopago_access_token');
                if (accessToken) {
                    const isValid = await mercadoPagoOAuth.validateToken(accessToken);
                    if (isValid) {
                        setIsAuthenticated(true);
                        const user = await mercadoPagoOAuth.getUserInfo(accessToken);
                        setUserInfo(user);
                    } else {
                        // Token inválido, tentar refresh
                        const refreshToken = sessionStorage.getItem('mercadopago_refresh_token');
                        if (refreshToken) {
                            const result = await mercadoPagoOAuth.refreshAccessToken(refreshToken);
                            if (result.success) {
                                sessionStorage.setItem('mercadopago_access_token', result.accessToken!);
                                sessionStorage.setItem('mercadopago_refresh_token', result.refreshToken!);
                                setIsAuthenticated(true);
                                setUserInfo(result.user);
                            } else {
                                sessionStorage.removeItem('mercadopago_access_token');
                                sessionStorage.removeItem('mercadopago_refresh_token');
                            }
                        }
                    }
                }
            }
        };

        checkAuth();
    }, []);

    // Login com Authorization Code (popup)
    const handleAuthorizationCodeLogin = async () => {
        setIsLoading(true);
        try {
            const result = await mercadoPagoOAuth.openAuthorizationPopup(usePKCE);

            if (result.success) {
                // Armazenar tokens
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem('mercadopago_access_token', result.accessToken!);
                    if (result.refreshToken) {
                        sessionStorage.setItem('mercadopago_refresh_token', result.refreshToken!);
                    }
                }

                setIsAuthenticated(true);
                setUserInfo(result.user);

                toast({
                    title: 'Conectado com Mercado Pago!',
                    description: `Bem-vindo, ${result.user?.nickname || 'Usuário'}!`,
                });

                onSuccess?.(result);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Erro ao conectar',
                    description: result.message || 'Falha na autenticação com Mercado Pago',
                });

                onError?.(result.error || 'authentication_failed');
            }
        } catch (error) {
            console.error('[MercadoPago Auth] Erro:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error instanceof Error ? error.message : 'Erro desconhecido',
            });

            onError?.('exception');
        } finally {
            setIsLoading(false);
        }
    };

    // Login com Client Credentials (backend)
    const handleClientCredentialsLogin = async () => {
        setIsLoading(true);
        try {
            const result = await mercadoPagoOAuth.getClientCredentialsToken();

            if (result.success) {
                // Armazenar token
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem('mercadopago_access_token', result.accessToken!);
                }

                setIsAuthenticated(true);

                toast({
                    title: 'Token obtido!',
                    description: 'Access Token gerado com sucesso via Client Credentials.',
                });

                onSuccess?.(result);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Erro ao obter token',
                    description: result.message || 'Falha ao obter Client Credentials token',
                });

                onError?.(result.error || 'client_credentials_failed');
            }
        } catch (error) {
            console.error('[MercadoPago Auth] Erro:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error instanceof Error ? error.message : 'Erro desconhecido',
            });

            onError?.('exception');
        } finally {
            setIsLoading(false);
        }
    };

    // Logout
    const handleLogout = () => {
        mercadoPagoOAuth.logout();
        setIsAuthenticated(false);
        setUserInfo(null);

        toast({
            title: 'Desconectado',
            description: 'Você foi desconectado do Mercado Pago.',
        });
    };

    // Botão de Login
    if (!isAuthenticated) {
        return (
            <Button
                onClick={mode === 'authorization_code' ? handleAuthorizationCodeLogin : handleClientCredentialsLogin}
                disabled={isLoading}
                className={className}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Conectando...
                    </>
                ) : (
                    <>
                        <svg
                            className="mr-2 h-5 w-5"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                            <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
                        </svg>
                        Conectar com Mercado Pago
                    </>
                )}
            </Button>
        );
    }

    // Botão de Logout
    return (
        <div className="flex items-center gap-3">
            {userInfo && (
                <div className="flex flex-col items-end">
                    <span className="text-sm font-medium">{userInfo.nickname}</span>
                    <span className="text-xs text-muted-foreground">{userInfo.email}</span>
                </div>
            )}
            <Button
                onClick={handleLogout}
                variant="outline"
                className={className}
            >
                <svg
                    className="mr-2 h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                </svg>
                Desconectar
            </Button>
        </div>
    );
}

// Export individual login functions for use in other components
export const loginWithMercadoPago = async (usePKCE: boolean = true) => {
    return mercadoPagoOAuth.openAuthorizationPopup(usePKCE);
};

export const getClientCredentialsToken = async () => {
    return mercadoPagoOAuth.getClientCredentialsToken();
};

export const logoutMercadoPago = () => {
    mercadoPagoOAuth.logout();
};
