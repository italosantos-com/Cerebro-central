'use client';

import { useEffect, useState } from 'react';
import { useFacebookIntegration } from '@/hooks/useFacebookIntegration';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface FacebookLoginButtonProps {
  onSuccess?: (data: { accessToken: string; userID: string; userInfo?: any }) => void;
  onError?: (error: string) => void;
  className?: string;
  isLoading?: boolean;
}

/**
 * Componente de botão para login com Facebook
 * Integrado com o serviço FacebookSDKIntegration
 */
export function FacebookLoginButton({
  onSuccess,
  onError,
  className = '',
  isLoading = false,
}: FacebookLoginButtonProps) {
  const facebookIntegration = useFacebookIntegration();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Inicializar o Facebook SDK ao montar o componente
  useEffect(() => {
    (async () => {
      const initialized = await facebookIntegration.initialize();
      setIsInitialized(initialized);
    })();
  }, [facebookIntegration]);

  const handleFacebookLogin = async () => {
    if (!isInitialized) {
      const initialized = await facebookIntegration.initialize();
      if (!initialized) {
        onError?.('Falha ao inicializar Facebook SDK');
        return;
      }
    }

    setIsLoggingIn(true);

    try {
      const scope = 'email,public_profile,pages_manage_metadata,pages_read_user_content';
      const loginResult = await facebookIntegration.login(scope);

      if (loginResult.success && loginResult.accessToken && loginResult.userID) {
        // Obter informações do usuário
        const userInfo = await facebookIntegration.getUserInfo();
        
        onSuccess?.({
          accessToken: loginResult.accessToken,
          userID: loginResult.userID,
          userInfo,
        });
      } else {
        onError?.(loginResult.error || 'Falha ao fazer login com Facebook');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      onError?.(errorMessage);
    } finally {
      setIsLoggingIn(true);
    }
  };

  return (
    <Button
      onClick={handleFacebookLogin}
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
        'Conectar com Facebook'
      )}
    </Button>
  );
}
