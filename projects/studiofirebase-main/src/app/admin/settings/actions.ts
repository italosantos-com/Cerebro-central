
'use server';
/**
 * @fileOverview Server-side actions for managing profile settings.
 * These functions read from and write to the Firebase Firestore using Admin SDK.
 */

import { getAdminDb } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import {
  DEFAULT_PROFILE_IMAGE,
  DEFAULT_COVER_IMAGE,
  ensureFirebaseImageAccess
} from './image-helpers';

export interface ProfileSettings {
  name: string;
  phone: string;
  email: string;
  address: string;
  description?: string;
  profilePictureUrl: string;
  coverPhotoUrl: string;
  galleryPhotos: { url: string }[];
  galleryNames?: string[]; // Nomes personalizados das 7 galerias
  adultWorkLabel?: string; // Texto personalizável para "+18 Adult Work"
  showAdultContent?: boolean; // Controla exibição do aviso adulto e Menu de Conteúdo
  fetishMenu?: {
    categories: Array<{
      name: string;
      items?: Array<{
        title: string;
        description?: string;
      }>;
    }>;
  };

  // Dados Bancários
  bankAccount?: {
    bank: string;
    agency: string;
    account: string;
    accountType: string;
    cpf: string;
    pixKey: string;
  };

  // Redes Sociais
  socialMedia?: {
    instagram: string;
    twitter: string;
    youtube: string;
    whatsapp: string;
    telegram: string;
  };

  // Configurações de Avaliações
  reviewSettings?: {
    showReviews: boolean;
    moderateReviews: boolean;
    defaultReviewMessage: string;
    sendReviewToSecretChat?: boolean;
  };

  // Configurações de Pagamento
  paymentSettings?: {
    pixValue: number;
    pixKey: string;
    pixKeyType: string;
    // PayPal Configuration
    paypalClientId?: string;
    paypalClientSecret?: string;
    paypalSandboxMode?: boolean;
    paypalEmail?: string;
    // MercadoPago Configuration
    mercadoPagoPublicKey?: string;
    mercadoPagoAccessToken?: string;
    mercadoPagoSandboxMode?: boolean;
    mercadoPagoEmail?: string;
  };

  // Configurações do Footer
  footerSettings?: {
    showTwitter: boolean;
    twitterUrl: string;
    showInstagram: boolean;
    instagramUrl: string;
    showYoutube: boolean;
    youtubeUrl: string;
    showWhatsapp: boolean;
    whatsappUrl: string;
    showTelegram: boolean;
    telegramUrl: string;
    showFacebook: boolean;
    facebookUrl: string;
  };

  // Configurações de Personalização
  appearanceSettings?: {
    textColor: string; // Hex color (#RRGGBB)
    numberColor: string; // Hex color (#RRGGBB)
    buttonColor: string; // Hex color (#RRGGBB)
    buttonTextColor: string; // Hex color (#RRGGBB)
    lineColor: string; // Hex color (#RRGGBB)
    neonGlowColor: string; // Hex color (#RRGGBB)
    containerColor: string; // Hex color (#RRGGBB)
    backgroundColor: string; // Hex color (#RRGGBB)
    fontFamily: string; // CSS font-family stack
    fontSizePx: number; // Base font size in px
    iconColor: string; // Hex color (#RRGGBB)
    userSidebarIconColor: string; // Hex color (#RRGGBB)
    adminSidebarIconColor: string; // Hex color (#RRGGBB)
    secretChatColor: string; // Hex color (#RRGGBB)
    whatsappBubbleColor: string; // Hex color (#RRGGBB)
    iosHeaderBg?: string; // Hex color (#RRGGBB)
    iosHeaderBorder?: string; // Hex color (#RRGGBB)
  };

  // Configurações do Cérebro Central IA
  cerebroCentralServices?: Record<string, boolean>;

  // Configuração de exibição do botão WhatsApp
  showWhatsappButton?: boolean;
  
  // Configuração de exibição do botão Live Chat
  showLiveChatButton?: boolean;

  // Configurações da tela de personalização iOS
  themeMode?: 'Light' | 'Dark' | 'System';
  highlightEnabled?: boolean;
}

