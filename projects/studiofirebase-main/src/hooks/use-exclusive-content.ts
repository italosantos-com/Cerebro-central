import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { getPublicUsernameFromPathname } from '@/utils/public-admin-scope';
import { resolveAdminUidByUsername } from '@/utils/admin-lookup-client';
import { isSuperAdminUsername } from '@/lib/superadmin-config';

interface ExclusiveContent {
  id: string;
  title: string;
  description: string;
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl?: string;
  tags: string[];
  viewCount: number;
  createdAt: string;
  isUnlocked?: boolean;
  locked?: boolean;
}

interface UseExclusiveContentReturn {
  content: ExclusiveContent[];
  loading: boolean;
  error: string | null;
  isSubscriber: boolean;
  requiresSubscription: boolean;
  refreshContent: () => Promise<void>;
  recordView: (contentId: string) => Promise<void>;
}

export function useExclusiveContent(type?: 'photo' | 'video'): UseExclusiveContentReturn {
  const { user } = useAuth();
  const [content, setContent] = useState<ExclusiveContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [requiresSubscription, setRequiresSubscription] = useState(false);

  const fetchContent = async () => {
    const fallbackEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
    if (!user?.uid && !fallbackEmail) {
      setLoading(false);
      setError('Usuário não autenticado');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Usar email do usuário se disponível, senão usar UID
      const userIdentifier = user?.email || user?.uid || fallbackEmail || '';

      const params = new URLSearchParams({
        userId: userIdentifier
      });

      if (type) {
        params.append('type', type);
      }

      // Determinar adminUid com base no username da URL para isolar o conteúdo
      if (typeof window !== 'undefined') {
        const username = getPublicUsernameFromPathname(window.location.pathname);
        if (username && !isSuperAdminUsername(username)) {
          const adminUid = await resolveAdminUidByUsername(username);
          if (adminUid) {
            params.append('adminUid', adminUid);
          }
        }
      }

      const response = await fetch(`/api/exclusive-content?${params}`);
      const data = await response.json();
      
      

      if (data.success) {
        setContent(data.content || []);
        setIsSubscriber(Boolean(data.isSubscriber));
        setRequiresSubscription(Boolean(data.requiresSubscription));
      } else {
        setError(data.message || 'Erro ao carregar conteúdo');
        setIsSubscriber(Boolean(data.isSubscriber));
        setRequiresSubscription(Boolean(data.requiresSubscription));
        setContent(data.content || []);
      }
    } catch (err) {
      
      setError('Erro ao carregar conteúdo exclusivo');
      setContent([]);
    } finally {
      setLoading(false);
    }
  };

  const recordView = async (contentId: string) => {
    const fallbackEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
    if (!user?.uid && !fallbackEmail) return;

    try {
      const userIdentifier = user?.email || user?.uid || fallbackEmail || '';
      
      await fetch('/api/exclusive-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentId,
          userId: userIdentifier,
        }),
      });
    } catch (err) {

    }
  };

  const refreshContent = async () => {
    await fetchContent();
  };

  useEffect(() => {
    fetchContent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, type]); // fetchContent é estável

  return {
    content,
    loading,
    error,
    isSubscriber,
    requiresSubscription,
    refreshContent,
    recordView,
  };
}

// Hook específico para fotos
export function useExclusivePhotos() {
  return useExclusiveContent('photo');
}

// Hook específico para vídeos
export function useExclusiveVideos() {
  return useExclusiveContent('video');
}
