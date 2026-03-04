'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { ProfileSettings } from '@/app/admin/settings/actions';
import { ProfileConfigService } from '@/services/profile-config-service';
import { getPublicUsernameFromPathname } from '@/utils/public-admin-scope';
import { resolveAdminUidByUsername } from '@/utils/admin-lookup-client';
import { SUPERADMIN_USERNAME, isSuperAdminUsername } from '@/lib/superadmin-config';
import { doc, getDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function isVerboseDebugEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_VERBOSE_DEBUG === 'true') {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem('verboseDebug') === 'true';
  } catch {
    return false;
  }
}

function profileDebug(message: string, ...args: unknown[]) {
  if (!isVerboseDebugEnabled()) {
    return;
  }
  console.log(message, ...args);
}

/**
 * =========================================================
 * HOOK DE CONFIGURAÇÃO DE PERFIL
 * =========================================================
 * 
 * ESTRUTURA DE DADOS:
 * 
 * 1. HOMEPAGE (/) e SUPERADMIN (severepics):
 *    - Usa: admin/profileSettings (global)
 *    - Gerenciado por: pix@italosantos.com
 * 
 * 2. OUTROS ADMINS (/{username}):
 *    - Usa: admins/{adminUid}/profile/settings (individual)
 *    - Fallback: admin/profileSettings se não existir
 * 
 * =========================================================
 */

const FALLBACK_SETTINGS: ProfileSettings = {
  name: '',
  phone: '',
  email: '',
  address: '',
  description: '',
  profilePictureUrl: '/placeholder-photo.svg',
  coverPhotoUrl: '/placeholder-cover.svg',
  galleryPhotos: [],
  adultWorkLabel: '+18 ADULT WORK',
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
    whatsappBubbleColor: '#000000'
  }
};

function buildDefaultPublicSettings(adminData?: { name?: string; email?: string; phone?: string }): ProfileSettings {
  return {
    ...FALLBACK_SETTINGS,
    name: adminData?.name || '',
    email: adminData?.email || '',
    phone: adminData?.phone || ''
  };
}

// Cache key para localStorage
const GLOBAL_CACHE_KEY = 'profileSettings:global';

function getLocalCacheKey(): string {
  if (typeof window === 'undefined') return GLOBAL_CACHE_KEY;
  const username = getPublicUsernameFromPathname(window.location.pathname);
  // SuperAdmin usa cache global
  if (isSuperAdminUsername(username)) return GLOBAL_CACHE_KEY;
  return username ? `profileSettings:${username}` : GLOBAL_CACHE_KEY;
}

/**
 * Carrega configurações GLOBAIS do SuperAdmin (admin/profileSettings)
 * Usado para homepage e páginas públicas sem contexto de admin específico
 */
async function loadGlobalSuperAdminSettings(): Promise<ProfileSettings | null> {
  try {
    const ref = doc(db, 'admin', 'profileSettings');
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    profileDebug('[useProfileConfig] ✅ Carregando perfil global do SuperAdmin (admin/profileSettings)');
    return snap.data() as ProfileSettings;
  } catch (error) {
    console.error('[useProfileConfig] ❌ Erro ao carregar perfil global:', error);
    return null;
  }
}

/**
 * Carrega configurações de um admin específico por username
 * Com fallback para perfil global se não encontrar
 */
async function loadPublicAdminSettingsByUsername(username: string): Promise<ProfileSettings | null> {
  // Se é SuperAdmin (severepics), usar perfil global direto
  if (isSuperAdminUsername(username)) {
    profileDebug('[useProfileConfig] Username é SuperAdmin (severepics) - usando perfil global');
    return await loadGlobalSuperAdminSettings();
  }

  const adminUid = await resolveAdminUidByUsername(username);
  if (!adminUid) {
    profileDebug('[useProfileConfig] Admin não encontrado, usando template genérico...');
    return buildDefaultPublicSettings();
  }

  const ref = doc(db, 'admins', adminUid, 'profile', 'settings');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    profileDebug('[useProfileConfig] Perfil individual não encontrado, usando defaults do admin...');
    const adminDoc = await getDoc(doc(db, 'admins', adminUid));
    const adminData = adminDoc.exists() ? (adminDoc.data() as { name?: string; email?: string; phone?: string }) : undefined;
    return buildDefaultPublicSettings(adminData);
  }
  return snap.data() as ProfileSettings;
}

