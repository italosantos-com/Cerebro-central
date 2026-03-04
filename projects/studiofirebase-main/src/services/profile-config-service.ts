import { ProfileSettings } from '@/app/admin/settings/actions';

async function getAdminAuthHeaders(): Promise<Record<string, string>> {
  if (!('window' in globalThis)) return {};
  try {
    const { auth } = await import('@/lib/firebase');
    const user = auth.currentUser;
    if (!user) return {};
    const idToken = await user.getIdToken();
    return { Authorization: `Bearer ${idToken}` };
  } catch {
    return {};
  }
}

function getBaseUrl(): string {
  const isBrowser = 'window' in globalThis;
  if (isBrowser) return (globalThis as any).window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL || '';
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const supportsAbortTimeout = typeof AbortSignal !== 'undefined' && typeof (AbortSignal as any).timeout === 'function';
  const controller = supportsAbortTimeout ? null : new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  if (!supportsAbortTimeout && controller) {
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    return await fetch(url, {
      ...init,
      signal: supportsAbortTimeout ? (AbortSignal as any).timeout(timeoutMs) : controller?.signal,
    });
  } finally {
    if (!supportsAbortTimeout && timeoutId) clearTimeout(timeoutId);
  }
}

export class ProfileConfigService {
  private static readonly cache: Map<string, ProfileSettings> = new Map();
  private static readonly lastFetch: Map<string, number> = new Map();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  static async getProfileSettings(adminUid?: string): Promise<ProfileSettings | null> {
    const cacheKey = adminUid || 'global';
    // Verificar cache
    const now = Date.now();
    const cachedSettings = this.cache.get(cacheKey);
    const lastFetchTime = this.lastFetch.get(cacheKey) || 0;
    if (cachedSettings && (now - lastFetchTime) < this.CACHE_DURATION) {
      return cachedSettings;
    }

    try {
      const baseUrl = getBaseUrl();
      const url = adminUid
        ? `${baseUrl}/api/admin/profile-settings?adminUid=${adminUid}`
        : `${baseUrl}/api/admin/profile-settings`;

      const authHeaders = adminUid ? await getAdminAuthHeaders() : {};
      if (adminUid && !authHeaders.Authorization) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ProfileConfigService] Token ausente para adminUid, adiando request para evitar 401.');
        }
        return cachedSettings || null;
      }

      const response = await fetchWithTimeout(
        url,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...authHeaders,
          },
          mode: 'cors',
          credentials: 'same-origin',
          cache: 'no-store',
        },
        30_000
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch profile settings: ${response.status}`);
      }

      const data = await response.json();

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Profile settings loaded successfully', adminUid ? `for admin ${adminUid}` : '(global)');
      }

      this.cache.set(cacheKey, data);
      this.lastFetch.set(cacheKey, now);
      return data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching profile settings:', error);
      }
      // Em caso de erro, retornar configurações padrão para não quebrar a UI
      const fallbackSettings = {
        name: '',
        phone: '',
        email: '',
        address: '',
        description: '',
        profilePictureUrl: '/placeholder-photo.svg',
        coverPhotoUrl: '/placeholder-cover.svg',
        galleryPhotos: [],
        galleryNames: [
          'ACOMPANHANTE MASCULINO',
          'SENSUALIDADE',
          'PRAZER',
          'BDSM',
          'FETISH',
          'FANTASIA',
          'IS',
        ],
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

      return fallbackSettings;
    }
  }

  static async updateProfileSettings(settings: ProfileSettings, adminUid?: string): Promise<boolean> {
    try {
      const authHeaders = await getAdminAuthHeaders();
      const response = await fetch('/api/admin/profile-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ settings, adminUid }),
      });

      if (response.ok) {
        // Limpar cache para forçar nova busca
        const cacheKey = adminUid || 'global';
        this.cache.delete(cacheKey);
        this.lastFetch.delete(cacheKey);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating profile settings:', error);
      return false;
    }
  }

  static clearCache(adminUid?: string): void {
    if (adminUid) {
      this.cache.delete(adminUid);
      this.lastFetch.delete(adminUid);
    } else {
      this.cache.clear();
      this.lastFetch.clear();
    }
  }

  // Métodos específicos para componentes do feed
  static async getGalleryPhotos(adminUid?: string): Promise<string[]> {
    const settings = await this.getProfileSettings(adminUid);
    return settings?.galleryPhotos?.map(photo => photo.url) || [];
  }

  static async getProfilePhoto(adminUid?: string): Promise<string | null> {
    const settings = await this.getProfileSettings(adminUid);
    return settings?.profilePictureUrl || null;
  }

  static async getCoverPhoto(adminUid?: string): Promise<string | null> {
    const settings = await this.getProfileSettings(adminUid);
    return settings?.coverPhotoUrl || null;
  }

  static async getProfileInfo(adminUid?: string): Promise<Partial<ProfileSettings> | null> {
    const settings = await this.getProfileSettings(adminUid);
    if (!settings) return null;

    return {
      name: settings.name,
      email: settings.email,
      phone: settings.phone,
      address: settings.address,
    };
  }
}
