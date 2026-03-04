'use client';

import { useEffect, useState } from 'react';
import { useInstagramIntegration } from '@/hooks/useInstagramIntegration';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface InstagramLoginButtonProps {
    onSuccess?: (data: { accessToken: string; userID: string; profile?: any }) => void;
    onError?: (error: string) => void;
    className?: string;
    isLoading?: boolean;
}

/**
 * Componente de botão para login com Instagram
 * Integrado com o serviço InstagramSDKIntegration
 */
export function InstagramLoginButton({
    onSuccess,
    onError,
    className = '',
    isLoading = false,
}: InstagramLoginButtonProps) {
    const instagramIntegration = useInstagramIntegration();
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Inicializar o Instagram SDK ao montar o componente
    useEffect(() => {
        (async () => {
            const initialized = await instagramIntegration.initialize();
            setIsInitialized(initialized);
        })();
    }, [instagramIntegration]);

    const handleInstagramLogin = async () => {
        if (!isInitialized) {
            const initialized = await instagramIntegration.initialize();
            if (!initialized) {
                onError?.('Falha ao inicializar Instagram SDK');
                return;
            }
        }

        setIsLoggingIn(true);

        try {
            const scope = 'instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages,instagram_business_manage_comments';
            const loginResult = await instagramIntegration.login(scope);

            if (loginResult.success && loginResult.accessToken && loginResult.userID) {
                // Obter informações do perfil
                const profile = await instagramIntegration.getProfile(loginResult.accessToken);

                onSuccess?.({
                    accessToken: loginResult.accessToken,
                    userID: loginResult.userID,
                    profile,
                });
            } else {
                onError?.(loginResult.error || 'Falha ao fazer login com Instagram');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            onError?.(errorMessage);
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <Button
            onClick={handleInstagramLogin}
            disabled={isLoading || isLoggingIn || !isInitialized}
            className={className}
            variant="outline"
        >
            {isLoading || isLoggingIn ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Conectando...
                </>
            ) : (
                'Conectar com Instagram'
            )}
        </Button>
    );
}
