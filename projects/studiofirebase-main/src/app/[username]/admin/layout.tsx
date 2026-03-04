"use client";

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import AdminHeader from '@/components/admin/header';
import AdminFooter from '@/components/admin/footer';
import AdminSidebar from '@/components/admin/sidebar';
import AdminBottomSheet from '@/components/admin/admin-bottom-sheet';
import AdminLoginForm from '../../../app/admin/login-form';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import CentralAssistantFloating from '@/components/admin/central-assistant-floating';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function UsernameAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const username = params?.username as string;

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [authKey, setAuthKey] = useState(0);
  const { isAuthenticated, isLoading, handleLogout } = useAdminAuth(authKey);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Verificar autorização antes de renderizar
  useEffect(() => {
    if (!username || isLoading) return;

    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAuthorized(false);
        setAuthError('Não autenticado');
        return;
      }

      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        
        if (!adminDoc.exists()) {
          setIsAuthorized(false);
          setAuthError('Admin não encontrado');
          return;
        }

        const adminData = adminDoc.data() as any;
        const adminUsername = adminData.username?.toLowerCase();
        const paramUsername = username.toLowerCase();

        if (adminUsername !== paramUsername) {
          setIsAuthorized(false);
          setAuthError('Acesso negado');
          return;
        }

        setIsAuthorized(true);
        setAuthError(null);
      } catch (error) {
        console.error('Erro ao verificar autorização:', error);
        setIsAuthorized(false);
        setAuthError('Erro ao verificar permissões');
      }
    });

    return () => unsubscribe();
  }, [username, isLoading]);

  const handleAuthSuccess = useCallback(() => {
    setAuthKey(prev => prev + 1);
  }, []);

  const isConversationRoute = pathname?.startsWith(`/${username}/admin/conversations`) || 
                              pathname?.startsWith(`/${username}/admin/chat/`);
  const shouldShowFooter = !isConversationRoute;

  // Mostrar loader enquanto verifica autenticação
  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Mostrar erro se não autorizado
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Se não autenticado, mostrar formulário de login
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <AdminLoginForm onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <AdminHeader
        onMenuClick={() => setSidebarOpen(!isSidebarOpen)}
      />
      <div className="flex flex-1 gap-1">
        <AdminSidebar
          onLogout={handleLogout}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      {shouldShowFooter && <AdminFooter />}
      <AdminBottomSheet isOpen={false} onClose={() => {}} onOpen={() => {}}>{null}</AdminBottomSheet>
      <CentralAssistantFloating />
    </div>
  );
}