function buildDefaultProfileSettings(options: {
  adminUid?: string;
  galleryNames: string[];
}): ProfileSettings {
  const { galleryNames } = options;

  return {
    name: '',
    phone: '',
    email: '',
    address: '',
    description: '',
    profilePictureUrl: DEFAULT_PROFILE_IMAGE,
    coverPhotoUrl: DEFAULT_COVER_IMAGE,
    galleryPhotos: [],
    galleryNames: [...galleryNames],
    adultWorkLabel: '+18 ADULT WORK',
    fetishMenu: {
      categories: [],
    },
    footerSettings: {
      showTwitter: false,
      twitterUrl: '',
      showInstagram: false,
      instagramUrl: '',
      showYoutube: false,
      youtubeUrl: '',
      showWhatsapp: false,
      whatsappUrl: '',
      showTelegram: false,
      telegramUrl: '',
      showFacebook: false,
      facebookUrl: ''
    },
    appearanceSettings: {
      textColor: '#ffffff',
      numberColor: '#ffffff',
      buttonColor: '#ffffff',
      buttonTextColor: '#000000',
      lineColor: '#4b5563',
      neonGlowColor: '#ffffff',
      containerColor: '#111111',
      backgroundColor: '#000000',
      fontFamily: '"Times New Roman", Times, serif',
      fontSizePx: 16,
      iconColor: '#ffffff',
      userSidebarIconColor: '#ffffff',
      adminSidebarIconColor: '#ffffff',
      secretChatColor: '#ffffff',
      whatsappBubbleColor: '#000000',
      iosHeaderBg: '#e5e5ea',
      iosHeaderBorder: '#c7c7cc'
    },
    reviewSettings: {
      showReviews: true,
      moderateReviews: true,
      defaultReviewMessage: '',
      sendReviewToSecretChat: false
    },
    cerebroCentralServices: {},
    showWhatsappButton: true,
    showLiveChatButton: true,
    themeMode: 'System',
    highlightEnabled: false
  };
}

/**
 * Saves the profile settings to Cloud Firestore.
 * 
 * @param settings The profile settings object to save.
 * @param adminUid Optional admin UID. If provided, saves to individual admin profile.
 *                 If not provided, saves to global SuperAdmin location.
 * 
 * ESTRUTURA DE ARMAZENAMENTO:
 * - Com adminUid: admins/{adminUid}/profile/settings (perfil individual)
 * - Sem adminUid: admin/profileSettings (GLOBAL - gerenciado pelo SuperAdmin pix@italosantos.com)
 * 
 * @returns A promise that resolves when the settings are saved.
 */
export async function saveProfileSettings(settings: ProfileSettings, adminUid?: string): Promise<void> {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      throw new Error('Firebase Admin DB não inicializado');
    }

    // Se adminUid for fornecido, salvar no perfil individual do admin
    if (adminUid) {
      console.log(`[saveProfileSettings] Salvando perfil individual: admins/${adminUid}/profile/settings`);
      await adminDb.collection('admins').doc(adminUid).collection('profile').doc('settings').set(settings);
    } else {
      // GLOBAL: Salvar no documento do SuperAdmin (pix@italosantos.com)
      // Este é o documento PADRÃO usado para páginas públicas e homepage
      console.log('[saveProfileSettings] Salvando configurações globais do SuperAdmin: admin/profileSettings');
      await adminDb.collection('admin').doc('profileSettings').set(settings);
    }

    // Revalidar as páginas que usam essas configurações
    revalidatePath('/');
    revalidatePath('/admin/settings');
    revalidatePath('/api/admin/profile-settings');

  } catch (error: any) {
    throw new Error(`Failed to save settings to the database: ${error.message}`, { cause: error });
  }

}

/**
 * Retrieves the profile settings from the Firebase Realtime Database.
 * @param adminUid Optional admin UID. If provided, loads individual admin profile. If not provided, loads from legacy global location.
 * @returns A promise that resolves with the profile settings object, or null if not found.
 */
