
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";
import IntegrationCard from "./components/IntegrationCard";
import PayPalLoginButton from "@/components/auth/PayPalLoginButton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Importar os ícones
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { InstagramIcon } from '@/components/icons/InstagramIcon';
import { TwitterIcon } from '@/components/icons/TwitterIcon';
import { PayPalIcon } from '@/components/icons/PayPalIcon';
import { MercadoPagoIcon } from '@/components/icons/MercadoPagoIcon';
import { StripeIcon } from '@/components/icons/StripeIcon';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { Apple, CalendarIcon, QrCode } from "lucide-react";
import { openOAuthWindow, postLogout } from "@/lib/integrations";
import { metaSDK } from "@/services/meta-sdk-integration";
import { FacebookSDKIntegration } from "@/services/facebook-sdk-integration";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import { app } from "@/lib/firebase";
import { useGallery } from '@/hooks/useGallery';

type Integration = 'twitter' | 'instagram' | 'facebook' | 'paypal' | 'mercadopago' | 'stripe' | 'whatsapp' | 'google' | 'apple';

interface QrCodeResponse {
  code: string;
  prefilled_message: string;
  deep_link_url: string;
  qr_image_url?: string;
}

interface GoogleGalleryItem {
  id: string;
  source: 'photos' | 'drive';
}

