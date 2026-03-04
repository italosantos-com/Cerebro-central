import { useCallback, useEffect, useState } from 'react';
import { useAdminContext } from '@/context/AdminContext';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  startAfter,
  limit,
  QueryConstraint,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';

export interface PaginationOptions {
  pageSize?: number;
  initialPage?: number;
}

export interface UseAdminDataReturn<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  nextPage: () => Promise<void>;
  previousPage: () => Promise<void>;
  refetch: () => Promise<void>;
  total: number;
}

/**
 * Hook genérico para buscar dados isolados de um admin
 * Automaticamente filtra por adminUid
 */
export function useAdminData<T extends DocumentData>(
  collectionName: string,
  additionalConstraints: QueryConstraint[] = [],
  options: PaginationOptions = {}
): UseAdminDataReturn<T> {
  const { adminUid, isAdmin } = useAdminContext();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const pageSize = options.pageSize || 20;

  const buildQuery = useCallback(
    (startAfterDoc?: DocumentData) => {
      if (!adminUid) return null;

      const constraints: QueryConstraint[] = [
        where('adminUid', '==', adminUid),
        orderBy('createdAt', 'desc'),
        ...additionalConstraints
      ];

      if (startAfterDoc) {
        constraints.push(startAfter(startAfterDoc));
      }

      constraints.push(limit(pageSize + 1)); // +1 para saber se há mais

      return query(collection(db, collectionName), ...constraints);
    },
    [adminUid, collectionName, additionalConstraints, pageSize]
  );

  const fetchPage = useCallback(
    async (startAfterDoc?: DocumentData) => {
      if (!adminUid || !isAdmin) return;

      setLoading(true);
      setError(null);

      try {
        const q = buildQuery(startAfterDoc);
        if (!q) throw new Error('Query inválida');

        const snapshot = await getDocs(q);
        const items = snapshot.docs.slice(0, pageSize).map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as unknown as T[];

        setData(items);
        setHasMore(snapshot.docs.length > pageSize);

        if (snapshot.docs.length > 0) {
          setLastVisible(snapshot.docs[pageSize - 1] || snapshot.docs[snapshot.docs.length - 1]);
        }

        setTotal(items.length);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Erro ao buscar dados'));
        setData([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [adminUid, isAdmin, buildQuery, pageSize]
  );

  useEffect(() => {
    if (isAdmin) {
      fetchPage();
    }
  }, [isAdmin, fetchPage]);

  const nextPage = useCallback(async () => {
    if (hasMore && lastVisible) {
      setCurrentPageIndex(prev => prev + 1);
      await fetchPage(lastVisible);
    }
  }, [hasMore, lastVisible, fetchPage]);

  const previousPage = useCallback(async () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
      await fetchPage(); // Volta para primeira página (simplificado)
    }
  }, [currentPageIndex, fetchPage]);

  const refetch = useCallback(async () => {
    setCurrentPageIndex(0);
    await fetchPage();
  }, [fetchPage]);

  return {
    data,
    loading,
    error,
    hasMore,
    nextPage,
    previousPage,
    refetch,
    total
  };
}

/**
 * Hook para buscar conversas do admin autenticado
 */
export function useAdminConversations(pageSize = 20) {
  return useAdminData(
    'admins/{adminUid}/conversations',
    [],
    { pageSize }
  );
}

/**
 * Hook para buscar assinantes do admin autenticado
 */
export function useAdminSubscribers(pageSize = 20) {
  return useAdminData(
    'admins/{adminUid}/subscribers',
    [],
    { pageSize }
  );
}

/**
 * Hook para buscar fotos do admin autenticado
 */
export function useAdminPhotos(
  visibility?: 'public' | 'subscribers' | 'private',
  pageSize = 20
) {
  const constraints = visibility ? [where('visibility', '==', visibility)] : [];
  return useAdminData(
    'admins/{adminUid}/photos',
    constraints,
    { pageSize }
  );
}

/**
 * Hook para buscar vídeos do admin autenticado
 */
export function useAdminVideos(
  visibility?: 'public' | 'subscribers' | 'private',
  pageSize = 20
) {
  const constraints = visibility ? [where('visibility', '==', visibility)] : [];
  return useAdminData(
    'admins/{adminUid}/videos',
    constraints,
    { pageSize }
  );
}

/**
 * Hook para buscar produtos do admin autenticado
 */
export function useAdminProducts(
  status?: 'active' | 'inactive',
  pageSize = 20
) {
  const constraints = status ? [where('status', '==', status)] : [];
  return useAdminData(
    'admins/{adminUid}/products',
    constraints,
    { pageSize }
  );
}

/**
 * Hook para buscar avaliações do admin autenticado
 */
export function useAdminReviews(
  statusFilter?: 'pending' | 'approved' | 'rejected',
  pageSize = 20
) {
  const constraints = statusFilter ? [where('status', '==', statusFilter)] : [];
  return useAdminData(
    'admins/{adminUid}/reviews',
    constraints,
    { pageSize }
  );
}

/**
 * Hook para buscar uploads do admin autenticado
 */
export function useAdminUploads(
  type?: 'image' | 'video' | 'document',
  pageSize = 20
) {
  const constraints = type ? [where('type', '==', type)] : [];
  return useAdminData(
    'admins/{adminUid}/uploads',
    constraints,
    { pageSize }
  );
}
