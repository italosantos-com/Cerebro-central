'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { doc, getDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProfileSettings } from '@/app/admin/settings/actions';
import { getPublicUsernameFromPathname } from '@/utils/public-admin-scope';
import { resolveAdminUidByUsername } from '@/utils/admin-lookup-client';
import { SUPERADMIN_USERNAME } from '@/lib/superadmin-config';

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
  fetishMenu: {
    categories: [],
  },
  showAdultContent: false,
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

export function useProfileSettings() {
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;
    let isActive = true;

    const normalizeSettings = (data: ProfileSettings): ProfileSettings => {
      const normalized = { ...data };
      if (!normalized.adultWorkLabel) {
        normalized.adultWorkLabel = '+18 ADULT WORK';
      }
      if (!normalized.profilePictureUrl) normalized.profilePictureUrl = '/placeholder-photo.svg';
      if (!normalized.coverPhotoUrl) normalized.coverPhotoUrl = '/placeholder-cover.svg';
      if (!normalized.appearanceSettings) {
        normalized.appearanceSettings = FALLBACK_SETTINGS.appearanceSettings;
      } else {
        normalized.appearanceSettings = {
          ...FALLBACK_SETTINGS.appearanceSettings,
          ...normalized.appearanceSettings,
        };
      }
      return normalized;
    };

    const loadSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let targetDoc = doc(db, 'admin', 'profileSettings');

        if (typeof window !== 'undefined') {
          const username = getPublicUsernameFromPathname(pathname || window.location.pathname);
          if (username && username.toLowerCase() !== SUPERADMIN_USERNAME.toLowerCase()) {
            const adminUid = await resolveAdminUidByUsername(username);
            if (adminUid) {
              targetDoc = doc(db, 'admins', adminUid, 'profile', 'settings');
            } else {
              // Non-superadmin username found but UID could not be resolved.
              // Do NOT fall back to global profile – return empty defaults instead.
              if (isActive) setSettings(FALLBACK_SETTINGS);
              return;
            }
          }
        }

        const docSnap = await getDoc(targetDoc);

        if (docSnap.exists()) {
          const data = normalizeSettings(docSnap.data() as ProfileSettings);
          if (isActive) {
            setSettings(data);
          }
        } else {
          if (isActive) {
            setSettings(FALLBACK_SETTINGS);
          }
        }

        unsubscribe = onSnapshot(
          targetDoc,
          (snapshot) => {
            if (!isActive) return;
            if (!snapshot.exists()) {
              setSettings(FALLBACK_SETTINGS);
              return;
            }
            setSettings(normalizeSettings(snapshot.data() as ProfileSettings));
          },
          (snapshotError) => {
            if (!isActive) return;
            console.error('Erro ao sincronizar configurações em tempo real:', snapshotError);
          }
        );
      } catch (err: any) {
        if (!isActive) return;
        console.error('Erro ao carregar configurações:', err);
        let errorMsg = 'Erro ao carregar configurações.';
        if (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions')) {
          errorMsg = 'Permissão negada: você não tem acesso a estas configurações.';
        } else if (err.code === 'unavailable' || err.message?.includes('network')) {
          errorMsg = 'Erro de conexão. Verifique sua internet.';
        } else if (err.message?.includes('FirebaseError')) {
          errorMsg = 'Erro do serviço Firebase. Tente novamente.';
        }
        setError(errorMsg);
        setSettings(FALLBACK_SETTINGS);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };
    loadSettings();

    return () => {
      isActive = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [pathname]);

  return {
    settings,
    isLoading,
    error,
    adultWorkLabel: settings?.adultWorkLabel || '+18 ADULT WORK',
    showAdultContent: settings?.showAdultContent ?? false
  };
}
