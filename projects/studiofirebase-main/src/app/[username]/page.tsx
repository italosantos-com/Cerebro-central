"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { KeyRound, Loader2, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthProvider';
import { LocalizedText } from '@/components/common/LocalizedText';
import { useLocalization } from '@/contexts/LocalizationContext';
import { getAdminByUsername } from '@/services/admin-auth-service';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import useApplePay from '@/hooks/useApplePay';
import { SUPERADMIN_USERNAME, isSuperAdminUsername } from '@/lib/superadmin-config';
import FooterByUid from '@/components/layout/footer-by-uid';
import { GooglePayButtonCSS } from '@/components/ui/GooglePayButtonCSS';
import { ApplePayButtonCSS } from '@/components/ui/ApplePayButtonCSS';

// Importações dinâmicas - mesmas da página principal
const FeatureMarquee = dynamic(() => import('@/components/feature-marquee'), { ssr: false, loading: () => <div style={{ height: 96 }} /> });
const AboutSection = dynamic(() => import('@/components/about-section'), { ssr: false, loading: () => <div style={{ height: 200 }} /> });
const GallerySection = dynamic(() => import('@/components/gallery/gallery-section'), { ssr: false, loading: () => <div style={{ height: 240 }} /> });
const LocationMap = dynamic(() => import('@/components/location-map'), { ssr: false, loading: () => <div style={{ height: 240 }} /> });
const ReviewsFormSection = dynamic(() => import('@/components/reviews/reviews-form-section'), { ssr: false, loading: () => <div style={{ height: 200 }} /> });
const PixPaymentModal = dynamic(() => import('@/components/pix-payment-modal'), { ssr: false });
const GPayPaymentModal = dynamic(() => import('@/components/gpay-payment-modal'), { ssr: false });
const ApplePayPaymentModal = dynamic(() => import('@/components/applepay-payment-modal'), { ssr: false });
const LoginTypeModal = dynamic(() => import('@/components/login-type-modal'), { ssr: false });
const PayPalHostedButton = dynamic(() => import('@/components/paypal-hosted-buttons-clean'), { ssr: false });
type SignUpTypeModalProps = { isOpen: boolean; onClose: () => void };
const SignUpTypeModal = dynamic<SignUpTypeModalProps>(() => import('@/components/signup-type-modal'), { ssr: false });

interface AdminProfile {
  uid: string;
  name: string;
  email: string;
  username: string;
  isMainAdmin: boolean;
  profileSettings?: {
    name: string;
    description?: string;
    profilePictureUrl: string;
    coverPhotoUrl: string;
    galleryPhotos: { url: string }[];
    appearanceSettings?: {
      textColor: string;
      numberColor: string;
      buttonColor: string;
      buttonTextColor: string;
      lineColor: string;
      neonGlowColor: string;
      containerColor: string;
      backgroundColor: string;
      fontFamily: string;
      fontSizePx: number;
      iconColor: string;
      userSidebarIconColor: string;
      adminSidebarIconColor: string;
      secretChatColor: string;
      whatsappBubbleColor: string;
    };
    socialMedia?: {
      instagram: string;
      twitter: string;
      youtube: string;
      whatsapp: string;
      telegram: string;
    };
    paymentSettings?: {
      pixValue: number;
      pixKey: string;
      pixKeyType: string;
    };
    reviewSettings?: {
      showReviews: boolean;
      moderateReviews: boolean;
      defaultReviewMessage: string;
      sendReviewToSecretChat?: boolean;
    };
    footerSettings?: any;
  };
}

