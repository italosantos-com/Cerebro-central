'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProfileSettings } from '@/app/admin/settings/actions';

interface UseAdminGalleryReturn {
  galleryPhotos: { url: string }[];
  galleryNames: string[];
  profilePhoto: string;
  coverPhoto: string;
  settings: ProfileSettings | null;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
}

/**
 * Hook para buscar configurações do painel admin, incluindo fotos das galerias
 */
export function useAdminGallery(): UseAdminGalleryReturn {
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (!('window' in globalThis)) return {};
    try {
      const { auth } = await import('@/lib/firebase');
      const user = auth.currentUser;
      if (!user) return {};
      const token = await user.getIdToken();
      return { Authorization: `Bearer ${token}` };
    } catch {
      return {};
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const authHeaders = await getAuthHeaders();
      const isGlobalAdminRoute =
        typeof window !== 'undefined' &&
        window.location.pathname.startsWith('/admin') &&
        !/^\/[^\/]+\/admin(\/|$)/.test(window.location.pathname);

      const url = isGlobalAdminRoute
        ? '/api/admin/profile-settings?global=true'
        : '/api/admin/profile-settings';

      const response = await fetch(url, {
        headers: {
          ...authHeaders,
        },
        next: { revalidate: 300 } // Cache por 5 minutos
      });

      if (!response.ok) {
        throw new Error('Falha ao carregar configurações');
      }

      const data: ProfileSettings = await response.json();
      setSettings(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const refreshSettings = async () => {
    await fetchSettings();
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const galleryPhotos = settings?.galleryPhotos || [];
  const galleryNames = settings?.galleryNames || [
    "ACOMPANHANTE MASCULINO",
    "SENSUALIDADE",
    "PRAZER",
    "BDSM",
    "FETISH",
    "FANTASIA",
    "IS"
  ];
  const profilePhoto = settings?.profilePictureUrl || '/placeholder-photo.svg';
  const coverPhoto = settings?.coverPhotoUrl || '/placeholder-cover.svg';

  return {
    galleryPhotos,
    galleryNames,
    profilePhoto,
    coverPhoto,
    settings,
    loading,
    error,
    refreshSettings
  };
}
