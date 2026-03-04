import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export function useAdminAuth(authKey: number = 0) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Verificar autenticação na inicialização e quando authKey mudar
  useEffect(() => {

    if (typeof window === 'undefined') {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          localStorage.removeItem('adminAuthenticated');
          localStorage.removeItem('adminUser');
          document.cookie = `isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          document.cookie = `isAdmin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          setIsAuthenticated(false);
          return;
        }

        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        // prevent syncing in users who haven't verified their email yet
        if (!user.emailVerified) {
          console.warn('[useAdminAuth] E-mail do admin não verificado, forçando logout', { uid: user.uid, email: user.email });
          await signOut(auth);
          localStorage.removeItem('adminAuthenticated');
          localStorage.removeItem('adminUser');
          setIsAuthenticated(false);
          return;
        }

        if (!adminDoc.exists()) {
          // Se estiver na página de registro, permitir continuar para completar o cadastro
          if (window.location.pathname === '/admin/register') {
            setIsAuthenticated(true);
            return;
          }

          console.warn('[useAdminAuth] Usuário autenticado sem documento admin', { uid: user.uid, email: user.email });
          await signOut(auth);
          localStorage.removeItem('adminAuthenticated');
          localStorage.removeItem('adminUser');
          setIsAuthenticated(false);
          return;
        }

        const adminData = adminDoc.data();
        if (adminData.status && adminData.status !== 'active') {
          console.warn('[useAdminAuth] Conta admin desativada', { uid: user.uid, status: adminData.status });
          await signOut(auth);
          localStorage.removeItem('adminAuthenticated');
          localStorage.removeItem('adminUser');
          setIsAuthenticated(false);
          return;
        }

        localStorage.setItem('adminAuthenticated', 'true');
        localStorage.setItem('adminUser', user.email || user.uid);
        document.cookie = `isAuthenticated=true; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `isAdmin=true; path=/; max-age=86400; SameSite=Lax`;
        setIsAuthenticated(true);
      } catch (err) {
        console.error('[useAdminAuth] Erro ao validar admin:', err);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [authKey]);

  // Função de logout
  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('[useAdminAuth] Erro ao fazer logout:', error);
    }

    localStorage.removeItem('adminAuthenticated');
    localStorage.removeItem('adminUser');
    document.cookie = `isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `isAdmin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    setIsAuthenticated(false);
    router.push('/');
  }, [router]);

  return {
    isAuthenticated,
    isLoading,
    handleLogout
  };
}
