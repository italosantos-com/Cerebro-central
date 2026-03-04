"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { hasSuperAdminRole, TokenClaims } from '@/lib/auth-roles';

/**
 * Layout protegido da rota /superadmin.
 *
 * Observa mudanças no estado de autenticação do Firebase e valida
 * que o token do usuário contenha a role "superadmin" antes de
 * renderizar qualquer conteúdo filho.
 */
export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthorized(false);
        router.replace('/403');
        return;
      }
      try {
        const idTokenResult = await user.getIdTokenResult();
        const claims: TokenClaims = {
          uid: user.uid,
          ...(idTokenResult.claims as Omit<TokenClaims, 'uid'>),
        };
        if (hasSuperAdminRole(claims)) {
          setAuthorized(true);
        } else {
          setAuthorized(false);
          router.replace('/403');
        }
      } catch {
        setAuthorized(false);
        router.replace('/403');
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (!authorized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