export default function UsernamePage() {
  const params = useParams();
  const router = useRouter();
  const username = params?.username as string;

  useEffect(() => {
    if (!username) return;

    const reservedSlugs = new Set([
      'admin',
      'login',
      'auth',
      'api',
      'perfil',
      'dashboard',
      'galeria-assinantes',
      '_next'
    ]);

    if (reservedSlugs.has(username)) {
      window.location.assign(`/${username}`);
    }
  }, [username]);

  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();
  const { user: firebaseUser, userProfile } = useAuth();
  const { translations } = useLocalization();

  const [loginOpen, setLoginOpen] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);

  // Payment states - mesmos da página principal
  const [paymentInfo, setPaymentInfo] = useState(() => ({
    value: '99.00',
    currency: 'BRL',
    symbol: 'R$'
  }));
  const [localizationLoaded, setLocalizationLoaded] = useState(false);
  const [isLoadingCurrency, setIsLoadingCurrency] = useState(true);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [isGPayModalOpen, setIsGPayModalOpen] = useState(false);
  const [isApplePayModalOpen, setIsApplePayModalOpen] = useState(false);
  const [isApplePayProcessing, setIsApplePayProcessing] = useState(false);
  const [simulatedMethod, setSimulatedMethod] = useState<'pix' | 'google' | 'apple' | null>(null);
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  const [priceInteger, priceDecimals] = paymentInfo.value.split('.');
  const localizedPlanLabel = translations['pricing.planLabel'] || 'Assinatura Mensal';
  const localizedPlanDescription = `${localizedPlanLabel} Premium`;

  const applePay = useApplePay({
    merchantId: process.env.NEXT_PUBLIC_APPLEPAY_MERCHANT_ID || 'merchant.com.studiofirebase',
    currency: paymentInfo.currency,
    countryCode: 'BR'
  });

  useEffect(() => {
    async function loadAdminProfile() {
      if (!username) return;

      try {
        setLoading(true);
        setError(null);

        console.log('[UsernamePage] 🔍 Buscando perfil para username:', username);

        // Verificar se é o SuperAdmin (severepics)
        const isSuperAdmin = isSuperAdminUsername(username);

        if (isSuperAdmin) {
          console.log('[UsernamePage] ✅ Username é SuperAdmin (severepics) - usando perfil global');

          // Para SuperAdmin, buscar perfil global em admin/profileSettings
          const globalProfileRef = doc(db, 'admin', 'profileSettings');
          const globalProfileSnap = await getDoc(globalProfileRef);

          if (globalProfileSnap.exists()) {
            const globalData = globalProfileSnap.data() as any;
            const profileData: AdminProfile = {
              uid: 'superadmin',
              name: globalData.name || 'Italo Santos',
              email: globalData.email || 'pix@italosantos.com',
              username: SUPERADMIN_USERNAME,
              isMainAdmin: true,
              profileSettings: globalData
            };
            setAdminProfile(profileData);

            const pixValue = globalData.paymentSettings?.pixValue || 99;
            setPaymentInfo({
              value: pixValue.toFixed(2),
              currency: 'BRL',
              symbol: 'R$'
            });
            return;
          }
        }

        // Para outros admins, buscar por username
        const admin = await getAdminByUsername(username);

        console.log('[UsernamePage] 📋 Resultado da busca:', admin ? {
          uid: admin.uid,
          name: admin.name,
          username: admin.username,
          email: admin.email
        } : 'null - Admin não encontrado');

        if (!admin) {
          console.error('[UsernamePage] ❌ Perfil não encontrado para username:', username);
          setError('Perfil não encontrado');
          return;
        }

        // Buscar configurações de perfil individual
        const profilePath = `admins/${admin.uid}/profile/settings`;
        console.log('[UsernamePage] 🔍 Buscando configurações em:', profilePath);
        const profileRef = doc(db, 'admins', admin.uid, 'profile', 'settings');
        const profileSnap = await getDoc(profileRef);

        console.log('[UsernamePage] 📄 Documento de configurações existe?', profileSnap.exists());

        const profileData: AdminProfile = {
          uid: admin.uid,
          name: admin.name,
          email: admin.email,
          username: admin.username,
          isMainAdmin: admin.isMainAdmin || false,
          profileSettings: profileSnap.exists() ? profileSnap.data() as any : {
            name: admin.name,
            description: '',
            profilePictureUrl: 'https://placehold.co/150x150.png',
            coverPhotoUrl: 'https://placehold.co/1200x400.png',
            galleryPhotos: [],
            appearanceSettings: {
              buttonColor: '#ffffff',
              neonGlowColor: '#ffffff',
              fontFamily: '"Times New Roman", Times, serif'
            },
            paymentSettings: {
              pixValue: 99,
              pixKey: '',
              pixKeyType: 'email'
            }
          }
        };

        setAdminProfile(profileData);

        // Inicializar valor de assinatura com base no perfil do admin
        const pixValue = profileData.profileSettings?.paymentSettings?.pixValue || 99;
        setPaymentInfo({
          value: pixValue.toFixed(2),
          currency: 'BRL',
          symbol: 'R$'
        });
      } catch (err: any) {
        console.error('Erro ao carregar perfil:', err);
        setError('Erro ao carregar perfil');
      } finally {
        setLoading(false);
      }
    }

    loadAdminProfile();
  }, [username]);

  // Verificação de autenticação
  useEffect(() => {
    const checkAuthentication = () => {
      const localStorage_auth = localStorage.getItem('isAuthenticated') === 'true';
      const sessionStorage_auth = sessionStorage.getItem('isAuthenticated') === 'true';
      const storedEmail = localStorage.getItem('userEmail') || sessionStorage.getItem('userEmail');
      const hasStoredEmail = !!(storedEmail && storedEmail.trim() !== '');
      const hasUserProfile = userProfile && userProfile.email;
      const hasFirebaseUser = firebaseUser && firebaseUser.email;

      const isAuthenticatedAnywhere = localStorage_auth || sessionStorage_auth || hasFirebaseUser;

      if (isAuthenticatedAnywhere) {
        setAuthStatus('authenticated');
        return;
      }

      setAuthStatus('unauthenticated');
    };

    checkAuthentication();
    const authInterval = setInterval(checkAuthentication, 3000);
    return () => clearInterval(authInterval);
  }, [userProfile, firebaseUser]);

  // Inicialização de localização
  useEffect(() => {
    const initLocalization = async () => {
      if (!adminProfile || localizationLoaded) return;

      const pixValue = adminProfile.profileSettings?.paymentSettings?.pixValue || 99;

      try {
        setIsLoadingCurrency(true);
        const locale = navigator.language || 'pt-BR';
        const res = await fetch('/api/localization/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseAmountBRL: pixValue, locale })
        });

        if (!res.ok) throw new Error('Falha ao inicializar localização');

        const data = await res.json();
        if (data.success) {
          setPaymentInfo({
            value: data.convertedAmount.toFixed(2),
            currency: data.currencyCode,
            symbol: data.currencySymbol
          });
        } else {
          setPaymentInfo({
            value: pixValue.toFixed(2),
            currency: 'BRL',
            symbol: 'R$'
          });
        }
        setLocalizationLoaded(true);
      } catch (error) {
        console.error('[UsernamePage] Erro ao inicializar localização:', error);
        setPaymentInfo({
          value: pixValue.toFixed(2),
          currency: 'BRL',
          symbol: 'R$'
        });
      } finally {
        setIsLoadingCurrency(false);
      }
    };

    initLocalization();
  }, [adminProfile, localizationLoaded]);

  // Handlers de pagamento
  const handlePaymentSuccess = async (paymentDetails?: any) => {
    toast({ title: 'Pagamento bem-sucedido!', description: 'Seja bem-vindo(a) ao conteúdo exclusivo!' });

    localStorage.setItem('hasPaid', 'true');
    localStorage.setItem('hasSubscription', 'true');
    localStorage.setItem('userType', 'vip');
    localStorage.setItem('subscriptionDate', new Date().toISOString());

    if (paymentDetails) {
      try {
        await fetch('/api/subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'createSubscription',
            publicUsername: adminProfile?.username,
            customerEmail: paymentDetails.email || 'unknown@example.com',
            paymentId: paymentDetails.id || `payment_${Date.now()}`
          }),
        });
      } catch (error) {
        console.error('Erro ao salvar subscription:', error);
      }
    }

    router.push('/assinante');
  };

  const openPaymentModal = (method: 'pix') => {
    if (authStatus !== 'authenticated') {
      toast({
        variant: "destructive",
        title: "Login Necessário",
        description: "Faça login com Google, Apple ou Face ID para usar o Pix e assinar.",
      });
      return;
    }
    setSimulatedMethod(method);
    setIsPixModalOpen(true);
  };

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
        email: firebaseUser?.email || userProfile?.email || localStorage.getItem('userEmail') || sessionStorage.getItem('userEmail') || 'applepay@local',
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !adminProfile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-muted-foreground mb-6">Perfil não encontrado</p>
          <Button onClick={() => router.push('/')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a página inicial
          </Button>
        </div>
      </div>
    );
  }

  const coverPhoto = adminProfile.profileSettings?.coverPhotoUrl || 'https://placehold.co/1200x400.png';
  const coverPhotoIsSvg = typeof coverPhoto === 'string' && /\.svg(\?|#|$)/i.test(coverPhoto);
  const profileName = adminProfile.profileSettings?.name || adminProfile.name;
  const profileNameLength = profileName.trim().length;
  const profileNameFontSize = profileNameLength > 26
    ? 'clamp(1.65rem, 5.2vw, 4.6rem)'
    : profileNameLength > 18
      ? 'clamp(1.85rem, 6vw, 5.8rem)'
      : 'clamp(2.2rem, 8.4vw, 7rem)';
  const adminPixValue = adminProfile.profileSettings?.paymentSettings?.pixValue || 99;
  const appearance = adminProfile.profileSettings?.appearanceSettings;
  const neonGlowColor = appearance?.neonGlowColor || 'var(--app-neon-color)';
  const fontFamily = appearance?.fontFamily || 'var(--app-font-family)';

  const isSuperAdminViewing = userProfile?.claims?.role === 'superadmin';

  return (
    <>
      {isSuperAdminViewing && (
        <div className="bg-yellow-400 text-black text-center p-2 font-bold">
          Superadmin View: You are viewing this page as a superadmin.
        </div>
      )}
      <div className="relative w-full h-[35vh] sm:h-[40vh] md:h-[50vh] flex items-center justify-center">
        <Image
          src={coverPhoto}
          alt="Background"
          fill
          priority
          className="object-contain opacity-80 bg-black/15"
          sizes="100vw"
          unoptimized={coverPhotoIsSvg}
          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
            e.currentTarget.src = "https://placehold.co/1200x400.png";
          }}
        />
        <h1
          className="font-bold z-10 px-2 sm:px-4 text-center leading-tight"
          style={{
            fontSize: profileNameFontSize,
            fontFamily,
            color: 'var(--app-text-color)',
            WebkitTextStroke: '0.6px rgba(0,0,0,0.5)',
            textShadow: `0 1px 4px rgba(0, 0, 0, 0.38), 0 0 7px ${neonGlowColor}, 0 0 16px ${neonGlowColor}`,
            filter: `drop-shadow(0 0 8px ${neonGlowColor})`,
            minHeight: '4rem'
          }}
        >
          {profileName}
        </h1>
      </div>

      <main className="flex-grow flex flex-col items-center w-full">
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full max-w-4xl mx-auto px-3 sm:px-4">
          <div className="w-full max-w-[320px] sm:max-w-md flex flex-col items-center gap-y-3 sm:gap-y-4 pt-6 sm:pt-8 md:pt-14">

            <Button
              className="w-full h-14 sm:h-16 md:h-18 text-base sm:text-lg md:text-xl flex items-center justify-center overflow-hidden transform scale-110 sm:scale-115 md:scale-120 transition-all duration-300"
              style={{
                backgroundColor: 'var(--app-button-color)',
                color: 'var(--app-button-text-color)',
                boxShadow: `0 0 8px ${neonGlowColor}, 0 0 16px ${neonGlowColor}, 0 0 24px ${neonGlowColor}`
              }}
              onClick={() => setSignUpOpen(true)}
            >
              {authStatus === 'authenticated' && (firebaseUser || userProfile) ? (
                <div className="flex items-center justify-start gap-3 w-full min-w-0 px-2">
                  {(firebaseUser?.photoURL || userProfile?.photoURL) && (
                    <Image
                      src={(firebaseUser && firebaseUser.photoURL) || (userProfile && userProfile.photoURL) || ''}
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
                  <div className="flex items-center justify-center w-full min-w-0 overflow-hidden">
                    <LocalizedText id="cta.primary" as="span" className="truncate min-w-0" />
                  </div>
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

            <div className="flex items-center justify-center w-full max-w-md mt-3 sm:mt-4 md:mt-6 gap-x-1 sm:gap-x-2 md:gap-x-4">
              <div className="flex-1 transition-transform hover:scale-105">
                <GooglePayButtonCSS
                  onClick={handleGooglePayClick}
                  width="100%"
                  height={56}
                  className="w-full h-[56px] sm:h-[64px] md:h-[72px]"
                  ariaLabel="Pagar com Google Pay"
                />
              </div>
              <div className="flex flex-col items-center justify-center px-1 w-[50px] sm:w-[60px] md:w-[70px]">
                <button
                  className="w-full transition-transform hover:scale-105 flex flex-col items-center justify-center"
                  onClick={() => openPaymentModal('pix')}
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
              <div className="flex-1 transition-transform hover:scale-105 active:scale-95">
                {isApplePayProcessing ? (
                  <div className="flex items-center justify-center h-[56px] sm:h-[64px] md:h-[72px]">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                ) : (
                  <ApplePayButtonCSS
                    onClick={handleApplePayClick}
                    disabled={isApplePayProcessing}
                    width="100%"
                    height={56}
                    className="w-full h-[56px] sm:h-[64px] md:h-[72px]"
                    ariaLabel="Pagar com Apple Pay"
                    buttonType="plain"
                    buttonStyle="black"
                  />
                )}
              </div>
            </div>

            <div className="text-center py-3 sm:py-4 mt-3 sm:mt-4 md:mt-5 min-h-[70px] sm:min-h-[80px] md:min-h-[100px] flex flex-col items-center justify-center">
              <LocalizedText id="pricing.planLabel" as="p" className="text-sm sm:text-base md:text-lg" />
              {isLoadingCurrency ? (
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 mx-auto animate-spin text-white" />
              ) : (
                <p className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-none">
                  <span className="inline-block tracking-tight" style={{ fontSize: '240%', lineHeight: 1 }}>
                    {priceInteger || paymentInfo.value}
                  </span>
                  <span className="text-2xl sm:text-3xl md:text-4xl align-top">
                    .{(priceDecimals ?? '00').padEnd(2, '0')}
                  </span>
                  <span className="text-lg sm:text-xl md:text-2xl font-normal align-top ml-1">{paymentInfo.symbol}</span>
                </p>
              )}
              <div className="w-full mt-3 sm:mt-4">
                {authStatus === 'checking' ? (
                  <div className="w-full h-14 sm:h-16 md:h-20 bg-muted rounded-lg flex items-center justify-center border border-primary/20">
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground text-xs sm:text-sm md:text-base">Verificando...</span>
                  </div>
                ) : (
                  <div className="w-full flex items-center justify-center px-4 py-3 sm:py-4" data-paypal-container="main">
                    <PayPalHostedButton className="w-full border-0 outline-none" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-x-3 sm:gap-x-4 py-3 sm:py-4 md:py-6 mt-3 sm:mt-4 md:mt-5 px-4 sm:px-6 md:px-8 bg-card border border-primary/30 rounded-lg shadow-neon-white hover:shadow-neon-red-strong transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16">
                <defs>
                  <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#C7F4FF" />
                    <stop offset="50%" stopColor="#7AC8FF" />
                    <stop offset="100%" stopColor="#4B63FF" />
                  </linearGradient>
                </defs>
                <path d="M32 4L10 12V30C10 42.8 19.04 54.48 32 58C44.96 54.48 54 42.8 54 30V12L32 4Z" fill="url(#shieldGradient)" stroke="#1E1B4B" strokeWidth="2" strokeLinejoin="round" />
                <path d="M22 31L28 37L42 23" stroke="#F4F7FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="text-center">
                <LocalizedText id="security.title" as="p" className="text-xs sm:text-sm md:text-base font-semibold text-primary" />
                <LocalizedText id="security.subtitle" as="p" className="text-[10px] sm:text-xs md:text-sm text-muted-foreground" />
              </div>
            </div>

            <div className="w-full max-w-[280px] sm:max-w-sm mt-3 sm:mt-4 md:mt-5">
              <Button
                onClick={() => setLoginOpen(true)}
                className="w-full h-12 sm:h-14 md:h-16 text-base sm:text-lg md:text-xl bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center overflow-hidden transform scale-110 sm:scale-115 md:scale-120 shadow-neon-white hover:shadow-neon-red-strong transition-all duration-300"
              >
                <div className="flex items-center justify-center w-full min-w-0 overflow-hidden">
                  <KeyRound className="mr-2 h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
                  <LocalizedText id="cta.loginButton" as="span" className="truncate min-w-0" />
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
          sendToSecretChatEnabled={adminProfile?.profileSettings?.reviewSettings?.sendReviewToSecretChat ?? true}
        />
      </main>

      {/* Adicionar Footer se necessário */}

      <PixPaymentModal
        isOpen={isPixModalOpen}
        onOpenChange={setIsPixModalOpen}
        amount={Number.parseFloat(paymentInfo.value)}
        onPaymentSuccess={handlePaymentSuccess}
        paymentMethod={simulatedMethod || 'pix'}
        currency={paymentInfo.currency}
        originalAmountBRL={adminPixValue}
      />
      <GPayPaymentModal
        isOpen={isGPayModalOpen}
        onOpenChange={setIsGPayModalOpen}
        amount={Number.parseFloat(paymentInfo.value)}
        currency={paymentInfo.currency}
        symbol={paymentInfo.symbol}
        onPaymentSuccess={handlePaymentSuccess}
      />
      <ApplePayPaymentModal
        isOpen={isApplePayModalOpen}
        onOpenChange={setIsApplePayModalOpen}
        amount={Number.parseFloat(paymentInfo.value)}
        currency={paymentInfo.currency}
        symbol={paymentInfo.symbol}
        onPaymentSuccess={handlePaymentSuccess}
      />
      <LoginTypeModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
      <SignUpTypeModal isOpen={signUpOpen} onClose={() => setSignUpOpen(false)} />
      {adminProfile?.uid && <FooterByUid adminUid={adminProfile.uid} />}
    </>
  );
}
