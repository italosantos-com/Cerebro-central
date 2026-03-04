
"use client";

import { useState, useCallback, useEffect } from 'react';
import AdminHeader from '@/components/admin/header';
import AdminFooter from '@/components/admin/footer';
import AdminSidebar from '@/components/admin/sidebar';
import AdminBottomSheet from '@/components/admin/admin-bottom-sheet';
import AdminLoginForm from './login-form';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import CentralAssistantFloating from '@/components/admin/central-assistant-floating';
import AdminConversationFloating from '@/components/admin/admin-conversation-floating';
import { AdminConversationProvider } from '@/contexts/admin-conversation-context';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

function readAdminSlugCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith('admin_slug='));
  if (!match) return null;
  const value = decodeURIComponent(match.split('=')[1] || '').trim();
  return value || null;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [authKey, setAuthKey] = useState(0); // Força re-renderização
  const { isAuthenticated, isLoading, handleLogout } = useAdminAuth(authKey);
  const router = useRouter();
  const pathname = usePathname();

  const isConversationRoute = pathname?.startsWith('/admin/conversations') || pathname?.startsWith('/admin/chat/');
  const shouldShowFooter = !isConversationRoute;

  const handleAuthSuccess = useCallback(() => {
    // Força uma re-renderização para que o useAdminAuth detecte a mudança
    setAuthKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    const ensureSluggedAdminRoute = async () => {
      if (!isAuthenticated || !pathname || !pathname.startsWith('/admin')) return;

      const hasSlug = /^\/[^/]+\/admin(\/|$)/.test(pathname);
      if (hasSlug) return;

      const currentUser = auth.currentUser;
      if (!currentUser?.uid) return;

      try {
        const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
        if (!adminDoc.exists()) return;
        const adminData = adminDoc.data() as { username?: string; isMainAdmin?: boolean };
        const username = String(adminData.username || '').trim();
        const cookieSlug = readAdminSlugCookie();

        if (cookieSlug && username && cookieSlug === username) {
          router.replace(`/${cookieSlug}${pathname}`);
          return;
        }

        if (adminData.isMainAdmin) return;
        if (!username) return;

        router.replace(`/${username}${pathname}`);
      } catch (error) {
        console.error('[AdminLayout] Erro ao resolver slug do admin:', error);
      }
    };

    void ensureSluggedAdminRoute();
  }, [isAuthenticated, pathname, router]);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const openSidebar = () => {
    setSidebarOpen(true);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Exibe um estado de carregamento enquanto a autenticação é verificada no cliente.
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <p className="text-muted-foreground">Verificando autorização...</p>
      </div>
    );
  }

  // Se não estiver autenticado, renderiza o formulário de login.
  if (!isAuthenticated) {
    return <AdminLoginForm onAuthSuccess={handleAuthSuccess} />;
  }

  // Se autenticado, renderiza o layout do painel de administração.
  return (
    <AdminConversationProvider>
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        {/* Sidebar para Desktop */}
        <div className="hidden bg-sidebar border-r border-sidebar-border md:block">
          <AdminSidebar onLogout={handleLogout} />
        </div>

        {/* Layout Principal */}
        <div className="flex flex-col min-w-0">
          {/* Cabeçalho para Mobile */}
          <AdminHeader onMenuClick={toggleSidebar} />

          {/* Conteúdo da Página */}
          <main className="flex flex-1 flex-col min-w-0 gap-4 p-4 lg:gap-6 lg:p-6">
            <div className="w-full min-w-0">
              {children}
            </div>
          </main>

          {shouldShowFooter && <AdminFooter />}
        </div>

        {/* Sidebar para Mobile (Bottom Sheet) */}
        <div className="md:hidden">
          <AdminBottomSheet 
            isOpen={isSidebarOpen} 
            onClose={closeSidebar}
            onOpen={openSidebar}
          >
            <AdminSidebar
              onLogout={() => {
                handleLogout();
                closeSidebar();
              }}
              onClose={closeSidebar}
            />
          </AdminBottomSheet>
        </div>

        {/* Cérebro Central */}
        {!isConversationRoute && <CentralAssistantFloating />}

        {/* Janela flutuante de conversa */}
        <AdminConversationFloating />
      </div>
    </AdminConversationProvider>
  );
}
