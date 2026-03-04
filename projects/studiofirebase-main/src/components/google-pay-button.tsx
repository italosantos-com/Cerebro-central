'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
// import { useFaceIDAuth } from '@/contexts/face-id-auth-context';
import { useAuth } from '@/contexts/AuthProvider';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { getEnvironmentSpecificConfig } from '@/lib/google-pay-config';
import { GooglePayButtonCSS } from './ui/GooglePayButtonCSS';


interface GooglePayButtonProps {
  amount: number;
  currency: string;
  onSuccess: () => void;
  className?: string;
}

export default function GooglePayButton({ amount, currency, onSuccess, className }: GooglePayButtonProps) {
  // Novo: seleção de gateway
  const [gateway, setGateway] = useState<'braintree' | 'paypal'>('braintree');
  // Novo: configuração dinâmica do Google Pay
  const getGooglePayConfig = () => {
    const envConfig = getEnvironmentSpecificConfig();
    if (gateway === 'braintree') {
      return {
        ...envConfig,
        gateway: 'braintree',
        gatewayMerchantId: envConfig.gatewayMerchantId || '75tzy2qyrkv9hfwj',
      };
    } else {
      // Para PayPal, gateway = 'paypal' e merchantId de teste
      return {
        ...envConfig,
        gateway: 'paypal',
        gatewayMerchantId: envConfig.gatewayMerchantId || 'sb-merchant-id',
        merchantId: 'sb-merchant-id',
      };
    }
  };
  const { toast } = useToast();
  const router = useRouter();
  const { user: firebaseUser, userProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGooglePayAvailable, setIsGooglePayAvailable] = useState(false);

  // Debug: verificar se o componente está sendo renderizado
  console.log('🔍 [Google Pay] Componente renderizado:', {
    amount,
    currency,
    firebaseUser: !!firebaseUser,
    userProfile: !!userProfile,
    firebaseUserEmail: firebaseUser?.email,
    userProfileEmail: userProfile?.email
  });

  // Verificação simplificada de autenticação usando apenas AuthProvider
  const isUserAuthenticated = () => {
    // Verificar se há usuário Firebase autenticado
    const hasFirebaseUser = firebaseUser && firebaseUser.email;
    const hasUserProfile = userProfile && userProfile.email;

    // Se qualquer uma das fontes indicar autenticação, considerar autenticado
    const isAuthenticatedAnywhere = hasFirebaseUser || hasUserProfile;
    const hasValidEmail = hasFirebaseUser || hasUserProfile;

    // Debug: verificar status da autenticação
    console.log('🔍 [Google Pay] Status de autenticação:', {
      hasFirebaseUser,
      hasUserProfile,
      firebaseUserEmail: firebaseUser?.email,
      userProfileEmail: userProfile?.email,
      isAuthenticatedAnywhere,
      hasValidEmail,
      finalResult: isAuthenticatedAnywhere && hasValidEmail
    });

    return isAuthenticatedAnywhere && hasValidEmail;
  };

  useEffect(() => {
    // Verificar se Google Pay está disponível
    const checkGooglePayAvailability = () => {
      if (typeof window !== 'undefined') {
        // Verificar se o script foi carregado
        if ('google' in window && (window as any).google?.payments?.api) {
          console.log('✅ Google Pay API disponível');
          setIsGooglePayAvailable(true);
        } else {
          console.log('⏳ Aguardando Google Pay API...');
          setTimeout(checkGooglePayAvailability, 1000);
        }
      }
    };

    checkGooglePayAvailability();
  }, []);

  const handleGooglePayClick = async () => {
    // Verificar autenticação
    if (!isUserAuthenticated()) {
      toast({
        title: '❌ Acesso Negado',
        description: 'Você precisa estar autenticado para usar o Google Pay.',
        variant: 'destructive',
      });
      router.push('/auth/face');
      return;
    }

    // Obter email do usuário
    const userEmailValue = userProfile?.email || firebaseUser?.email || '';

    if (!userEmailValue || userEmailValue.trim() === '') {
      toast({
        title: '❌ Email não encontrado',
        description: 'Não foi possível identificar seu email. Faça login novamente.',
        variant: 'destructive',
      });
      router.push('/auth/face');
      return;
    }

    setIsLoading(true);

    try {

      // Obter configuração específica do ambiente e gateway
      const config = getGooglePayConfig();
      console.log('🔧 [Google Pay] Configuração do ambiente/gateway:', config);

      const merchantId = config.merchantId;
      const paymentsClient = new (window as any).google.payments.api.PaymentsClient({
        environment: config.environment,
      });

      const paymentDataRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [
          {
            type: 'CARD',
            parameters: {
              allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
              allowedCardNetworks: ['MASTERCARD', 'VISA'],
            },
            tokenizationSpecification: {
              type: 'PAYMENT_GATEWAY',
              parameters: config.gateway === 'braintree'
                ? {
                  gateway: 'braintree',
                  'braintree:merchantId': config.gatewayMerchantId,
                  'braintree:apiVersion': 'v1',
                  'braintree:sdkVersion': process.env.NEXT_PUBLIC_BRAINTREE_CLIENT_VERSION || '3.88.4',
                  'braintree:authorizationFingerprint': process.env.NEXT_PUBLIC_BRAINTREE_AUTH_FINGERPRINT || ''
                }
                : {
                  gateway: 'paypal',
                  gatewayMerchantId: config.gatewayMerchantId,
                },
            },
          },
        ],
        merchantInfo: {
          merchantId: merchantId,
          merchantName: 'Italo Santos Studio',
        },
        transactionInfo: {
          totalPriceStatus: 'FINAL',
          totalPriceLabel: 'Total',
          totalPrice: amount.toString(),
          currencyCode: currency,
          countryCode: 'BR',
        },
      };

      console.log('🔍 [Google Pay] Iniciando pagamento com configuração:', {
        environment: config.environment,
        merchantId: merchantId,
        amount,
        currency,
        userEmail: userEmailValue.substring(0, 10) + '...' // Log parcial por segurança
      });


      const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);
      console.log('✅ [Google Pay] Pagamento aprovado pelo usuário');

      // Novo: endpoint dinâmico
      let apiUrl = '';
      if (gateway === 'braintree') {
        apiUrl = config.isLocalhost
          ? 'http://localhost:3000/api/braintree/checkout'
          : '/api/braintree/checkout';
      } else {
        apiUrl = config.isLocalhost
          ? 'http://localhost:3000/api/payments/google-pay/process-paypal'
          : '/api/payments/google-pay/process-paypal';
      }

      console.log('📡 [Google Pay] Enviando para API:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(gateway === 'braintree'
            ? {
              paymentMethodNonce: paymentData.paymentMethodData?.tokenizationData?.token,
              amount: amount,
              currency: currency,
              userEmail: userEmailValue,
            }
            : {
              order_id: paymentData.paymentMethodData?.tokenizationData?.token,
              payment_data: paymentData,
              amount: amount,
              currency: currency,
              userEmail: userEmailValue,
            }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log('🎉 [Google Pay] Pagamento aprovado, chamando onSuccess...');
        toast({
          title: '✅ Pagamento Google Pay Aprovado!',
          description: 'Sua assinatura foi ativada com sucesso.',
        });
        onSuccess();
        console.log('✅ [Google Pay] onSuccess chamado com sucesso');
      } else {
        throw new Error(result.error || 'Erro no pagamento');
      }
    } catch (error) {
      console.error('Erro no Google Pay:', error);

      let errorMessage = 'Tente novamente ou use outro método.';

      if (error instanceof Error) {
        if (error.message.includes('Valor insuficiente')) {
          errorMessage = 'Valor insuficiente para ativar a assinatura.';
        } else if (error.message.includes('já possui')) {
          errorMessage = 'Você já possui uma assinatura ativa.';
        } else if (error.message.includes('não autenticado')) {
          errorMessage = 'Você precisa estar autenticado.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Erro de conexão. Verifique sua internet.';
        } else if (error.message.includes('CANCELED')) {
          errorMessage = 'Pagamento cancelado pelo usuário.';
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: '❌ Erro no Google Pay',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Se não estiver autenticado, mostrar botão desabilitado
  if (!isUserAuthenticated()) {
    return (
      <Button
        disabled
        className={`w-full ${className || ''}`}
        variant="outline"
      >
        <AlertTriangle className="w-4 h-4 mr-2" />
        Faça login para usar Google Pay
      </Button>
    );
  }

  // Se Google Pay não estiver disponível, mostrar botão desabilitado
  if (!isGooglePayAvailable) {
    return (
      <Button
        disabled
        className={`w-full ${className || ''}`}
        variant="outline"
      >
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Carregando Google Pay...
      </Button>
    );
  }

  return (
    <div className={`w-full ${className || ''}`}>
      <div className="flex mb-2 gap-2">
        <Button
          variant={gateway === 'braintree' ? 'default' : 'outline'}
          onClick={() => setGateway('braintree')}
          disabled={isLoading}
        >
          Braintree (Sandbox)
        </Button>
        <Button
          variant={gateway === 'paypal' ? 'default' : 'outline'}
          onClick={() => setGateway('paypal')}
          disabled={isLoading}
        >
          PayPal (Sandbox)
        </Button>
      </div>
      {isLoading ? (
        <Button
          disabled
          className="w-full"
          variant="default"
        >
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processando...
        </Button>
      ) : (
        <GooglePayButtonCSS
          onClick={handleGooglePayClick}
          disabled={isLoading}
          width="100%"
          height={48}
          className="w-full"
          ariaLabel="Pagar com Google Pay"
          buttonColor="white"
        />
      )}
    </div>
  );
}
