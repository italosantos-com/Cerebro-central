"use client";

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Camera, Link as LinkIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { useFaceIDAuth } from '@/contexts/face-id-auth-context';
import { useAuth } from '@/contexts/AuthProvider';
import { useRouter } from 'next/navigation';
import { useProfileConfig } from '@/hooks/use-profile-config';
import { useSubscriptionSettings } from '@/hooks/use-subscription-settings';
import { InstagramCallbackHandler } from '@/components/InstagramCallbackHandler';
import { LocalizedText } from '@/components/common/LocalizedText';
import { useLocalization } from '@/contexts/LocalizationContext';
import useApplePay from '@/hooks/useApplePay';
import { GooglePayButtonCSS } from '@/components/ui/GooglePayButtonCSS';
import { ApplePayButtonCSS } from '@/components/ui/ApplePayButtonCSS';

// Split below-the-fold sections to reduce initial JS
const FeatureMarquee = dynamic(() => import('@/components/feature-marquee'), { ssr: false, loading: () => <div style={{ height: 96 }} /> });
const AboutSection = dynamic(() => import('@/components/about-section'), { ssr: false, loading: () => <div style={{ height: 200 }} /> });
const GallerySection = dynamic(() => import('@/components/gallery/gallery-section'), { ssr: false, loading: () => <div style={{ height: 240 }} /> });
const LocationMap = dynamic(() => import('@/components/location-map'), { ssr: false, loading: () => <div style={{ height: 240 }} /> });
const ReviewsFormSection = dynamic(() => import('@/components/reviews/reviews-form-section'), { ssr: false, loading: () => <div style={{ height: 200 }} /> });

// Split payment modals and optional UI
const MercadoPagoCheckoutModal = dynamic(() => import('@/components/mercadopago-checkout-modal'), { ssr: false });
const GPayPaymentModal = dynamic(() => import('@/components/gpay-payment-modal'), { ssr: false });
const ApplePayPaymentModal = dynamic(() => import('@/components/applepay-payment-modal'), { ssr: false });
const PayPalButtonsV5 = dynamic(() => import('@/components/paypal-buttons-v5'), { ssr: false });
const LoginTypeModal = dynamic(() => import('@/components/login-type-modal'), { ssr: false });
// Use relative import to avoid occasional path alias resolution glitches during typecheck
type SignUpTypeModalProps = { isOpen: boolean; onClose: () => void };
const SignUpTypeModal = dynamic<SignUpTypeModalProps>(
    () => import('../components/signup-type-modal'),
    { ssr: false }
);