export function useProfileConfig() {
  const pathname = usePathname();
  const [settings, setSettings] = useState<ProfileSettings | null>(() => {
    // Tentar carregar do localStorage primeiro para evitar flickering
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(getLocalCacheKey());
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      if (settings) {
        setLoading(false); // Se já temos dados em cache, não mostrar loading
      } else {
        setLoading(true);
      }
      setError(null);

      let data: ProfileSettings | null = null;

      if (typeof window !== 'undefined') {
        const currentPathname = pathname || window.location.pathname;
        const username = getPublicUsernameFromPathname(currentPathname);
        const isSuperAdmin = isSuperAdminUsername(username);

        // LÓGICA DE CARREGAMENTO:
        // 1. Homepage (/) → usa perfil global (admin/profileSettings)
        // 2. /severepics → usa perfil global (admin/profileSettings)
        // 3. /{username} → tenta perfil individual, fallback para global

        if (currentPathname === '/' || currentPathname === '') {
          // Homepage: sempre usa perfil global do SuperAdmin
          profileDebug('[useProfileConfig] 🏠 Homepage - carregando perfil global do SuperAdmin');
          data = await loadGlobalSuperAdminSettings();
        } else if (username) {
          // Página de perfil público: tenta individual com fallback para global
          data = await loadPublicAdminSettingsByUsername(username);
        }
      }

      if (!data) {
        // Fallback final: evitar global quando for admin público não-superadmin
        if (typeof window !== 'undefined') {
          const currentPathname = pathname || window.location.pathname;
          const username = getPublicUsernameFromPathname(currentPathname);
          const isSuperAdmin = isSuperAdminUsername(username);
          if (username && !isSuperAdmin && currentPathname !== '/' && currentPathname !== '') {
            data = FALLBACK_SETTINGS;
          }
        }
      }

      if (!data) {
        // Fallback via API de configurações globais
        profileDebug('[useProfileConfig] Usando fallback via ProfileConfigService');
        data = await ProfileConfigService.getProfileSettings();
      }

      if (!data) {
        // Fallback último: tentar carregar direto do Firestore
        profileDebug('[useProfileConfig] Último fallback: carregando admin/profileSettings direto');
        data = await loadGlobalSuperAdminSettings();
      }

      if (!data) {
        data = FALLBACK_SETTINGS;
      }

      setSettings(data);

      // Salvar no localStorage para próximas carregadas (cache local)
      if (typeof window !== 'undefined' && data) {
        try {
          localStorage.setItem(getLocalCacheKey(), JSON.stringify(data));
          profileDebug('[useProfileConfig] ✅ Configurações salvas no cache local');
        } catch (cacheError) {
          console.warn('[useProfileConfig] ⚠️ Erro ao salvar cache local:', cacheError);
        }
      }
    } catch (err) {
      console.error('[useProfileConfig] ❌ Erro ao carregar configurações:', err);

      // Tentar carregar do cache local em caso de erro
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem(getLocalCacheKey());
          if (cached) {
            profileDebug('[useProfileConfig] 🔄 Usando cache local após erro');
            setSettings(JSON.parse(cached));
            return;
          }
        } catch {
          // Ignorar erro de cache
        }
      }

      setError(err instanceof Error ? err.message : 'Erro ao carregar configurações');
      setSettings(FALLBACK_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, [pathname, settings]);

  const updateSettings = async (newSettings: ProfileSettings) => {
    try {
      const success = await ProfileConfigService.updateProfileSettings(newSettings);
      if (success) {
        setSettings(newSettings);
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar configurações');
      return false;
    }
  };

  const refreshSettings = () => {
    ProfileConfigService.clearCache();
    // Limpar cache local também
    if (typeof window !== 'undefined') {
      localStorage.removeItem(getLocalCacheKey());
    }
    setSettings(null);
    loadSettings();
  };

  useEffect(() => {
    loadSettings();
  }, [loadSettings]); // Reexecutar ao trocar de perfil/rota

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;
    let isActive = true;

    const setupRealtimeSync = async () => {
      if (typeof window === 'undefined') return;

      const currentPathname = pathname || window.location.pathname;
      const username = getPublicUsernameFromPathname(currentPathname);
      const isSuperAdmin = isSuperAdminUsername(username);

      let targetRef = doc(db, 'admin', 'profileSettings');

      if (currentPathname !== '/' && currentPathname !== '' && username && !isSuperAdmin) {
        const adminUid = await resolveAdminUidByUsername(username);
        if (!adminUid) return;
        targetRef = doc(db, 'admins', adminUid, 'profile', 'settings');
      }

      unsubscribe = onSnapshot(
        targetRef,
        (snap) => {
          if (!isActive || !snap.exists()) return;
          const data = snap.data() as ProfileSettings;
          setSettings(data);
          try {
            localStorage.setItem(getLocalCacheKey(), JSON.stringify(data));
          } catch {
            // noop
          }
        },
        (snapshotError) => {
          console.error('[useProfileConfig] erro na sincronização em tempo real:', snapshotError);
        }
      );
    };

    setupRealtimeSync();

    return () => {
      isActive = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [pathname]);

  // Recarregar configurações a cada 30 segundos para pegar mudanças do painel admin
  useEffect(() => {
    const interval = setInterval(() => {
      loadSettings();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [loadSettings]); // Reinicia o polling ao trocar de perfil/rota

  return {
    settings,
    loading,
    error,
    updateSettings,
    refreshSettings,
    // Helpers específicos com fallbacks mais robustos
    profilePhoto: settings?.profilePictureUrl && settings.profilePictureUrl.trim() !== ''
      ? settings.profilePictureUrl
      : '/placeholder-photo.svg',
    coverPhoto: settings?.coverPhotoUrl && settings.coverPhotoUrl.trim() !== ''
      ? settings.coverPhotoUrl
      : '/placeholder-cover.svg',
    galleryPhotos: settings?.galleryPhotos?.map(p => p.url) || [],
    profileInfo: settings ? {
      name: settings.name,
      email: settings.email,
      phone: settings.phone,
      address: settings.address,
    } : null,
  };
}
