'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Crown, CheckCircle, Star, Shield, Zap, Download, Loader2, X, FingerprintPattern as Fingerprint, Lock, CreditCard, ArrowLeft } from 'lucide-react';
import { useProfileConfig } from '@/hooks/use-profile-config';
import { convertCurrency } from '@/ai/flows/currency-conversion-flow';
import Image from 'next/image';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useFaceIDAuth } from '@/contexts/face-id-auth-context';
import { Card } from '@/components/ui/card';

// Carregar componentes pesados sob demanda (reduz First Load JS)
const PaymentMethods = dynamic(() => import('@/components/payment-methods'), { ssr: false, loading: () => <div className="h-24 w-full bg-muted rounded" /> });
const SubscriptionActivation = dynamic(() => import('@/components/subscription-activation'), { ssr: false });

function AssinantePageContent() {
  const billingOptions = {
    monthly: { label: 'Mensal', months: 1, durationDays: 30, baseAmountBRL: 666.0 },
    semiannual: { label: 'Semestral', months: 6, durationDays: 180, baseAmountBRL: 3996.0 },
    annual: { label: 'Anual', months: 12, durationDays: 365, baseAmountBRL: 7992.0 },
  } as const;

  type BillingCycle = keyof typeof billingOptions;

  const [isSubscriber, setIsSubscriber] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<BillingCycle>('monthly');
  const [paymentInfo, setPaymentInfo] = useState({ value: '666.00', currency: 'BRL', symbol: 'R$' });
  const [isLoadingCurrency, setIsLoadingCurrency] = useState(true);
  const [isBrazil, setIsBrazil] = useState(true);
  const [paymentFeedback, setPaymentFeedback] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const { coverPhoto } = useProfileConfig();
  const { userType, userEmail, isAuthenticated } = useFaceIDAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // VERIFICAÇÃO DE SEGURANÇA CRÍTICA - MELHORADA
  useEffect(() => {
    const checkAuthSecurity = () => {
      // Verificar múltiplas fontes de autenticação
      const localStorage_auth = localStorage.getItem('isAuthenticated') === 'true';
      const sessionStorage_auth = sessionStorage.getItem('isAuthenticated') === 'true';
      const context_auth = isAuthenticated;
      const hasUserEmail = userEmail && userEmail.trim() !== '';
      

      
      // CRITÉRIOS MAIS RIGOROSOS PARA PÁGINA DE PAGAMENTO
      const isAuthenticatedAnywhere = localStorage_auth || sessionStorage_auth || context_auth;
      const hasValidEmail = hasUserEmail;
      
      // Se NÃO está autenticado OU não tem email válido, redirecionar IMEDIATAMENTE
      if (!isAuthenticatedAnywhere || !hasValidEmail) {

        
        // Limpar qualquer dado residual
        localStorage.clear();
        sessionStorage.clear();
        document.cookie = 'isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        document.cookie = 'hasSubscription=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        
        // Redirecionar para login
        router.replace('/auth/face');
        return false;
      }
      

      return true;
    };

    // Executar verificação imediatamente
    const isAuthorized = checkAuthSecurity();
    
    if (!isAuthorized) {
      return; // Não continuar se não autorizado
    }

    // Verificar periodicamente a cada 5 segundos
    const securityInterval = setInterval(() => {
      const stillAuthorized = checkAuthSecurity();
      if (!stillAuthorized) {
        clearInterval(securityInterval);
      }
    }, 5000);

    return () => clearInterval(securityInterval);
  }, [isAuthenticated, userEmail, router]);

  // Cria o plano de assinatura com valores internacionalizados
  const getSubscriptionPlan = () => {
    const selectedOption = billingOptions[selectedBillingCycle];

    return {
    id: selectedBillingCycle,
    name: `Assinatura ${selectedOption.label}`,
    price: parseFloat(paymentInfo.value),
    duration: selectedOption.durationDays,
    currency: paymentInfo.currency,
    symbol: paymentInfo.symbol,
    features: [
      'Acesso total ao conteúdo exclusivo',
      'Downloads ilimitados',
      'Suporte dedicado',
      'Conteúdo em alta definição',
      'Liberação instantânea após pagamento'
    ]
  };
};

  useEffect(() => {
    // Só executar se estiver autenticado
    if (userEmail && isAuthenticated) {
      checkSubscriptionStatus();
      fetchCurrency();
    }
   
  }, [userEmail, isAuthenticated, selectedBillingCycle]); // fetchCurrency varia com ciclo selecionado

  // Trata os parâmetros de retorno do PayPal
  useEffect(() => {
    if (!searchParams) return;
    
    const paymentStatus = searchParams.get('payment');
    const token = searchParams.get('token');
    const PayerID = searchParams.get('PayerID');
    
    if (paymentStatus === 'success' && token && PayerID) {

      setPaymentFeedback({
        type: 'success',
        message: 'Pagamento aprovado! Sua assinatura foi ativada.'
      });
      
      // Processar pagamento bem-sucedido
      processSuccessfulPayment({
        email: userEmail,
        paymentMethod: 'paypal',
        paymentId: token,
        payerId: PayerID,
        status: 'approved',
        amount: parseFloat(paymentInfo.value)
      });
    } else if (paymentStatus === 'canceled') {
      console.log('❌ Pagamento PayPal cancelado');
      setPaymentFeedback({
        type: 'error',
        message: 'Pagamento cancelado. Tente novamente.'
      });
    }
   
  }, [searchParams, userEmail]); // processSuccessfulPayment é estável

  const processSuccessfulPayment = async (paymentData: any) => {
    try {
      console.log('🔥 Processando pagamento bem-sucedido:', paymentData);
      
      const response = await fetch('/api/webhook/payment-success', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Pagamento processado com sucesso');
        setIsSubscriber(true);
        
        // Atualizar localStorage
        localStorage.setItem('hasSubscription', 'true');
        localStorage.setItem('subscriptionExpiry', result.expirationDate);
        
        // Definir cookies
        document.cookie = `hasSubscription=true; path=/; max-age=${30 * 24 * 60 * 60}`;
        
        // Redirecionar para galeria após 3 segundos
        setTimeout(() => {
          router.push('/galeria-assinantes');
        }, 3000);
      } else {
        console.error('❌ Erro ao processar pagamento:', result.message);
        setPaymentFeedback({
          type: 'error',
          message: 'Erro ao processar pagamento. Entre em contato com o suporte.'
        });
      }
    } catch (error) {
      console.error('❌ Erro ao processar pagamento:', error);
      setPaymentFeedback({
        type: 'error',
        message: 'Erro interno. Tente novamente.'
      });
    }
  };

  const checkSubscriptionStatus = async () => {
    if (!userEmail) return;
    
    try {
      const response = await fetch('/api/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'checkSubscription',
          customerEmail: userEmail
        })
      });

      const data = await response.json();
      
      if (data.success && data.isSubscriber) {
        setIsSubscriber(true);
        setSubscriptionData(data.subscription);
        console.log('✅ Usuário já é assinante');
      }
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrency = async () => {
    try {
      setIsLoadingCurrency(true);
      // Detect user's browser locale for proper currency conversion
      // Default to 'pt-BR' as the application is primarily for Brazilian users
      const userLocale = typeof navigator !== 'undefined' ? navigator.language : 'pt-BR';
      const selectedOption = billingOptions[selectedBillingCycle];
      const result = await convertCurrency({
        targetLocale: userLocale,
        baseAmount: selectedOption.baseAmountBRL,
      });
      
      if (result && result.amount && result.currencyCode) {
        setPaymentInfo({
          value: result.amount.toFixed(2),
          currency: result.currencyCode,
          symbol: result.currencySymbol
        });
        // Set isBrazil based on detected locale or currency
        const lowerLocale = userLocale.toLowerCase();
        const isBrazilLocale = lowerLocale.startsWith('pt-br') || 
                               lowerLocale === 'pt' ||
                               result.currencyCode === 'BRL';
        setIsBrazil(isBrazilLocale);
      }
    } catch (error) {
      console.error('Erro ao converter moeda:', error);
      // Keep default isBrazil as true on error (fail-safe)
    } finally {
      setIsLoadingCurrency(false);
    }
  };

  const handlePaymentSuccess = (paymentData: any) => {
    console.log('✅ Pagamento bem-sucedido:', paymentData);
    setPaymentFeedback({
      type: 'success',
      message: 'Pagamento aprovado! Sua assinatura foi ativada.'
    });
    processSuccessfulPayment(paymentData);
  };

  // Se não está autenticado, mostrar loading
  if (!isAuthenticated || !userEmail) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se já é assinante, mostrar mensagem de sucesso
  if (isSubscriber) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">Assinatura Ativa!</h1>
          <p className="text-muted-foreground mb-6">
            Você já possui uma assinatura ativa. Aproveite todo o conteúdo exclusivo!
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => {
                console.log('🔍 [AssinantePage] Botão Acessar Galeria clicado');
                console.log('🔍 [AssinantePage] Tentando navegar para /galeria-assinantes');
                try {
                  router.push('/galeria-assinantes');
                  console.log('✅ [AssinantePage] router.push executado com sucesso');
                } catch (error) {
                  console.error('❌ [AssinantePage] Erro no router.push:', error);
                }
              }}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 w-full"
            >
              Acessar Galeria
            </Button>
            
            {/* Botão alternativo com link direto */}
            <Link href="/galeria-assinantes">
              <Button 
                variant="outline"
                className="w-full border-green-500 text-green-500 hover:bg-green-50"
              >
                🔗 Galeria (Link Direto)
              </Button>
            </Link>
            
            {/* Botão de debug */}
            <Button 
              onClick={() => {
                console.log('🔧 [Debug] Informações da página:');
                console.log('- URL atual:', window.location.href);
                console.log('- isSubscriber:', isSubscriber);
                console.log('- router disponível:', !!router);
                console.log('- subscriptionData:', subscriptionData);
                
                // Tentar navegação direta
                window.location.href = '/galeria-assinantes';
              }}
              variant="secondary"
              size="sm"
              className="w-full"
            >
              🔧 Debug & Ir Direto
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header com imagem de fundo - igual à página inicial */}
      <div 
        className="relative w-full h-[40vh] sm:h-[50vh] flex items-center justify-center"
      >
        {(() => {
          const coverSrc = coverPhoto || "https://placehold.co/1200x400.png";
          const coverIsSvg = typeof coverSrc === 'string' && /\.svg(\?|#|$)/i.test(coverSrc);

          return (
            <Image
              src={coverSrc}
              alt="Background"
              fill
              className="opacity-80 object-cover"
              data-ai-hint="male model"
              unoptimized={coverIsSvg}
            />
          );
        })()}
        {/* Overlay escuro para aumentar contraste */}
        <div className="absolute inset-0 bg-black/60 z-10" />
        
        {/* Conteúdo do header */}
        <div className="relative z-20 text-center px-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
            <div className="p-2 sm:p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold text-white shadow-neon-white"
                style={{ fontFamily: '"Times New Roman", Times, serif', WebkitTextStroke: '2px #222', textShadow: '0 0 16px #fff, 0 0 32px #fff8' }}>
              Assinatura Premium
            </h1>
          </div>
          <p className="text-sm sm:text-lg text-white/80 max-w-2xl mx-auto">
            Acesso completo ao conteúdo exclusivo e premium
          </p>
        </div>
      </div>

      <main className="flex-grow flex flex-col items-center w-full">
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto px-4">
          
          <div className="w-full max-w-xs sm:max-w-sm flex flex-col items-center gap-y-4 pt-8 sm:pt-14">
            {/* Card principal de assinatura */}
            <Card className="w-full bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 sm:p-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400" />
                  <h2 className="text-xl sm:text-2xl font-bold text-white">Assinatura {billingOptions[selectedBillingCycle].label}</h2>
                </div>
                
                <div className="text-center">
                  {isLoadingCurrency ? (
                    <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 mx-auto animate-spin text-white" />
                  ) : (
                    <p className="text-6xl sm:text-7xl md:text-8xl font-bold text-white">
                      {paymentInfo.value.split('.')[0]}
                      <span className="text-3xl sm:text-5xl md:text-6xl align-top">.{paymentInfo.value.split('.')[1]}</span>
                      <span className="text-2xl sm:text-3xl md:text-4xl font-normal align-top ml-1">{paymentInfo.symbol}</span>
                    </p>
                  )}
                  <p className="text-sm sm:text-base text-white/70 mt-2">{billingOptions[selectedBillingCycle].label}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 mb-2">
                  {(Object.keys(billingOptions) as BillingCycle[]).map((cycleKey) => {
                    const cycle = billingOptions[cycleKey];
                    const isActive = selectedBillingCycle === cycleKey;

                    return (
                      <Button
                        key={cycleKey}
                        type="button"
                        variant={isActive ? 'default' : 'outline'}
                        className={`text-xs sm:text-sm ${isActive ? 'bg-white text-black hover:bg-white/90' : 'text-white border-white/30 hover:bg-white/10'}`}
                        onClick={() => setSelectedBillingCycle(cycleKey)}
                      >
                        {cycle.label}
                      </Button>
                    );
                  })}
                </div>

                {/* Métodos de pagamento */}
                <div className="space-y-3 mt-1">
                  <PaymentMethods 
                    selectedPlan={{
                      id: selectedBillingCycle,
                      name: `Assinatura ${billingOptions[selectedBillingCycle].label}`,
                      price: parseFloat(paymentInfo.value),
                      duration: billingOptions[selectedBillingCycle].durationDays,
                      features: ['Acesso completo ao conteúdo exclusivo', 'Downloads ilimitados', 'Atualizações regulares'],
                      currency: paymentInfo.currency,
                      symbol: paymentInfo.symbol
                    }}
                    isBrazil={isBrazil}
                    originalPriceBRL={billingOptions[selectedBillingCycle].baseAmountBRL}
                    onPaymentSuccess={() => {
                      console.log('✅ Pagamento bem-sucedido via PaymentMethods');
                      setPaymentFeedback({
                        type: 'success',
                        message: 'Pagamento aprovado! Sua assinatura foi ativada.'
                      });
                    }}
                  />
                </div>
              </div>
            </Card>

            {/* Informações de segurança */}
            <Card className="w-full bg-card backdrop-blur-sm rounded-xl border border-border p-4 sm:p-3 mt-2">
              <div className="text-center">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Informações de Segurança</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <Shield className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-foreground">SSL Seguro</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                      <Lock className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-foreground">Dados Criptografados</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-foreground">Pagamento Seguro</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Botão voltar */}
            <Button 
              variant="outline" 
              onClick={() => router.push('/')}
              className="border-white/20 text-white hover:bg-white/10 w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Início
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}

// Componente principal com proteção
export default function AssinantePage() {
  return (
    <ProtectedRoute requiresAuth={true} redirectTo="/auth/face">
      <AssinantePageContent />
    </ProtectedRoute>
  );
}
