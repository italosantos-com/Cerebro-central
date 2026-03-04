'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export interface AdminContextType {
  adminUid: string | null;
  adminSlug: string | null;
  isAdmin: boolean;
  loading: boolean;
  currentUser: User | null;
  refetch: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminContextProvider({ children }: { children: ReactNode }) {
  const [adminUid, setAdminUid] = useState<string | null>(null);
  const [adminSlug, setAdminSlug] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const verifyAdminStatus = async (user: User) => {
    try {
      const token = await user.getIdTokenResult();
      const isAdmin = token.claims.admin === true;

      if (isAdmin) {
        setAdminUid(user.uid);
        // O slug é derivado da URL via middleware.ts
        // Pode ser obtido via displayName ou buscado do Firestore conforme necessário
        setAdminSlug(user.displayName || null);
      } else {
        setAdminUid(null);
        setAdminSlug(null);
      }
    } catch (error) {
      console.error('[AdminContext] Erro ao verificar status admin:', error);
      setAdminUid(null);
      setAdminSlug(null);
    }
  };

  const refetch = async () => {
    if (currentUser) {
      await verifyAdminStatus(currentUser);
    }
  };

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await verifyAdminStatus(user);
      } else {
        setCurrentUser(null);
        setAdminUid(null);
        setAdminSlug(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value: AdminContextType = {
    adminUid,
    adminSlug,
    isAdmin: !!adminUid,
    loading,
    currentUser,
    refetch
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdminContext() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminContext deve ser usado dentro de AdminContextProvider');
  }
  return context;
}

/**
 * Hook para garantir que o usuário é admin
 * Redireciona para login se não autenticado
 * Redireciona para home se não é admin
 */
export function useRequireAdmin() {
  const { adminUid, isAdmin, loading } = useAdminContext();

  useEffect(() => {
    if (!loading && !isAdmin) {
      // Redirecionar para login ou home
      window.location.href = '/auth/face';
    }
  }, [isAdmin, loading]);

  return { adminUid, isAdmin, loading };
}
