import { useCallback, useEffect, useState } from 'react';

type GalleryItem = {
    id: string;
    name?: string;
    baseUrl?: string;
    mimeType?: string;
    thumbnailLink?: string;
    webContentLink?: string;
    source: 'photos' | 'drive';
};

type UseGalleryOptions = {
    pageSize?: number;
    autoLoad?: boolean;
};

export function useGallery(options?: UseGalleryOptions) {
    const pageSize = options?.pageSize ?? 30;
    const autoLoad = options?.autoLoad ?? true;

    const [items, setItems] = useState<GalleryItem[]>([]);
    const [source, setSource] = useState<'photos' | 'drive' | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const { getAuth } = await import('firebase/auth');
            const { app } = await import('@/lib/firebase');
            const auth = getAuth(app);
            const user = auth.currentUser;
            const token = user ? await user.getIdToken() : null;

            const response = await fetch(`/api/admin/google/gallery?pageSize=${pageSize}`, {
                credentials: 'include',
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });
            const data = await response.json();

            if (!response.ok || !data?.success) {
                throw new Error(data?.message || `HTTP ${response.status}`);
            }

            const nextItems = Array.isArray(data?.items) ? data.items : [];
            setItems(nextItems);
            setSource(data?.source === 'photos' ? 'photos' : 'drive');
            return { items: nextItems, source: data?.source === 'photos' ? 'photos' : 'drive' as const };
        } catch (err: any) {
            const message = err instanceof Error ? err.message : 'Falha ao carregar galeria';
            setError(message);
            setItems([]);
            setSource(null);
            return { items: [], source: null as const, error: message };
        } finally {
            setLoading(false);
        }
    }, [pageSize]);

    useEffect(() => {
        if (!autoLoad) return;
        void refresh();
    }, [autoLoad, refresh]);

    return {
        items,
        source,
        loading,
        error,
        refresh,
    };
}