export default function Home() {
    const { toast } = useToast();
    const router = useRouter();
    const { isAuthenticated, userEmail } = useFaceIDAuth();
    const { user: firebaseUser, userProfile } = useAuth();
    const { coverPhoto, profilePhoto, settings: profileSettings, loading: profileLoading } = useProfileConfig();
    const { pixValue: adminPixValue, loading: subscriptionLoading, refreshSettings } = useSubscriptionSettings();
    const { translations, currency: localizedCurrency } = useLocalization();

    const [paymentInfo, setPaymentInfo] = useState(() => ({
        value: '99.00',
        currency: 'BRL',
        symbol: 'R$'
    }));
    const [localizationLoaded, setLocalizationLoaded] = useState(false);
    const [isLoadingCurrency, setIsLoadingCurrency] = useState(true);
    const [userCurrency, setUserCurrency] = useState<string>('BRL');
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
    const localizedPlanLabel = selectedPlan === 'annual'
        ? (translations['pricing.planLabelAnnual'] || 'Assinatura Anual')
        : (translations['pricing.planLabel'] || 'Assinatura Mensal');
    const localizedPlanDescription = `${localizedPlanLabel} Premium`;

    // State to track image loading errors
    const [profilePhotoError, setProfilePhotoError] = useState(false);
    const [coverPhotoError, setCoverPhotoError] = useState(false);
    const [manualProfilePhotoUrl, setManualProfilePhotoUrl] = useState<string | null>(null);
    const [isSavingProfilePhoto, setIsSavingProfilePhoto] = useState(false);
    const [profilePhotoCacheKey, setProfilePhotoCacheKey] = useState<number>(Date.now());

    // DETECÇÃO DE MOEDA DESABILITADA - SEMPRE BRL
    /* 
    // Detectar moeda do usuário baseada na localização
    useEffect(() => {
        const detectUserCurrency = () => {
            try {
                const locale = navigator.language || 'pt-BR';
                const currencyMap: Record<string, string> = {
                    'en-US': 'USD',
                    'en-GB': 'GBP', 
                    'pt-BR': 'BRL',
                    'es': 'EUR',
                    'fr': 'EUR',
                    'de': 'EUR',
                    'it': 'EUR'
                };
                
                const detectedCurrency = currencyMap[locale] || 'BRL';
                setUserCurrency(detectedCurrency);
            } catch (error) {
                setUserCurrency('BRL');
            }
        };
        
        detectUserCurrency();
    }, []);
    */
    const [isPixCheckoutModalOpen, setIsPixCheckoutModalOpen] = useState(false);
    const [isGPayModalOpen, setIsGPayModalOpen] = useState(false);
    const [isLoginTypeModalOpen, setIsLoginTypeModalOpen] = useState(false);
    const [isSignUpTypeModalOpen, setIsSignUpTypeModalOpen] = useState(false);
    const [isApplePayModalOpen, setIsApplePayModalOpen] = useState(false);
    const [isApplePayProcessing, setIsApplePayProcessing] = useState(false);

    const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');
    const [priceInteger, priceDecimals] = paymentInfo.value.split('.');
    const displayProfileName = profileSettings?.name || 'Italo Santos';

    const applePay = useApplePay({
        merchantId: process.env.NEXT_PUBLIC_APPLEPAY_MERCHANT_ID || 'merchant.com.studiofirebase',
        currency: paymentInfo.currency,
        countryCode: 'BR'
    });

    // Reset error states when images change
    useEffect(() => {
        setProfilePhotoError(false);
        setManualProfilePhotoUrl(profilePhoto || null);
        setProfilePhotoCacheKey(Date.now());
    }, [profilePhoto]);

    useEffect(() => {
        setCoverPhotoError(false);
    }, [coverPhoto]);

    // Helper function to validate and get safe image URL
    const getSafeImageUrl = (url: string | null | undefined, fallback: string): string => {
        if (!url || url.trim() === '') {
            return fallback;
        }
        // Check if URL is valid - allow relative URLs (starting with /) and absolute URLs
        if (url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        // If URL doesn't match expected patterns, use fallback
        return fallback;
    };

    const appendCacheBuster = (url: string): string => {
        if (!url || url.startsWith('data:')) return url;
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}v=${profilePhotoCacheKey}`;
    };

    const promptLoginForPayment = useCallback(() => {
        toast({
            title: 'Entre para assinar',
            description: 'Faça login para concluir o pagamento com PayPal.',
        });
        setIsLoginTypeModalOpen(true);
    }, [toast]);

    const handleEditProfilePhoto = useCallback(async () => {
        if (!firebaseUser) {
            toast({
                variant: 'destructive',
                title: 'Login necessário',
                description: 'Entre com uma conta de admin para alterar a foto do perfil.'
            });
            return;
        }

        const currentUrl = manualProfilePhotoUrl || profilePhoto || '';
        const nextUrlRaw = window.prompt(
            'Cole a URL da nova foto de perfil (URL de upload do admin).\nDica: você pode gerar no /admin/fotos.',
            currentUrl
        );

        if (nextUrlRaw === null) return;

        const nextUrl = nextUrlRaw.trim();
        if (!nextUrl) {
            toast({
                variant: 'destructive',
                title: 'URL inválida',
                description: 'Informe uma URL válida para a foto.'
            });
            return;
        }

        const isValidUrl = nextUrl.startsWith('/') || nextUrl.startsWith('http://') || nextUrl.startsWith('https://');
        if (!isValidUrl) {
            toast({
                variant: 'destructive',
                title: 'Formato inválido',
                description: 'Use uma URL iniciando com http://, https:// ou /.'
            });
            return;
        }

        if (!profileSettings) {
            toast({
                variant: 'destructive',
                title: 'Configuração indisponível',
                description: 'Aguarde o carregamento do perfil e tente novamente.'
            });
            return;
        }

        setIsSavingProfilePhoto(true);
        try {
            const idToken = await firebaseUser.getIdToken();
            const updatedSettings = {
                ...profileSettings,
                profilePictureUrl: nextUrl,
            };

            const response = await fetch('/api/admin/profile-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ settings: updatedSettings }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data?.message || 'Não foi possível salvar a nova foto.');
            }

            setManualProfilePhotoUrl(nextUrl);
            setProfilePhotoError(false);
            toast({
                title: 'Foto atualizada',
                description: 'A foto do círculo da página inicial foi atualizada.'
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro ao atualizar foto',
                description: error?.message || 'Falha ao salvar a nova foto de perfil.'
            });
        } finally {
            setIsSavingProfilePhoto(false);
        }
    }, [firebaseUser, manualProfilePhotoUrl, profilePhoto, profileSettings, toast]);

    const openAdminPhotosUpload = useCallback(() => {
        window.open('/admin/fotos', '_blank', 'noopener,noreferrer');
    }, []);


    // VERIFICAÇÃO RIGOROSA DE AUTENTICAÇÃO
    useEffect(() => {
        const checkAuthentication = () => {




            // Verificar múltiplas fontes de autenticação
            const localStorage_auth = localStorage.getItem('isAuthenticated') === 'true';
            const sessionStorage_auth = sessionStorage.getItem('isAuthenticated') === 'true';
            const context_auth = isAuthenticated;
            const hasUserEmail = userEmail && userEmail.trim() !== '';
            const hasUserProfile = userProfile && userProfile.email;
            const hasFirebaseUser = firebaseUser && firebaseUser.email;

            // CRITÉRIOS RIGOROSOS: deve estar autenticado E ter email válido
            const isAuthenticatedAnywhere = localStorage_auth || sessionStorage_auth || context_auth || hasFirebaseUser;
            const hasValidEmail = hasUserEmail || hasUserProfile || hasFirebaseUser;



            if (isAuthenticatedAnywhere) {

                setAuthStatus('authenticated');
                return;
            }


            setAuthStatus('unauthenticated');
        };

        // Verificar imediatamente
        checkAuthentication();

        // Verificar periodicamente a cada 3 segundos
        const authInterval = setInterval(checkAuthentication, 3000);

        return () => clearInterval(authInterval);
    }, [isAuthenticated, userEmail, userProfile, firebaseUser, router, toast]);

    // Inicialização de localização orquestrada (idioma + câmbio via localizationFlow)
    useEffect(() => {
        const initLocalization = async () => {
            if (subscriptionLoading || adminPixValue <= 0 || localizationLoaded) return;
            try {
                setIsLoadingCurrency(true);
                const locale = navigator.language || 'pt-BR';
                const baseAmount = selectedPlan === 'annual' ? adminPixValue * 12 : adminPixValue;
                const res = await fetch('/api/localization/init', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ baseAmountBRL: baseAmount, locale })
                });
                if (!res.ok) throw new Error('Falha ao inicializar localização');
                const raw = await res.text();
                let data: any = null;
                try {
                    data = raw ? JSON.parse(raw) : null;
                } catch (error) {
                    console.error('[Localization] Resposta inválida:', raw?.slice?.(0, 200));
                    throw new Error('Resposta inválida do servidor de localização', { cause: error });
                }
                if (data.success) {
                    setPaymentInfo({
                        value: data.convertedAmount.toFixed(2),
                        currency: data.currencyCode,
                        symbol: data.currencySymbol
                    });
                } else {
                    setPaymentInfo({
                        value: baseAmount.toFixed(2),
                        currency: 'BRL',
                        symbol: 'R$'
                    });
                }
                setLocalizationLoaded(true);
            } catch (e) {
                const baseAmount = selectedPlan === 'annual' ? adminPixValue * 12 : adminPixValue;
                setPaymentInfo({
                    value: baseAmount.toFixed(2),
                    currency: 'BRL',
                    symbol: 'R$'
                });
            } finally {
                setIsLoadingCurrency(false);
            }
        };
        initLocalization();
    }, [adminPixValue, subscriptionLoading, localizationLoaded, selectedPlan]);

    useEffect(() => {
        if (adminPixValue <= 0) return;
        setLocalizationLoaded(false);
    }, [selectedPlan, adminPixValue]);



    const handlePaymentSuccess = async (paymentDetails?: any) => {

        toast({ title: 'Pagamento bem-sucedido!', description: 'Seja bem-vindo(a) ao conteúdo exclusivo!' });

        // Salvar localmente para compatibilidade
        localStorage.setItem('hasPaid', 'true');
        localStorage.setItem('hasSubscription', 'true');
        localStorage.setItem('userType', 'vip');
        localStorage.setItem('subscriptionDate', new Date().toISOString());


        // ✅ SIMPLIFICADO: Usar API de subscription diretamente
        if (paymentDetails) {
            try {
                const response = await fetch('/api/subscription', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'createSubscription',
                        customerEmail: paymentDetails.email || 'unknown@example.com',
                        paymentId: paymentDetails.id || `payment_${Date.now()}`
                    }),
                });

                if (response.ok) {

                } else {

                }
            } catch (error) {

                // Não bloquear o fluxo se der erro ao salvar
            }
        }


        router.push('/assinante');
    };

    const openPaymentModal = () => {
        setIsPixCheckoutModalOpen(true);
    };

    // Ajusta os handlers dos botões
    const handleGooglePayClick = () => {
        if (authStatus !== 'authenticated') {
            toast({
                variant: "destructive",
                title: "Login Necessário",
                description: "Faça login com Google, Apple ou Face ID para usar o Google Pay e assinar.",
            });
            return;
        }
        setIsGPayModalOpen(true);
    };

    const handleApplePayClick = async () => {
        if (authStatus !== 'authenticated') {
            toast({
                variant: "destructive",
                title: "Login Necessário",
                description: "Faça login com Google, Apple ou Face ID para usar o Apple Pay e assinar.",
            });
            return;
        }

        if (!applePay.isAvailable) {
            toast({
                title: 'Apple Pay indisponível',
                description: 'Mostrando alternativa segura para finalizar a assinatura.',
            });
            setIsApplePayModalOpen(true);
            return;
        }

        try {
            setIsApplePayProcessing(true);
            const result = await applePay.initiatePayment(paymentInfo.value, {
                displayItems: [
                    { label: localizedPlanDescription, amount: paymentInfo.value, type: 'final' }
                ],
                requestBilling: true,
                requestPayerEmail: true,
                requestPayerName: true,
            });

            handlePaymentSuccess({
                id: result?.transactionId || `applepay-${Date.now()}`,
                email: firebaseUser?.email || userProfile?.email || userEmail || 'applepay@local',
            });
        } catch (error: any) {
            console.error('[Apple Pay] erro ao iniciar pagamento', error);
            toast({
                variant: 'destructive',
                title: 'Erro no Apple Pay',
                description: error?.message || 'Não foi possível iniciar o Apple Pay. Tente novamente.',
            });
        } finally {
            setIsApplePayProcessing(false);
        }
    };

    const appearance = profileSettings?.appearanceSettings;
    const neonGlowColor = appearance?.neonGlowColor || 'var(--app-neon-color)';
    const fontFamily = appearance?.fontFamily || 'var(--app-font-family)';

    return (
        <>
            <div
                className="relative w-full h-[35vh] sm:h-[40vh] md:h-[50vh] flex items-center justify-center"
            >
                {(() => {
                    // Use safe URL with fallback
                    const safeCoverUrl = coverPhotoError
                        ? "https://placehold.co/1200x400.png"
                        : getSafeImageUrl(coverPhoto, "https://placehold.co/1200x400.png");
                    const coverIsSvg = typeof safeCoverUrl === 'string' && /\.svg(\?|#|$)/i.test(safeCoverUrl);

                    return (
                        <Image
                            key={safeCoverUrl} // Force re-render when URL changes
                            src={safeCoverUrl}
                            alt="Background"
                            fill
                            className="opacity-80 object-contain bg-black/15"
                            data-ai-hint="male model"
                            priority
                            unoptimized={coverIsSvg}
                            onError={() => {
                                console.log('🖼️ Erro ao carregar imagem de capa, usando fallback');
                                setCoverPhotoError(true);
                            }}
                        />
                    );
                })()}

                {/* Circular profile photo in the center */}
                <div className="absolute z-20 rounded-full overflow-hidden border-4 border-white shadow-2xl w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <Image
                        key={profilePhotoError ? 'fallback' : (manualProfilePhotoUrl || profilePhoto || 'default')} // Force re-render on error with stable key
                        src={profilePhotoError
                            ? '/placeholder-photo.svg'
                            : appendCacheBuster(getSafeImageUrl(manualProfilePhotoUrl || profilePhoto, '/placeholder-photo.svg'))
                        }
                        alt="Profile"
                        fill
                        className="object-contain bg-black/10 p-1"
                        priority
                        onError={() => {
                            console.error('🖼️ Erro ao carregar foto de perfil, usando placeholder');
                            setProfilePhotoError(true);
                        }}
                    />

                    {firebaseUser && (
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/45 px-2 py-1">
                            <button
                                type="button"
                                onClick={handleEditProfilePhoto}
                                disabled={isSavingProfilePhoto}
                                className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-[10px] sm:text-xs font-medium text-white hover:bg-white/30 disabled:opacity-60"
                                aria-label="Alterar foto de perfil"
                            >
                                {isSavingProfilePhoto ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                                Alterar
                            </button>
                            <button
                                type="button"
                                onClick={openAdminPhotosUpload}
                                className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-[10px] sm:text-xs font-medium text-white hover:bg-white/30"
                                aria-label="Abrir upload de imagens do admin"
                            >
                                <LinkIcon className="h-3 w-3" />
                                URL upload
                            </button>
                        </div>
                    )}
                </div>

                {/* Nome removido daqui - agora está no header-top-bar entre o botão home e tradutor */}
            </div>

            {/* Visual separator between cover image and content */}
            <div className="w-full border-t-2 border-primary/40 shadow-neon-red-light my-2" />

            <main className="flex-grow flex flex-col items-center w-full">
                <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto px-3 sm:px-4">

                    <div className="w-full max-w-[320px] sm:max-w-md flex flex-col items-center gap-y-1 sm:gap-y-1.5 pt-6 sm:pt-8 md:pt-14">
                        <Button
                            className="w-full h-14 sm:h-16 md:h-18 text-base sm:text-lg md:text-xl flex items-center justify-center overflow-hidden transform scale-110 sm:scale-115 md:scale-120 transition-all duration-300"
                            style={{
                                backgroundColor: 'var(--app-button-color)',
                                color: 'var(--app-button-text-color)',
                                boxShadow: '0 4px 12px rgba(10, 132, 255, 0.25)'
                            }}
                            onClick={() => setIsSignUpTypeModalOpen(true)}
                        >
                            {authStatus === 'authenticated' && (firebaseUser || userProfile) ? (
                                <div className="flex items-center justify-start gap-3 w-full min-w-0 px-2">
                                    {(manualProfilePhotoUrl || profilePhoto || firebaseUser?.photoURL || userProfile?.photoURL) && (
                                        <Image
                                            src={appendCacheBuster(getSafeImageUrl((manualProfilePhotoUrl || profilePhoto || firebaseUser?.photoURL || userProfile?.photoURL || ''), '/placeholder-photo.svg'))}
                                            alt="Profile"
                                            width={40}
                                            height={40}
                                            className="rounded-full h-10 w-10 object-contain bg-black/10"
                                            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect width="40" height="40" fill="%23ddd"/%3E%3C/svg%3E';
                                            }}
                                        />
                                    )}
                                    <div className="flex flex-col items-start justify-center min-w-0 flex-1">
                                        <span className="font-semibold text-sm sm:text-base truncate w-full">
                                            {firebaseUser?.displayName || userProfile?.displayName || 'Usuário'}
                                        </span>
                                        {(firebaseUser?.email || userProfile?.email) && (
                                            <span className="text-xs sm:text-sm opacity-90 truncate w-full">
                                                {firebaseUser?.email || userProfile?.email}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center w-full min-w-0">
                                    <LocalizedText id="cta.primary" as="span" className="truncate min-w-0" />
                                    <div className="flex items-center justify-center gap-1" style={{ marginTop: '-4px' }}>
                                        <Image src="/apple-icon.svg" alt="Sign in with Apple" width={14} height={14} className="h-3.5 w-3.5" />
                                        <span className="text-xs">•</span>
                                        <Image src="/faceid-icon.svg" alt="Sign in with Face ID" width={14} height={14} className="h-3.5 w-3.5" />
                                        <span className="text-xs">•</span>
                                        <Image src="/google-icon.svg" alt="Sign in with Google" width={14} height={14} className="h-3.5 w-3.5" />
                                    </div>
                                </div>
                            )}
                        </Button>

                        <div className="flex items-center justify-center w-full max-w-md mt-1 sm:mt-1.5 md:mt-2 gap-x-1 sm:gap-x-2 md:gap-x-4">
                            <div className="flex-1 h-[56px] sm:h-[64px] md:h-[72px] p-[1px] rounded-[12px] border border-white/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] transition-transform hover:scale-105 active:scale-95">
                                <GooglePayButtonCSS
                                    onClick={handleGooglePayClick}
                                    width="100%"
                                    height="100%"
                                    className="w-full h-full rounded-[11px] overflow-hidden"
                                    ariaLabel="Pagar com Google Pay"
                                />
                            </div>
                            <div className="flex flex-col items-center justify-center px-1 w-[50px] sm:w-[60px] md:w-[70px]">
                                <button
                                    className="w-full transition-transform hover:scale-105 flex flex-col items-center justify-center"
                                    onClick={openPaymentModal}
                                    aria-label="Pagar com PIX"
                                    disabled={isLoadingCurrency}
                                >
                                    <Image
                                        src="/pix.png"
                                        alt="PIX"
                                        width={55}
                                        height={98}
                                        className="w-full h-auto object-contain max-h-[150px] sm:max-h-[170px] md:max-h-[190px]"
                                    />
                                    <span className="text-[7px] sm:text-[8px] md:text-[10px] text-primary mt-1 text-nowrap">PIX</span>
                                </button>
                            </div>
                            <div className="flex-1 h-[56px] sm:h-[64px] md:h-[72px] p-[1px] rounded-[12px] border border-white/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] transition-transform hover:scale-105 active:scale-95">
                                {isApplePayProcessing ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--app-text-color)' }} />
                                    </div>
                                ) : (
                                    <ApplePayButtonCSS
                                        onClick={handleApplePayClick}
                                        disabled={isApplePayProcessing}
                                        width="100%"
                                        height="100%"
                                        className="w-full h-full rounded-[11px] overflow-hidden"
                                        ariaLabel="Pagar com Apple Pay"
                                        buttonType="plain"
                                        buttonStyle="black"
                                    />
                                )}
                            </div>
                        </div>
                        {/* Aviso substituído por notificações (toast) ao clicar */}

                        <div className="text-center py-1 sm:py-1.5 mt-3 sm:mt-4 md:mt-5 min-h-[70px] sm:min-h-[80px] md:min-h-[100px] flex flex-col items-center justify-center">
                            {isLoadingCurrency ? (
                                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 mx-auto animate-spin" style={{ color: 'var(--app-text-color)' }} />
                            ) : (
                                <p className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-none" style={{ color: 'var(--app-number-color)' }}>
                                    <span className="inline-block tracking-tight" style={{ fontSize: '240%', lineHeight: 1 }}>
                                        {priceInteger || paymentInfo.value}
                                    </span>
                                    <span className="text-2xl sm:text-3xl md:text-4xl align-top">
                                        .{(priceDecimals ?? '00').padEnd(2, '0')}
                                    </span>
                                    <span className="text-lg sm:text-xl md:text-2xl font-normal align-top ml-1">{paymentInfo.symbol}</span>
                                </p>
                            )}
                            <div className="my-2 w-full flex items-center justify-center gap-2">
                                <Button
                                    type="button"
                                    variant={selectedPlan === 'monthly' ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-5 px-2 text-[10px] leading-none"
                                    onClick={() => setSelectedPlan('monthly')}
                                >
                                    Mensal
                                </Button>
                                <Button
                                    type="button"
                                    variant={selectedPlan === 'annual' ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-5 px-2 text-[10px] leading-none"
                                    onClick={() => setSelectedPlan('annual')}
                                >
                                    Anual
                                </Button>
                            </div>
                            {/* Removed unwanted currency artifact for mobile/desktop */}
                            <div className="w-full mt-0.5">
                                <div className="w-full flex items-center justify-center px-2 py-1">
                                    <PayPalButtonsV5
                                        amount={paymentInfo.value}
                                        currency={paymentInfo.currency}
                                        description={localizedPlanDescription}
                                        className="w-full"
                                        forceRefreshKey={`${paymentInfo.currency}-${selectedPlan}`}
                                        style={{ layout: 'vertical', color: 'silver', shape: 'rect', label: 'paypal' }}
                                        onClick={(_data, actions) => {
                                            if (authStatus !== 'authenticated') {
                                                promptLoginForPayment();
                                                return actions.reject();
                                            }
                                            return actions.resolve();
                                        }}
                                        onSuccess={(details: any) => {
                                            handlePaymentSuccess({
                                                id: details?.id || `paypal-${Date.now()}`,
                                                email: details?.payer?.email_address || firebaseUser?.email || userProfile?.email || userEmail || 'paypal@local',
                                            });
                                        }}
                                        onError={(error: any) => {
                                            toast({
                                                variant: 'destructive',
                                                title: 'Erro no PayPal',
                                                description: error?.message || 'Não foi possível processar o pagamento PayPal.',
                                            });
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Selo de Segurança */}
                        <div className="flex items-center justify-center gap-x-3 sm:gap-x-4 py-2 sm:py-2.5 md:py-3 mt-1 sm:mt-1.5 md:mt-2 px-4 sm:px-6 md:px-8 bg-card border border-primary/30 rounded-lg shadow-neon-white hover:shadow-neon-red-strong transition-all duration-300">
                            <Image
                                src="/shield.svg"
                                alt="Selo de segurança"
                                width={64}
                                height={64}
                                className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16"
                                loading="lazy"
                            />
                            <div className="text-center">
                                <LocalizedText id="security.title" as="p" className="text-xs sm:text-sm md:text-base font-semibold text-primary" />
                                <LocalizedText id="security.subtitle" as="p" className="text-[10px] sm:text-xs md:text-sm text-muted-foreground" />
                            </div>
                        </div>

                        {/* Botão Entrar */}
                        <div className="w-full max-w-[280px] sm:max-w-sm mt-3 sm:mt-4 md:mt-5">
                            <Button
                                onClick={() => setIsLoginTypeModalOpen(true)}
                                className="w-full h-12 sm:h-14 md:h-16 text-base sm:text-lg md:text-xl bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center overflow-hidden transform scale-110 sm:scale-115 md:scale-120 shadow-neon-white hover:shadow-neon-red-strong transition-all duration-300"
                            >
                                <div className="flex flex-col items-center justify-center w-full min-w-0 overflow-hidden">
                                    <LocalizedText id="cta.loginButton" as="span" className="truncate min-w-0 text-center" />
                                </div>
                            </Button>
                        </div>


                    </div>
                </div>

                <FeatureMarquee />
                <AboutSection />
                <GallerySection />
                <LocationMap />
                <ReviewsFormSection
                    sendToSecretChatEnabled={profileSettings?.reviewSettings?.sendReviewToSecretChat ?? true}
                />
            </main>

            <MercadoPagoCheckoutModal
                isOpen={isPixCheckoutModalOpen}
                onOpenChange={setIsPixCheckoutModalOpen}
                amount={parseFloat(paymentInfo.value)}
                currency={paymentInfo.currency}
                onPaymentSuccess={handlePaymentSuccess}
            />
            <GPayPaymentModal
                isOpen={isGPayModalOpen}
                onOpenChange={setIsGPayModalOpen}
                amount={parseFloat(paymentInfo.value)}
                currency={paymentInfo.currency}
                symbol={paymentInfo.symbol}
                onPaymentSuccess={handlePaymentSuccess}
            />
            <LoginTypeModal
                isOpen={isLoginTypeModalOpen}
                onClose={() => setIsLoginTypeModalOpen(false)}
            />
            <SignUpTypeModal
                isOpen={isSignUpTypeModalOpen}
                onClose={() => setIsSignUpTypeModalOpen(false)}
            />
            <ApplePayPaymentModal
                isOpen={isApplePayModalOpen}
                onOpenChange={setIsApplePayModalOpen}
                amount={parseFloat(paymentInfo.value)}
                currency={paymentInfo.currency}
                symbol={paymentInfo.symbol}
                onPaymentSuccess={handlePaymentSuccess}
            />

            {/* Handler para Instagram OAuth callback */}
            <InstagramCallbackHandler />

        </>
    );

}