export async function getProfileSettings(adminUid?: string): Promise<ProfileSettings | null> {
  const defaultGalleryNames = [
    "ACOMPANHANTE MASCULINO",
    "SENSUALIDADE",
    "PRAZER",
    "BDSM",
    "FETISH",
    "FANTASIA",
    "IS"
  ];

  try {
    const scope = adminUid ? `admin: ${adminUid}` : 'global (public pages)';
    console.log(`[getProfileSettings] Buscando configurações para ${scope}`);
    const adminDb = getAdminDb();
    if (!adminDb) {
      console.error('[getProfileSettings] Firebase Admin DB não inicializado');
      throw new Error('Firebase Admin DB não inicializado');
    }

    let docSnap;

    const firestoreTimeoutMs = Number(process.env.FIRESTORE_REQUEST_TIMEOUT_MS || '15000');
    const withTimeout = async <T,>(promise: Promise<T>, label: string): Promise<T> => {
      if (!Number.isFinite(firestoreTimeoutMs) || firestoreTimeoutMs <= 0) return promise;
      const start = Date.now();
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const warning = new Promise<void>((resolve) => {
        timeoutId = setTimeout(() => {
          console.warn(`[getProfileSettings] Firestore lento depois de ${firestoreTimeoutMs}ms: ${label}`);
          resolve();
        }, firestoreTimeoutMs);
      });

      try {
        await Promise.race([promise.then(() => undefined), warning]);
        return await promise;
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        const elapsed = Date.now() - start;
        if (elapsed > firestoreTimeoutMs) {
          console.warn(`[getProfileSettings] Firestore concluiu em ${elapsed}ms: ${label}`);
        }
      }
    };

    /**
     * LÓGICA DE FALLBACK PARA SUPERADMIN:
     * 
     * 1. Se adminUid fornecido → buscar de admins/{adminUid}/profile/settings
     * 2. Se adminUid NÃO fornecido (páginas públicas/global) → usar admin/profileSettings
     *    → Este é o documento gerenciado EXCLUSIVAMENTE pelo SuperAdmin (pix@italosantos.com)
     * 
     * O documento admin/profileSettings é o FALLBACK GLOBAL usado quando:
     * - Páginas públicas sem contexto de admin específico
     * - Homepage principal (italosantos.com/)
     * - Configuração padrão do sistema
     */

    // Se adminUid for fornecido, buscar do perfil individual do admin
    if (adminUid) {
      const path = `admins/${adminUid}/profile/settings`;
      console.log(`[getProfileSettings] Buscando de: ${path}`);
      docSnap = await withTimeout(
        adminDb.collection('admins').doc(adminUid).collection('profile').doc('settings').get(),
        path
      );

      // Se perfil individual não existir, inicializar com defaults do próprio admin
      if (!docSnap.exists) {
        console.log(`[getProfileSettings] ⚠️ Perfil individual não encontrado, criando defaults para admin ${adminUid}`);
        const defaults = buildDefaultProfileSettings({
          adminUid,
          galleryNames: defaultGalleryNames
        });
        await saveProfileSettings(defaults, adminUid);
        return await ensureFirebaseImageAccess(defaults);
      }
    } else {
      // GLOBAL: Usar documento do SuperAdmin (pix@italosantos.com)
      // Este é o documento PADRÃO para páginas públicas e homepage
      const path = 'admin/profileSettings';
      console.log(`[getProfileSettings] Buscando configurações globais do SuperAdmin de: ${path}`);
      docSnap = await withTimeout(adminDb.collection('admin').doc('profileSettings').get(), path);
    }

    const status = docSnap.exists ? '✅ Encontrado' : '❌ Não encontrado';
    console.log(`[getProfileSettings] ${status}`);
    if (docSnap.exists) {
      const settings = docSnap.data() as ProfileSettings;

      // Garantir que as imagens tenham placeholders locais válidos
      if (!settings.coverPhotoUrl) {
        settings.coverPhotoUrl = DEFAULT_COVER_IMAGE;
      }

      if (!settings.profilePictureUrl) {
        settings.profilePictureUrl = DEFAULT_PROFILE_IMAGE;
      }

      // Garantir que galleryNames seja um array com 7 elementos
      if (!settings.galleryNames || !Array.isArray(settings.galleryNames)) {
        settings.galleryNames = [...defaultGalleryNames];
      } else {
        // Preencher até 7 elementos se necessário
        while (settings.galleryNames.length < 7) {
          const index = settings.galleryNames.length;
          settings.galleryNames.push(defaultGalleryNames[index] || `Galeria ${index + 1}`);
        }
        // Limitar a 7 elementos
        settings.galleryNames = settings.galleryNames.slice(0, 7);
      }

      // Garantir que adultWorkLabel tenha um valor padrão
      if (!settings.adultWorkLabel) {
        settings.adultWorkLabel = '+18 ADULT WORK';
      }

      // Garantir que footerSettings tenha valores padrão
      if (!settings.footerSettings) {
        const defaults = buildDefaultProfileSettings({
          adminUid,
          galleryNames: defaultGalleryNames
        });
        settings.footerSettings = defaults.footerSettings;
      }

      // Garantir que appearanceSettings tenha valores padrão
      const defaults = buildDefaultProfileSettings({
        adminUid,
        galleryNames: defaultGalleryNames
      });
      // Garantir que reviewSettings tenha valores padrão
      if (!settings.reviewSettings) {
        settings.reviewSettings = defaults.reviewSettings;
      } else {
        settings.reviewSettings = {
          ...defaults.reviewSettings,
          ...settings.reviewSettings,
        };
      }
      if (!settings.appearanceSettings) {
        settings.appearanceSettings = defaults.appearanceSettings;
      } else {
        settings.appearanceSettings = {
          ...defaults.appearanceSettings,
          ...settings.appearanceSettings,
        };
      }

      return await ensureFirebaseImageAccess(settings);
    }

    // Se for perfil individual e não existir, inicializar com dados limpos (placeholders)
    if (adminUid) {
      const defaults = buildDefaultProfileSettings({
        adminUid,
        galleryNames: defaultGalleryNames
      });
      await saveProfileSettings(defaults, adminUid);
      return await ensureFirebaseImageAccess(defaults);
    }

    console.log('[getProfileSettings] ⚠️ Documento não encontrado, retornando null');
    return null;
  } catch (error: any) {
    // Em caso de erro, retornar configurações padrão para não quebrar a aplicação
    console.error('[getProfileSettings] ❌ Erro ao buscar configurações:', error);
    const defaults = buildDefaultProfileSettings({
      adminUid,
      galleryNames: defaultGalleryNames
    });
    return await ensureFirebaseImageAccess(defaults);
  }
}