export default function AdminIntegrationsPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const embeddedConfigId = process.env.NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID || "";
  const [adminUid, setAdminUid] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<Record<string, boolean>>({
    twitter: false,
    instagram: false,
    facebook: false,
    paypal: false,
    mercadopago: false,
    stripe: false,
    whatsapp: false,
    google: false,
    apple: false,
  });
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({
    twitter: true,
    instagram: true,
    facebook: true,
    paypal: true,
    mercadopago: true,
    stripe: true,
    whatsapp: true,
    google: true,
    apple: true,
  });
  const [showTwitterSettings, setShowTwitterSettings] = useState(false);
  const [prefilledMessage] = useState(
    "Olá! Gostaria de mais informações."
  );
  const [format] = useState<"PNG" | "SVG">("PNG");
  const [isWhatsAppQrOpen, setIsWhatsAppQrOpen] = useState(false);
  const [isWhatsAppQrLoading, setIsWhatsAppQrLoading] = useState(false);
  const [whatsAppQr, setWhatsAppQr] = useState<QrCodeResponse | null>(null);
  const [whatsAppQrError, setWhatsAppQrError] = useState<string | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarSaving, setCalendarSaving] = useState(false);
  const [calendarSettings, setCalendarSettings] = useState<any>(null);
  const [calendarId, setCalendarId] = useState('primary');
  const [appleForm, setAppleForm] = useState({
    username: '',
    appPassword: '',
    calendarUrl: ''
  });
  const [calendarStatus, setCalendarStatus] = useState<string | null>(null);
  const [isGoogleCalendarDialogOpen, setIsGoogleCalendarDialogOpen] = useState(false);
  const [isAppleCalendarDialogOpen, setIsAppleCalendarDialogOpen] = useState(false);
  const { refresh: refreshGoogleGallery, loading: googleGalleryLoading } = useGallery({ autoLoad: false, pageSize: 30 });

  const twitterKey = useCallback((key: string, uid: string | null) => {
    return uid ? `${key}:${uid}` : key;
  }, []);

  const migrateLegacyTwitterStorage = useCallback((uid: string) => {
    try {
      const legacyUid = localStorage.getItem('twitter_uid');
      if (!legacyUid || legacyUid !== uid) return;

      const scopedUsernameKey = twitterKey('twitter_username', uid);
      const scopedConnectedKey = twitterKey('twitter_connected', uid);
      const scopedUidKey = twitterKey('twitter_uid', uid);
      const scopedMediaCacheKey = twitterKey('twitter_media_cache', uid);

      const hasScopedUsername = !!localStorage.getItem(scopedUsernameKey) || !!sessionStorage.getItem(scopedUsernameKey);
      if (!hasScopedUsername) {
        const legacyUsername = localStorage.getItem('twitter_username') || sessionStorage.getItem('twitter_username');
        if (legacyUsername) {
          localStorage.setItem(scopedUsernameKey, legacyUsername);
          sessionStorage.setItem(scopedUsernameKey, legacyUsername);
        }
      }

      const legacyConnected = localStorage.getItem('twitter_connected');
      if (legacyConnected === 'true') {
        localStorage.setItem(scopedConnectedKey, 'true');
      }

      localStorage.setItem(scopedUidKey, uid);

      const legacyMediaCache = localStorage.getItem('twitter_media_cache');
      if (legacyMediaCache && !localStorage.getItem(scopedMediaCacheKey)) {
        localStorage.setItem(scopedMediaCacheKey, legacyMediaCache);
      }

      // Remover chaves legadas (evita vazamento para outro admin no mesmo navegador)
      localStorage.removeItem('twitter_username');
      sessionStorage.removeItem('twitter_username');
      localStorage.removeItem('twitter_connected');
      localStorage.removeItem('twitter_uid');
      localStorage.removeItem('twitter_media_cache');
    } catch (error) {
      console.warn('[Integrations] Falha ao migrar chaves legadas do Twitter:', error);
    }
  }, [twitterKey]);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAdminUid(user?.uid ?? null);
      if (user?.uid) {
        migrateLegacyTwitterStorage(user.uid);
      }
    });

    return () => unsubscribe();
  }, [migrateLegacyTwitterStorage]);

  const loadCalendarSettings = async () => {
    setCalendarLoading(true);
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;
      const response = await fetch('/api/admin/calendar/settings', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('[Calendar Settings] Usu\u00e1rio n\u00e3o autenticado');
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data?.success) {
        setCalendarSettings(data.data);
        setCalendarId(data.data?.google?.calendarId || 'primary');
        setAppleForm((prev) => ({
          ...prev,
          calendarUrl: data.data?.apple?.calendarUrl || ''
        }));
      }
    } catch (error) {
      console.error('[Calendar Settings] Error loading:', error);
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarSettings();
  }, []);

  const updateCalendarSettings = async (payload: Record<string, any>) => {
    setCalendarSaving(true);
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;
      const response = await fetch('/api/admin/calendar/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!data?.success) {
        throw new Error(data?.message || 'Falha ao salvar');
      }
      await loadCalendarSettings();
    } catch (error) {
      setCalendarStatus(error instanceof Error ? error.message : 'Erro ao salvar');
    } finally {
      setCalendarSaving(false);
    }
  };

  const handleGoogleCalendarDisconnect = async () => {
    setCalendarSaving(true);
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;
      await fetch('/api/admin/calendar/google/disconnect', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      await loadCalendarSettings();
    } finally {
      setCalendarSaving(false);
    }
  };

  const handleAppleCalendarConnect = async () => {
    setCalendarSaving(true);
    setCalendarStatus(null);
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;
      const response = await fetch('/api/admin/calendar/apple/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          username: appleForm.username,
          appPassword: appleForm.appPassword,
          calendarUrl: appleForm.calendarUrl || undefined
        })
      });
      const data = await response.json();
      if (!data?.success) {
        throw new Error(data?.message || 'Falha ao conectar');
      }
      setAppleForm((prev) => ({ ...prev, appPassword: '' }));
      await loadCalendarSettings();
    } catch (error) {
      setCalendarStatus(error instanceof Error ? error.message : 'Erro ao conectar Apple Calendar');
    } finally {
      setCalendarSaving(false);
    }
  };

  const handleAppleCalendarDisconnect = async () => {
    setCalendarSaving(true);
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;
      await fetch('/api/admin/calendar/apple/disconnect', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      await loadCalendarSettings();
    } finally {
      setCalendarSaving(false);
    }
  };

  const handleGoogleCalendarConnect = () => {
    setCalendarStatus(null);
    handleConnect('google');
  };

  const handleGoogleGallerySync = async () => {
    try {
      const result = await refreshGoogleGallery();
      const items = (result?.items || []) as GoogleGalleryItem[];
      const source = result?.source;

      if (!items.length) {
        toast({
          title: 'Sem mídia disponível',
          description: 'Nenhum item encontrado no Google Photos ou Drive público.',
        });
        return;
      }

      const photosCount = items.filter((item) => item.source === 'photos').length;
      const driveCount = items.filter((item) => item.source === 'drive').length;

      toast({
        title: 'Galeria Google sincronizada',
        description:
          source === 'photos'
            ? `${items.length} item(ns) carregado(s) do Google Photos.`
            : `${items.length} item(ns) carregado(s) do Google Drive público (${driveCount || items.length} arquivo(s)).`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao sincronizar Google',
        description: error?.message || 'Falha ao carregar galeria Google.',
      });
    }
  };

  const openGoogleCalendarDialog = () => {
    setCalendarStatus(null);
    setIsGoogleCalendarDialogOpen(true);
  };

  const openAppleCalendarDialog = () => {
    setCalendarStatus(null);
    setIsAppleCalendarDialogOpen(true);
  };

  // Função auxiliar para atualizar isLoading com segurança
  const updateIsLoading = (platform: string, value: boolean) => {
    setIsLoading(prev => {
      if (!prev) return { [platform]: value };
      return { ...prev, [platform]: value };
    });
  };

  const ensurePopupPermission = () => {
    try {
      const probe = window.open('about:blank', 'popup_permission_probe', 'width=1,height=1,left=-10000,top=-10000');
      if (!probe) {
        toast({
          variant: 'destructive',
          title: 'Popup bloqueado',
          description: 'Permita popups no navegador para conectar integrações.',
        });
        return false;
      }
      probe.close();
      return true;
    } catch {
      toast({
        variant: 'destructive',
        title: 'Popup bloqueado',
        description: 'Permita popups no navegador para conectar integrações.',
      });
      return false;
    }
  };

  // Conectar Facebook via popup do SDK da Meta
  const handleFacebookConnect = async () => {
    updateIsLoading('facebook', true);

    try {
      console.log('[Facebook] Iniciando login via popup...');

      // Obter perfil via popup
      const profile = await metaSDK.loginWithFacebook();
      console.log('[Facebook] Perfil coletado:', profile);

      // Obter usuário atual autenticado no Firebase
      const auth = getAuth(app);
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error('Usuário não autenticado. Faça login primeiro.');
      }

      // Salvar perfil no Firestore
      const response = await fetch('/api/admin/meta/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          profile: profile,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao salvar perfil');
      }

      setIntegrations(prev => ({ ...prev, facebook: true }));

      toast({
        title: "Facebook conectado!",
        description: `Bem-vindo, ${profile.name}! Seus dados foram salvos.`,
      });

    } catch (error) {
      console.error('[Facebook] Erro:', error);
      toast({
        variant: 'destructive',
        title: "Erro ao conectar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      updateIsLoading('facebook', false);
    }
  };

  // Conectar Instagram via OAuth Flow (Instagram Business Login)
  const handleInstagramConnect = async () => {
    updateIsLoading('instagram', true);

    try {
      console.log('[Instagram] Iniciando Instagram Business Login (OAuth)...');

      // Primeiro fazer login com Facebook SDK
      await metaSDK.initialize();

      console.log('[Instagram] Verificando status de login do Facebook...');
      const loginStatus = await metaSDK.getLoginStatus();

      let accessToken: string;

      if (loginStatus.status === 'connected' && loginStatus.authResponse) {
        console.log('[Instagram] Já está logado no Facebook, usando token existente');
        accessToken = loginStatus.authResponse.accessToken;
      } else {
        console.log('[Instagram] Não está logado, abrindo popup de login do Facebook...');

        // Fazer login via Facebook SDK com scopes necessários
        const facebookProfile = await metaSDK.loginWithFacebook();
        console.log('[Instagram] Login do Facebook concluído:', facebookProfile);

        // Pegar o novo token
        const newStatus = await metaSDK.getLoginStatus();
        if (!newStatus.authResponse) {
          throw new Error('Não foi possível obter access token do Facebook');
        }
        accessToken = newStatus.authResponse.accessToken;
      }

      console.log('[Instagram] Access token obtido, salvando e redirecionando...');

      // Salvar token no sessionStorage para usar no callback
      sessionStorage.setItem('fb_access_token', accessToken);

      // Gerar state para CSRF protection
      const state = Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('instagram_oauth_state', state);

      // Obter URL de autorização oficial do Instagram
      const authUrl = metaSDK.getInstagramAuthUrl(state);

      console.log('[Instagram] Redirecionando para autorização oficial:', authUrl);

      // Redirecionar para autorização do Instagram
      window.location.href = authUrl;

    } catch (error) {
      console.error('[Instagram] Erro:', error);
      toast({
        variant: 'destructive',
        title: "Erro ao conectar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
      updateIsLoading('instagram', false);
    }
  };

  const handleWhatsAppConnect = async () => {
    updateIsLoading('whatsapp', true);

    try {
      if (!embeddedConfigId) {
        throw new Error('Config ID do Embedded Signup não encontrado');
      }

      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Faça login no painel antes de conectar o WhatsApp');
      }

      const { code } = await FacebookSDKIntegration.startEmbeddedSignup(embeddedConfigId);
      if (!code) {
        throw new Error('Código de autorização não retornado pela Meta');
      }

      const token = await user.getIdToken();
      const response = await fetch('/api/admin/whatsapp/embedded', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'Falha ao concluir o Embedded Signup');
      }

      setIntegrations(prev => ({ ...prev, whatsapp: true }));
      toast({
        title: 'WhatsApp conectado',
        description: 'Integração via Cadastro Incorporado concluída.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro no Embedded Signup',
        description: error instanceof Error ? error.message : 'Erro ao conectar WhatsApp',
      });
    } finally {
      updateIsLoading('whatsapp', false);
    }
  };

  const handleGenerateWhatsAppQr = async () => {
    try {
      setIsWhatsAppQrLoading(true);
      setWhatsAppQrError(null);
      const auth = getAuth(app);
      const user = auth.currentUser;

      if (!user) {
        toast({
          variant: "destructive",
          title: "Não autenticado",
          description: "Faça login no painel antes de gerar o QR code.",
        });
        return;
      }

      const accessToken = await user.getIdToken();

      const response = await fetch("/api/whatsapp/generate-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          prefilledMessage,
          generateQrImage: format,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Falha ao gerar QR code");
      }

      setWhatsAppQr(data.qr || null);
      toast({
        title: "QR code gerado!",
        description: "Use o WhatsApp para escanear e abrir o chat.",
      });
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "Erro ao gerar QR code";
      setWhatsAppQrError(message);
      toast({
        variant: "destructive",
        title: "Erro ao gerar QR",
        description: message,
      });
    } finally {
      setIsWhatsAppQrLoading(false);
    }
  };

  const handleOpenWhatsAppQr = async () => {
    setIsWhatsAppQrOpen(true);
    await handleGenerateWhatsAppQr();
  };

  const handleWhatsAppQrOpenChange = (open: boolean) => {
    setIsWhatsAppQrOpen(open);
    if (open) {
      setWhatsAppQr(null);
      setWhatsAppQrError(null);
    }
  };

  // Verificar autenticação do Twitter ao carregar
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const checkTwitterAuth = async () => {
      try {
        const { getAuth } = await import('firebase/auth');
        const { app } = await import('@/lib/firebase');
        const auth = getAuth(app);

        // Verificar se há usuário autenticado
        unsubscribe = auth.onAuthStateChanged((user) => {
          if (user) {
            migrateLegacyTwitterStorage(user.uid);

            // Usuário autenticado, verificar se tem username salvo
            const savedUsername =
              localStorage.getItem(twitterKey('twitter_username', user.uid))
              || sessionStorage.getItem(twitterKey('twitter_username', user.uid));
            if (savedUsername) {
              setIntegrations(prev => ({ ...prev, twitter: true }));
              localStorage.setItem(twitterKey('twitter_connected', user.uid), 'true');
            }
          }
        });
      } catch (error) {
        console.warn('Erro ao verificar autenticação do Twitter:', error);
      }
    };

    checkTwitterAuth();

    return () => {
      try {
        unsubscribe?.();
      } catch {
        // noop
      }
    };
  }, [migrateLegacyTwitterStorage, twitterKey]);

  // Verificar se retornou do OAuth do Instagram
  useEffect(() => {
    const instagramSuccess = searchParams?.get?.('instagram_success') ?? null;
    const instagramUsername = searchParams?.get?.('username') ?? null;
    const instagramError = searchParams?.get?.('instagram_error') ?? null;
    const googleConnected = searchParams?.get?.('google') ?? null;
    const googleError = searchParams?.get?.('error') ?? null;

    if (instagramSuccess === 'true') {
      toast({
        title: "Instagram conectado!",
        description: `Conta @${instagramUsername} conectada com sucesso! ✅`,
      });

      // Atualizar estado
      setIntegrations(prev => ({ ...prev, instagram: true }));

      // Limpar URL
      window.history.replaceState({}, '', '/admin/integrations');
    }

    if (instagramError) {
      toast({
        variant: 'destructive',
        title: "Erro ao conectar Instagram",
        description: decodeURIComponent(instagramError),
      });

      // Limpar URL
      window.history.replaceState({}, '', '/admin/integrations');
    }

    if (googleConnected === 'connected') {
      toast({
        title: 'Google conectado!',
        description: 'Sua conta Google foi conectada com escopos de Calendar, Photos/Drive e YouTube/YouTube Studio.',
      });
      setIntegrations(prev => ({ ...prev, google: true }));
      window.history.replaceState({}, '', '/admin/integrations');
    }

    if (googleError) {
      toast({
        variant: 'destructive',
        title: 'Erro ao conectar Google',
        description: decodeURIComponent(googleError),
      });
      window.history.replaceState({}, '', '/admin/integrations');
    }
  }, [searchParams, toast]);

  useEffect(() => {
    async function fetchAllStatus() {
      console.log('🔍 [ADMIN] Verificando status de integrações...');
      const services: Integration[] = ['twitter', 'facebook', 'paypal', 'mercadopago', 'stripe', 'whatsapp'];
      try {
        const auth = getAuth(app);
        const user = auth.currentUser;
        const token = user ? await user.getIdToken() : null;

        const res = await fetch(`/api/admin/integrations/status?services=${services.join(',')}`,
          {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );
        console.log('📡 [ADMIN] Resposta status:', res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log('📦 [ADMIN] Status recebido:', data);
        const status = data.status || {};
        const newIntegrationsState: Record<string, boolean> = { ...integrations };
        const newLoadingState: Record<string, boolean> = { ...isLoading };
        services.forEach((s) => {
          const v = status[s];
          if (typeof v === 'object' && v !== null) newIntegrationsState[s] = !!v.connected;
          else newIntegrationsState[s] = !!v;
          newLoadingState[s] = false;
          console.log(`🔍 [ADMIN] ${s}:`, newIntegrationsState[s]);
        });

        const providers = new Set((user?.providerData ?? []).map((item) => item.providerId));
        newIntegrationsState.google = providers.has('google.com');
        newIntegrationsState.apple = providers.has('apple.com');
        newLoadingState.google = false;
        newLoadingState.apple = false;

        // Para Twitter, também verificar localStorage
        const twitterConnected = user?.uid ? (localStorage.getItem(twitterKey('twitter_connected', user.uid)) === 'true') : false;
        const twitterUsername = user?.uid ? (localStorage.getItem(twitterKey('twitter_username', user.uid))) : null;
        console.log('🔍 [ADMIN] Twitter localStorage:', { twitterConnected, twitterUsername });
        if (twitterConnected && twitterUsername) {
          newIntegrationsState.twitter = true;
          console.log('✅ [ADMIN] Twitter conectado via localStorage:', twitterUsername);
        }

        setIntegrations(newIntegrationsState);
        setIsLoading(newLoadingState);
      } catch (e) {
        console.error('❌ [ADMIN] Status fetch failed:', e);
        const newLoadingState: Record<string, boolean> = { ...isLoading };
        (['twitter', 'instagram', 'facebook', 'paypal', 'mercadopago', 'stripe', 'whatsapp', 'google', 'apple'] as const).forEach(s => newLoadingState[s] = false);
        setIsLoading(newLoadingState);
      }
    }
    fetchAllStatus();

  }, []); // integrations e isLoading são gerenciados internamente

  const handleConnect = (platform: Integration) => {
    console.log('🔌 [ADMIN] Conectando:', platform);

    if (!ensurePopupPermission()) {
      updateIsLoading(platform, false);
      return;
    }

    if (platform === 'apple') {
      setIsGoogleCalendarDialogOpen(false);
      setIsAppleCalendarDialogOpen(true);
      updateIsLoading('apple', false);
      return;
    }

    // Facebook e Instagram têm funções dedicadas com popup Meta SDK
    if (platform === 'facebook') {
      console.log('🔵 [ADMIN] Redirecionando para handleFacebookConnect');
      handleFacebookConnect();
      return;
    }

    if (platform === 'instagram') {
      console.log('📷 [ADMIN] Redirecionando para handleInstagramConnect');
      handleInstagramConnect();
      return;
    }

    if (platform === 'whatsapp') {
      console.log('💬 [ADMIN] Iniciando Embedded Signup do WhatsApp');
      handleWhatsAppConnect();
      return;
    }

    if (platform === 'google') {
      (async () => {
        try {
          updateIsLoading('google', true);

          const auth = getAuth(app);
          const user = auth.currentUser;
          if (!user) {
            toast({
              variant: 'destructive',
              title: 'Não autenticado',
              description: 'Faça login no painel antes de conectar o Google.',
            });
            updateIsLoading('google', false);
            return;
          }

          const token = await user.getIdToken();
          const connectUrl = `${window.location.origin}/api/admin/google/connect?token=${encodeURIComponent(token)}`;
          const width = 640;
          const height = 760;
          const left = window.top ? (window.top.outerWidth - width) / 2 : 100;
          const top = window.top ? (window.top.outerHeight - height) / 2 : 100;
          const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no`;
          const w = window.open(connectUrl, 'google_oauth', features);

          if (!w) {
            toast({
              variant: 'destructive',
              title: 'Popup bloqueado',
              description: 'Permita popups para conectar sua conta Google.',
            });
            updateIsLoading('google', false);
            return;
          }

          const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            const data = event.data || {};
            if (!data.platform || data.platform !== 'google') return;

            if (data.success === '1' || data.success === true || data.connected === '1' || data.connected === true) {
              toast({
                title: 'Google conectado!',
                description: 'Conta Google conectada com permissões de Calendar, Photos/Drive e YouTube/YouTube Studio.',
              });
              setIntegrations(prev => ({ ...prev, google: true }));
              loadCalendarSettings();
            } else {
              const err = data.error || 'Falha na autenticação Google.';
              toast({ variant: 'destructive', title: 'Erro na conexão Google', description: String(err) });
            }
            updateIsLoading('google', false);
            window.removeEventListener('message', onMessage);
          };

          window.addEventListener('message', onMessage);
          window.setTimeout(() => {
            window.removeEventListener('message', onMessage);
            updateIsLoading('google', false);
          }, 120000);
        } catch (error: any) {
          toast({
            variant: 'destructive',
            title: 'Erro ao conectar Google',
            description: error?.message || 'Não foi possível abrir a autenticação Google.',
          });
          updateIsLoading('google', false);
        }
      })();
      return;
    }

    setIsLoading(prev => ({ ...prev, [platform]: true }));
    if (platform === 'twitter') {
      (async () => {
        try {
          console.log('🐦 [ADMIN] Iniciando login Twitter...');
          const { getAuth, TwitterAuthProvider, linkWithPopup, setPersistence, browserLocalPersistence } = await import('firebase/auth');
          const { app } = await import('@/lib/firebase');
          const auth = getAuth(app);

          // Verificar se há usuário autenticado
          if (!auth.currentUser) {
            toast({
              variant: 'destructive',
              title: 'Erro ao conectar Twitter',
              description: 'Faça login como admin primeiro.'
            });
            setIsLoading(prev => ({ ...prev, twitter: false }));
            return;
          }

          // Forçar persistência local para que não desconecte ao atualizar
          await setPersistence(auth, browserLocalPersistence);
          console.log('✅ [ADMIN] Persistência local configurada');

          const provider = new TwitterAuthProvider();

          // ✅ USAR linkWithPopup em vez de signInWithPopup para não trocar de conta
          const result = await linkWithPopup(auth.currentUser, provider);
          console.log('✅ [ADMIN] Popup concluído, resultado:', result);

          // Extrair e salvar username do Twitter
          let username = (result as any)?.additionalUserInfo?.username
            || (result as any)?.additionalUserInfo?.profile?.screen_name
            || (result as any)?._tokenResponse?.screenName;
          console.log('🔍 [ADMIN] Username extraído:', username);

          const accessToken = await result.user.getIdToken();

          // Se não encontrou username, buscar da API do Twitter
          if (!username) {
            console.log('⚠️ [ADMIN] Username não encontrado, buscando da API...');
            try {
              const response = await fetch('/api/admin/twitter/me', {
                headers: { Authorization: `Bearer ${accessToken}` }
              });
              if (response.ok) {
                const data = await response.json();
                username = data.username;
                console.log('✅ [ADMIN] Username obtido da API:', username);
              }
            } catch (fallbackError) {
              console.warn('⚠️ [ADMIN] Não foi possível buscar username da API:', fallbackError);
            }
          }

          if (username) {
            // Salvar no Firestore
            try {
              console.log('💾 [ADMIN] Salvando no Firestore...');
              const { getFirestore, doc, setDoc } = await import('firebase/firestore');
              const { app } = await import('@/lib/firebase');
              const db = getFirestore(app);

              const twitterAdminRef = doc(db, 'twitter_admins', result.user.uid);

              // Obter o Twitter User ID se disponível
              let twitterUserId: string | null = null;
              const twitterData = (result as any).user?.reloadUserInfo?.providerUserInfo?.find(
                (p: any) => p.providerId === 'twitter.com'
              );
              if (twitterData?.rawId) {
                twitterUserId = twitterData.rawId;
                console.log('✅ [ADMIN] Twitter User ID encontrado:', twitterUserId);
              }

              await setDoc(twitterAdminRef, {
                username: username,
                displayName: result.user.displayName || null,
                email: result.user.email || null,
                photoURL: result.user.photoURL || null,
                authenticatedAt: new Date().toISOString(),
                ...(twitterUserId && { twitterUserId })
              });

              console.log('✅ [ADMIN] Dados salvos no Firestore');
            } catch (dbError) {
              console.error('❌ [ADMIN] Erro ao salvar no Firestore:', dbError);
            }

            // Persistir no storage escopado por admin (evita vazamento entre admins no mesmo navegador)
            localStorage.setItem(twitterKey('twitter_username', result.user.uid), username);
            sessionStorage.setItem(twitterKey('twitter_username', result.user.uid), username);
            localStorage.setItem(twitterKey('twitter_connected', result.user.uid), 'true');
            localStorage.setItem(twitterKey('twitter_uid', result.user.uid), result.user.uid);
            console.log('✅ [ADMIN] Dados salvos no localStorage');

            setIntegrations(prev => ({ ...prev, twitter: true }));

            toast({
              title: 'Twitter conectado!',
              description: `Conta @${username} conectada com sucesso. Suas fotos e vídeos agora serão carregados dessa conta.`
            });
          } else {
            console.error('❌ [ADMIN] Não foi possível obter username do Twitter');
            toast({
              variant: 'destructive',
              title: 'Erro ao conectar Twitter',
              description: 'Não foi possível obter o nome de usuário do Twitter.'
            });
          }

          setIsLoading(prev => ({ ...prev, twitter: false }));
        } catch (e: any) {
          if (e?.code === 'auth/credential-already-in-use') {
            toast({
              variant: 'destructive',
              title: 'Twitter já conectado em outra conta',
              description: 'Essa credencial já está vinculada a outro usuário. Faça login com essa conta e desvincule o Twitter, ou use outro perfil do Twitter.'
            });
          } else if (e?.code === 'auth/popup-closed-by-user') {
            toast({
              variant: 'destructive',
              title: 'Conexão cancelada',
              description: 'O popup foi fechado antes de concluir o login.'
            });
          } else {
            toast({
              variant: 'destructive',
              title: 'Falha ao conectar com Twitter',
              description: e?.message || 'Popup bloqueado ou configuração inválida.'
            });
          }
          setIsLoading(prev => ({ ...prev, twitter: false }));
        }
      })();
      return;
    }

    // PayPal usa rota local, não Cloud Run
    if (platform === 'paypal') {
      console.log('💳 [ADMIN] Iniciando login PayPal...');
      const width = 600;
      const height = 700;
      const left = window.top ? (window.top.outerWidth - width) / 2 : 100;
      const top = window.top ? (window.top.outerHeight - height) / 2 : 100;
      const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no`;
      (async () => {
        try {
          const auth = getAuth(app);
          const user = auth.currentUser;
          const token = user ? await user.getIdToken() : null;
          if (!token) {
            toast({
              variant: 'destructive',
              title: 'Não autenticado',
              description: 'Faça login no painel antes de conectar o PayPal.'
            });
            updateIsLoading(platform, false);
            return;
          }

          const connectUrl = `${window.location.origin}/api/admin/paypal/connect?token=${encodeURIComponent(token)}`;
          console.log('🔗 [ADMIN] Abrindo popup PayPal:', connectUrl);
          const w = window.open(connectUrl, 'paypal_oauth', features);

          if (!w) {
            toast({
              variant: 'destructive',
              title: 'Popup bloqueado',
              description: 'Permita popups para conectar sua conta PayPal.'
            });
            updateIsLoading(platform, false);
            return;
          }

          const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            const data = event.data || {};
            if (!data.platform || data.platform !== 'paypal') return;

            console.log('📨 [ADMIN] Mensagem recebida do PayPal:', data);

            if (data.success === '1' || data.success === true || data.connected === '1' || data.connected === true) {
              toast({
                title: "PayPal conectado!",
                description: "Sua conta PayPal foi conectada com sucesso.",
              });
              setIntegrations(prev => ({ ...prev, paypal: true }));
            } else {
              const err = data.error || 'Falha na autenticação PayPal.';
              toast({ variant: 'destructive', title: 'Erro na conexão PayPal', description: String(err) });
            }
            updateIsLoading('paypal', false);
            window.removeEventListener('message', onMessage);
          };

          window.addEventListener('message', onMessage);

          // Timeout de segurança
          const tid = window.setTimeout(() => {
            window.removeEventListener('message', onMessage);
            updateIsLoading('paypal', false);
            console.log('⏱️ [ADMIN] Timeout na conexão PayPal');
          }, 120000);

          return;
        } catch (error) {
          console.error('❌ [ADMIN] Erro ao abrir popup PayPal:', error);
          toast({
            variant: 'destructive',
            title: 'Erro ao conectar PayPal',
            description: 'Não foi possível abrir a janela de autenticação.'
          });
          updateIsLoading('paypal', false);
          return;
        }
      })();
      return;
    }

    // Stripe usa rota local, não Cloud Run
    if (platform === 'stripe') {
      console.log('💳 [ADMIN] Iniciando login Stripe...');
      const width = 600;
      const height = 700;
      const left = window.top ? (window.top.outerWidth - width) / 2 : 100;
      const top = window.top ? (window.top.outerHeight - height) / 2 : 100;
      const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no`;
      (async () => {
        try {
          const auth = getAuth(app);
          const user = auth.currentUser;
          const token = user ? await user.getIdToken() : null;
          if (!token) {
            toast({
              variant: 'destructive',
              title: 'Não autenticado',
              description: 'Faça login no painel antes de conectar o Stripe.'
            });
            updateIsLoading(platform, false);
            return;
          }

          const connectUrl = `${window.location.origin}/api/admin/stripe/connect?token=${encodeURIComponent(token)}`;
          console.log('🔗 [ADMIN] Abrindo popup Stripe:', connectUrl);
          const w = window.open(connectUrl, 'stripe_oauth', features);

          if (!w) {
            toast({
              variant: 'destructive',
              title: 'Popup bloqueado',
              description: 'Permita popups para conectar sua conta Stripe.'
            });
            updateIsLoading(platform, false);
            return;
          }

          const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            const data = event.data || {};
            if (!data.platform || data.platform !== 'stripe') return;

            console.log('📨 [ADMIN] Mensagem recebida do Stripe:', data);

            if (data.success === '1' || data.success === true || data.connected === '1' || data.connected === true) {
              toast({
                title: "Stripe conectado!",
                description: "Sua conta Stripe foi conectada com sucesso.",
              });
              setIntegrations(prev => ({ ...prev, stripe: true }));
            } else {
              const err = data.error || 'Falha na autenticação Stripe.';
              toast({ variant: 'destructive', title: 'Erro na conexão Stripe', description: String(err) });
            }
            updateIsLoading('stripe', false);
            window.removeEventListener('message', onMessage);
          };

          window.addEventListener('message', onMessage);

          // Timeout de segurança
          const tid = window.setTimeout(() => {
            window.removeEventListener('message', onMessage);
            updateIsLoading('stripe', false);
            console.log('⏱️ [ADMIN] Timeout na conexão Stripe');
          }, 120000);

          return;
        } catch (error) {
          console.error('❌ [ADMIN] Erro ao abrir popup Stripe:', error);
          toast({
            variant: 'destructive',
            title: 'Erro ao conectar Stripe',
            description: 'Não foi possível abrir a janela de autenticação.'
          });
          updateIsLoading('stripe', false);
          return;
        }
      })();
      return;
    }

    // Fluxo padrão (Instagram, Mercado Pago): abrir janela OAuth no Cloud Run
    const w = openOAuthWindow(platform as any);
    if (!w) {
      toast({ variant: 'destructive', title: 'Popup bloqueado', description: 'Permita popups para conectar sua conta.' });
      updateIsLoading(platform, false);
      return;
    }

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data || {};
      if (!data.platform || data.platform !== platform) return;

      if (data.success === '1' || data.success === true || data.connected === '1' || data.connected === true) {
        // Se vier username nos dados (para qualquer plataforma), salvar
        // Nota: Twitter usa Firebase Auth e não passará por aqui normalmente,
        // mas se vier via OAuth2, salvamos o username
        if (data.username) {
          const uid = getAuth(app).currentUser?.uid ?? null;
          if (uid) {
            localStorage.setItem(twitterKey('twitter_username', uid), data.username);
            sessionStorage.setItem(twitterKey('twitter_username', uid), data.username);
            localStorage.setItem(twitterKey('twitter_connected', uid), 'true');
          }
          toast({
            title: "Twitter conectado!",
            description: `Conta @${data.username} conectada. Suas fotos e vídeos agora serão carregados dessa conta.`,
          });
        } else {
          toast({
            title: "Conexão realizada com sucesso!",
            description: `${platform.charAt(0).toUpperCase() + platform.slice(1)} foi conectado à sua conta.`,
          });
        }
        setIntegrations(prev => ({ ...prev, [platform]: true }));
      } else {
        const err = data.error || 'Falha na autenticação.';
        toast({ variant: 'destructive', title: 'Erro na conexão', description: String(err) });
      }
      updateIsLoading(platform, false);
      window.removeEventListener('message', onMessage);
    };
    window.addEventListener('message', onMessage);
    // Timeout de segurança para não manter loading infinito caso o popup não retorne
    const tid = window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      updateIsLoading(platform, false);
    }, 120000);
    // Best-effort: limpar timeout quando receber mensagem
    const cleanupOnMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data || {};
      if (!data.platform || data.platform !== platform) return;
      window.clearTimeout(tid);
      window.removeEventListener('message', cleanupOnMessage);
    };
    window.addEventListener('message', cleanupOnMessage);
  };

  const handleDisconnect = async (platform: Integration) => {
    setIsLoading(prev => ({ ...prev, [platform]: true }));
    try {
      // Para Facebook/Instagram, fazer logout do SDK antes
      if (platform === 'facebook' || platform === 'instagram') {
        console.log(`[${platform}] Fazendo logout do Facebook SDK...`);
        try {
          await metaSDK.logout();
          console.log(`[${platform}] ✅ Logout do SDK concluído`);
        } catch (sdkError) {
          console.warn(`[${platform}] Erro no logout do SDK (continuando):`, sdkError);
        }
      }

      const auth = getAuth(app);
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;

      const res = await fetch('/api/admin/integrations/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ platform }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setIntegrations(prev => ({ ...prev, [platform]: false }));
        toast({ title: "Desconectado com sucesso", description: result.message });

        if (platform === 'twitter') {
          const uid = getAuth(app).currentUser?.uid ?? null;
          const username = uid ? localStorage.getItem(twitterKey('twitter_username', uid)) : null;

          if (uid) {
            localStorage.removeItem(twitterKey('twitter_username', uid));
            sessionStorage.removeItem(twitterKey('twitter_username', uid));
            localStorage.removeItem(twitterKey('twitter_connected', uid));
            localStorage.removeItem(twitterKey('twitter_uid', uid));
            localStorage.removeItem(twitterKey('twitter_media_cache', uid));
          }

          // Remover também legados (se existirem)
          localStorage.removeItem('twitter_username');
          sessionStorage.removeItem('twitter_username');
          localStorage.removeItem('twitter_connected');
          localStorage.removeItem('twitter_uid');
          localStorage.removeItem('twitter_media_cache');

          // Limpar cache do Firestore
          if (username) {
            try {
              const { getAuth } = await import('firebase/auth');
              const { app } = await import('@/lib/firebase');
              const auth = getAuth(app);
              const user = auth.currentUser;

              if (user) {
                const accessToken = await user.getIdToken();
                await fetch('/api/admin/twitter/clear-cache', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ username })
                });
                console.log('✅ Cache do Twitter limpo');
              }
            } catch (error) {
              console.warn('⚠️ Erro ao limpar cache:', error);
            }
          }

          // Deslogar do Firebase Auth também
          try {
            const { getAuth, signOut } = await import('firebase/auth');
            const { app } = await import('@/lib/firebase');
            const auth = getAuth(app);
            await signOut(auth);
          } catch { }

          try { await postLogout('twitter'); } catch { }
        }
        if (platform === 'facebook') {
          // @ts-ignore
          window.FB.logout();
          try { await postLogout('facebook'); } catch { }
        }
        if (platform === 'instagram') { try { await postLogout('instagram'); } catch { } }
        if (platform === 'mercadopago') { try { await postLogout('mercadopago'); } catch { } }
        if (platform === 'paypal') { try { await postLogout('paypal'); } catch { } }
        if (platform === 'stripe') { try { await postLogout('stripe'); } catch { } }
      } else {
        toast({ variant: 'destructive', title: "Falha ao desconectar", description: result.message });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Erro no servidor", description: error.message });
    } finally {
      setIsLoading(prev => ({ ...prev, [platform]: false }));
    }
  };


  const handleSyncFeed = async (platform: 'instagram' | 'facebook') => {
    setIsLoading(prev => ({ ...prev, [platform]: true }));
    try {
      const response = await fetch(`/api/admin/${platform}-feed`);
      const result = await response.json();
      if (result.success) {
        toast({ title: "Sincronização Concluída", description: result.message });
      } else {
        toast({ variant: 'destructive', title: "Falha na Sincronização", description: result.message });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Erro de Rede", description: "Não foi possível conectar ao servidor para sincronizar o feed." });
    } finally {
      setIsLoading(prev => ({ ...prev, [platform]: false }));
    }
  };

  const getTwitterDescription = () => {
    if (!integrations.twitter) {
      return 'Exibir feed de fotos recentes.';
    }

    const twitterUsername = adminUid ? localStorage.getItem(twitterKey('twitter_username', adminUid)) : null;
    return twitterUsername ? `Conectado como @${twitterUsername}` : 'Conectado';
  };

  const googleCalendarConnected = Boolean(calendarSettings?.google?.connected);
  const appleCalendarConnected = Boolean(calendarSettings?.apple?.connected);

  return (
    <>
      <div className="rounded-xl bg-black/90 border border-white/10 p-4 backdrop-blur-sm flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl text-white">Integrações de Plataformas</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {/* Facebook */}
        <IntegrationCard
          platform="facebook"
          title="Facebook"
          description="Exibir galeria de fotos e posts recentes."
          icon={<FacebookIcon />}
          isConnected={integrations.facebook}
          isLoading={isLoading.facebook}
          onConnect={() => handleConnect('facebook')}
          onDisconnect={() => handleDisconnect('facebook')}
          onSync={() => handleSyncFeed('facebook')}
          syncing={isLoading.facebook}
          permissions={[
            "Informações públicas do perfil",
            "Postagens e fotos da página",
            "Gerenciar páginas",
            "Publicar conteúdo em sua página"
          ]}
        />

        {/* Instagram */}
        <IntegrationCard
          platform="instagram"
          title="Instagram"
          description="Conecte sua conta Business para exibir mídia e insights."
          icon={<InstagramIcon />}
          isConnected={integrations.instagram}
          isLoading={isLoading.instagram}
          onConnect={() => handleConnect('instagram')}
          onDisconnect={() => handleDisconnect('instagram')}
          onSync={() => handleSyncFeed('instagram')}
          syncing={isLoading.instagram}
          permissions={[
            "Informações públicas do perfil Business",
            "Mídia publicada (fotos e vídeos)",
            "Métricas e insights da conta",
            "Comentários e menções"
          ]}
        />

        {/* WhatsApp */}
        <IntegrationCard
          platform="whatsapp"
          title="WhatsApp"
          description="Exibir galeria de fotos e posts recentes pelo WhatsApp."
          icon={<WhatsAppIcon />}
          isConnected={integrations.whatsapp}
          isLoading={isLoading.whatsapp}
          onConnect={() => handleConnect('whatsapp')}
          onDisconnect={() => handleDisconnect('whatsapp')}
          extraAction={{
            label: "Abrir QR code",
            icon: <QrCode className="h-4 w-4" />,
            onClick: handleOpenWhatsAppQr,
            className: "h-10 w-10"
          }}
          permissions={[
            "Enviar e receber mensagens",
            "Gerenciar conversas",
            "Acesso ao catálogo de produtos",
            "Informações de contatos"
          ]}
        />

        {/* Twitter */}
        <IntegrationCard
          platform="twitter"
          title="Twitter / X"
          description={getTwitterDescription()}
          icon={<TwitterIcon />}
          isConnected={integrations.twitter}
          isLoading={isLoading.twitter}
          onConnect={() => handleConnect('twitter')}
          onDisconnect={() => handleDisconnect('twitter')}
          onSettings={() => {
            console.log('[INTEGRATIONS] Abrindo configurações do Twitter Bearer Token');
            setShowTwitterSettings(true);
          }}
          permissions={[
            "Ler tweets e informações do perfil",
            "Postar tweets e mídia",
            "Seguir e ser seguido",
            "Acessar mensagens diretas"
          ]}
        />

        {/* Google */}
        <IntegrationCard
          platform="google"
          title="Google"
          description="Conecte sua conta Google para Calendar + Google Photos (privado) com fallback no Drive público."
          icon={<GoogleIcon />}
          isConnected={googleCalendarConnected}
          isLoading={calendarLoading || calendarSaving || googleGalleryLoading}
          onConnect={() => handleConnect('google')}
          onDisconnect={handleGoogleCalendarDisconnect}
          onSync={handleGoogleGallerySync}
          syncing={googleGalleryLoading}
          extraAction={{
            label: "Configurar calendário",
            icon: <CalendarIcon className="h-4 w-4" />,
            onClick: openGoogleCalendarDialog,
            className: "h-10 w-10"
          }}
          permissions={[
            "Ver e criar eventos no calendário",
            "Gerenciar configurações do calendário",
            "Acesso aos calendários compartilhados",
            "Ler mídia privada no Google Photos",
            "Ler imagens públicas no Google Drive"
          ]}
        />
        {/* Meta IA Card: só habilita se Google estiver conectado */}
        <IntegrationCard
          platform="metaia"
          title="Meta AI (Facebook/Instagram/WhatsApp)"
          description="Conecte sua conta Meta AI para integração com Facebook, Instagram e WhatsApp. Requer Google conectado."
          icon={<FacebookIcon className="w-10 h-10" />}
          isConnected={integrations.facebook || integrations.instagram || integrations.whatsapp}
          isLoading={isLoading.facebook || isLoading.instagram || isLoading.whatsapp}
          onConnect={() => {
            if (!integrations.google) {
              toast({
                variant: 'destructive',
                title: 'Conecte o Google primeiro',
                description: 'Você precisa conectar sua conta Google antes de conectar Meta AI (Facebook/Instagram/WhatsApp).'
              });
              return;
            }
            window.open('/api/admin/meta/connect', '_blank', 'width=600,height=700');
          }}
          onDisconnect={() => {}}
          permissions={['facebook', 'instagram', 'whatsapp']}
        />

        {/* Apple */}
        <IntegrationCard
          platform="apple"
          title="Apple"
          description="Conecte seu Apple ID para sincronizar eventos no iCloud Calendar."
          icon={<Apple className="h-8 w-8" />}
          isConnected={appleCalendarConnected}
          isLoading={calendarLoading || calendarSaving}
          onConnect={() => handleConnect('apple')}
          onDisconnect={handleAppleCalendarDisconnect}
          extraAction={{
            label: "Configurar calendário",
            icon: <CalendarIcon className="h-4 w-4" />,
            onClick: openAppleCalendarDialog,
            className: "h-10 w-10"
          }}
          permissions={[
            "Ver e criar eventos no iCloud Calendar",
            "Sincronizar eventos entre dispositivos",
            "Acesso aos calendários compartilhados"
          ]}
        />

        {/* PayPal */}
        <IntegrationCard
          platform="paypal"
          title="PayPal"
          description="Conecte sua conta para receber pagamentos na loja."
          icon={<PayPalIcon />}
          isConnected={integrations.paypal}
          isLoading={isLoading.paypal}
          onConnect={() => handleConnect('paypal')}
          onDisconnect={() => handleDisconnect('paypal')}
          permissions={[
            "Processar pagamentos",
            "Visualizar informações de transações",
            "Gerenciar reembolsos",
            "Acessar dados da conta comercial"
          ]}
        />

        {/* Stripe */}
        <IntegrationCard
          platform="stripe"
          title="Stripe"
          description="Conecte sua conta para receber pagamentos na loja."
          icon={<StripeIcon />}
          isConnected={integrations.stripe}
          isLoading={isLoading.stripe}
          onConnect={() => handleConnect('stripe')}
          onDisconnect={() => handleDisconnect('stripe')}
          permissions={[
            "Processar pagamentos e cobranças",
            "Visualizar saldo e transações",
            "Gerenciar clientes e assinaturas",
            "Emitir reembolsos"
          ]}
        />

        {/* Mercado Pago */}
        <IntegrationCard
          platform="mercadopago"
          title="Mercado Pago"
          description="Conecte sua conta para receber pagamentos via Pix e outros métodos."
          icon={<MercadoPagoIcon />}
          isConnected={integrations.mercadopago}
          isLoading={isLoading.mercadopago}
          onConnect={() => handleConnect('mercadopago')}
          onDisconnect={() => handleDisconnect('mercadopago')}
          permissions={[
            "Processar pagamentos via Pix",
            "Criar e gerenciar cobranças",
            "Visualizar histórico de transações",
            "Gerenciar informações da conta"
          ]}
        />

        {/* Cards de cadastro (Auth Demo / Phone / FirebaseUI) removidos: fluxo foi movido para o modal de cadastro do admin */}
      </div>

      <Dialog open={isGoogleCalendarDialogOpen} onOpenChange={setIsGoogleCalendarDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Google Calendar</DialogTitle>
            <DialogDescription>
              Habilite para criar eventos no calendário ao agendar publicações.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {calendarStatus && (
              <p className="text-sm text-destructive">{calendarStatus}</p>
            )}

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Sincronização</p>
                <p className="text-xs text-muted-foreground">
                  Habilite para criar eventos no calendário ao agendar publicações.
                </p>
              </div>
              <Switch
                checked={Boolean(calendarSettings?.syncEnabled)}
                onCheckedChange={(checked) => updateCalendarSettings({ syncEnabled: checked })}
                disabled={calendarLoading || calendarSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="google-calendar-id">Calendar ID</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="google-calendar-id"
                  value={calendarId}
                  onChange={(event) => setCalendarId(event.target.value)}
                  placeholder="primary"
                  disabled={!googleCalendarConnected}
                />
                <Button
                  variant="secondary"
                  onClick={() => updateCalendarSettings({ google: { calendarId } })}
                  disabled={!googleCalendarConnected || calendarSaving}
                >
                  Salvar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use “primary” para o calendário padrão ou o ID exibido no Google Calendar.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className="text-xs text-muted-foreground">
                  {googleCalendarConnected ? 'Conectado' : 'Não conectado'}
                </p>
              </div>
              {googleCalendarConnected ? (
                <Button variant="outline" onClick={handleGoogleCalendarDisconnect} disabled={calendarSaving}>
                  Desconectar
                </Button>
              ) : (
                <Button onClick={handleGoogleCalendarConnect} disabled={calendarSaving}>
                  Conectar Google
                </Button>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              A sincronização é opcional. Se desativada, os agendamentos continuam funcionando sem criar eventos nos calendários.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAppleCalendarDialogOpen} onOpenChange={setIsAppleCalendarDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Apple Calendar (iCloud)</DialogTitle>
            <DialogDescription>
              Conecte seu Apple ID para sincronizar eventos no iCloud Calendar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {calendarStatus && (
              <p className="text-sm text-destructive">{calendarStatus}</p>
            )}

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className="text-xs text-muted-foreground">
                  {appleCalendarConnected ? 'Conectado' : 'Não conectado'}
                </p>
              </div>
              {appleCalendarConnected ? (
                <Button variant="outline" onClick={handleAppleCalendarDisconnect} disabled={calendarSaving}>
                  Desconectar
                </Button>
              ) : null}
            </div>

            {!appleCalendarConnected && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="apple-username">Usuário iCloud</Label>
                  <Input
                    id="apple-username"
                    value={appleForm.username}
                    onChange={(event) => setAppleForm((prev) => ({ ...prev, username: event.target.value }))}
                    placeholder="seuemail@icloud.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apple-password">Senha de app (Apple ID)</Label>
                  <Input
                    id="apple-password"
                    type="password"
                    value={appleForm.appPassword}
                    onChange={(event) => setAppleForm((prev) => ({ ...prev, appPassword: event.target.value }))}
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apple-calendar-url">URL do Calendário (opcional)</Label>
                  <Input
                    id="apple-calendar-url"
                    value={appleForm.calendarUrl}
                    onChange={(event) => setAppleForm((prev) => ({ ...prev, calendarUrl: event.target.value }))}
                    placeholder="https://caldav.icloud.com/..."
                  />
                </div>
                <Button onClick={handleAppleCalendarConnect} disabled={calendarSaving}>
                  Conectar Apple Calendar
                </Button>
                <p className="text-xs text-muted-foreground">
                  Gere uma senha de app no Apple ID para permitir a conexão.
                </p>
              </div>
            )}

            {appleCalendarConnected && (
              <div className="text-sm text-muted-foreground">
                Conectado como {calendarSettings?.apple?.username || 'iCloud'}
                {calendarSettings?.apple?.calendarName ? ` • ${calendarSettings.apple.calendarName}` : ''}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Configurações do Twitter Bearer Token */}
      <TwitterBearerTokenModal
        isOpen={showTwitterSettings}
        onClose={() => setShowTwitterSettings(false)}
      />

      <Dialog open={isWhatsAppQrOpen} onOpenChange={handleWhatsAppQrOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>WhatsApp Business</DialogTitle>
            <DialogDescription>
              Escaneie o QR code no WhatsApp Business para conectar sua conta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-center rounded-lg border bg-muted/40 p-4 min-h-[220px]">
              {isWhatsAppQrLoading ? (
                <div className="text-sm text-muted-foreground">Gerando QR code...</div>
              ) : whatsAppQr?.qr_image_url ? (
                <Image
                  src={whatsAppQr.qr_image_url}
                  alt="QR code WhatsApp Business"
                  width={240}
                  height={240}
                  className="h-60 w-60 object-contain"
                  unoptimized
                />
              ) : (
                <div className="text-sm text-muted-foreground">QR code indisponível.</div>
              )}
            </div>

            {whatsAppQrError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {whatsAppQrError}
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={handleGenerateWhatsAppQr} disabled={isWhatsAppQrLoading}>
                {isWhatsAppQrLoading ? "Gerando..." : "Gerar novamente"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fluxo de Twitter via FirebaseUI Web executa em container oculto; nenhuma alteração visual aqui. */}
    </>
  );
}

// Modal compacto para configuração do Bearer Token
function TwitterBearerTokenModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [bearerToken, setBearerToken] = useState('');
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchCurrentToken();
    }
  }, [isOpen]);

  const fetchCurrentToken = async () => {
    setIsFetching(true);
    try {
      // Obter token de autenticação do Firebase
      const { getAuth } = await import('firebase/auth');
      const { app } = await import('@/lib/firebase');
      const auth = getAuth(app);
      const user = auth.currentUser;

      if (!user) {
        console.error('Usuário não autenticado');
        return;
      }

      const accessToken = await user.getIdToken();

      const res = await fetch('/api/admin/twitter/bearer-token', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentToken(data.source);
      }
    } catch (error) {
      console.error('Erro ao buscar token:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSaveToken = async () => {
    if (!bearerToken.trim()) {
      toast({
        variant: 'destructive',
        title: 'Token vazio',
        description: 'Por favor, insira um Bearer Token válido.'
      });
      return;
    }

    setIsLoading(true);
    try {
      // Obter token de autenticação do Firebase
      const { getAuth } = await import('firebase/auth');
      const { app } = await import('@/lib/firebase');
      const auth = getAuth(app);
      const user = auth.currentUser;

      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Não autenticado',
          description: 'Você precisa estar logado para salvar o token.'
        });
        setIsLoading(false);
        return;
      }

      const accessToken = await user.getIdToken();

      const res = await fetch('/api/admin/twitter/bearer-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ token: bearerToken })
      });

      if (res.ok) {
        toast({
          title: 'Token salvo!',
          description: 'O Bearer Token foi atualizado com sucesso.'
        });
        setBearerToken('');
        fetchCurrentToken();
        onClose();
      } else {
        const error = await res.json();
        toast({
          variant: 'destructive',
          title: 'Erro ao salvar',
          description: error.error || 'Não foi possível salvar o token.'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro de conexão',
        description: 'Não foi possível conectar ao servidor.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreDefault = async () => {
    setIsLoading(true);
    try {
      // Obter token de autenticação do Firebase
      const { getAuth } = await import('firebase/auth');
      const { app } = await import('@/lib/firebase');
      const auth = getAuth(app);
      const user = auth.currentUser;

      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Não autenticado',
          description: 'Você precisa estar logado para restaurar o token.'
        });
        setIsLoading(false);
        return;
      }

      const accessToken = await user.getIdToken();

      const res = await fetch('/api/admin/twitter/bearer-token', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (res.ok) {
        toast({
          title: 'Token restaurado!',
          description: 'O sistema voltará a usar o token padrão do .env'
        });
        fetchCurrentToken();
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao restaurar',
          description: 'Não foi possível restaurar o token padrão.'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro de conexão',
        description: 'Não foi possível conectar ao servidor.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
        <Card className="shadow-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TwitterIcon />
                <CardTitle className="text-lg text-white">Twitter API Token</CardTitle>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            {!isFetching && currentToken && (
              <CardDescription className="text-xs">
                Token atual: <span className="font-mono text-[#1DA1F2]">{currentToken}</span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="bearer-token" className="text-sm font-medium">
                Novo Bearer Token
              </label>
              <input
                id="bearer-token"
                type="text"
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
                placeholder="AAAAAAAAAAAAAAAAAAAAAA..."
                className="w-full px-3 py-2 border rounded-md font-mono text-xs"
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveToken}
                disabled={isLoading || !bearerToken.trim()}
                className="flex-1 px-3 py-2 text-sm bg-[#1DA1F2] text-white rounded-md hover:bg-[#1A91DA] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Salvando...' : 'Salvar'}
              </button>

              {currentToken === 'firestore' && (
                <button
                  onClick={handleRestoreDefault}
                  disabled={isLoading}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Restaurar
                </button>
              )}
            </div>

            <p className="text-xs text-muted-foreground pt-2 border-t">
              💡 Troque quando atingir o limite de requisições
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}