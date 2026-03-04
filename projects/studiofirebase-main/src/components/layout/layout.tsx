
"use client";

import { useState, useEffect } from 'react';
import Header from './header';
import IOSSubscriptionSheet from '@/components/ios-subscription-sheet';
import FetishModal from '@/components/fetish-modal';
import type { Fetish } from '@/lib/fetish-data';
import AdultWarningDialog from '@/components/adult-warning-dialog';
import MainFooter from './main-footer';
import { usePathname } from 'next/navigation';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getPublicUsernameFromPathname } from '@/utils/public-admin-scope';
import { resolveAdminUidByUsername } from '@/utils/admin-lookup-client';
import { useProfileSettings } from '@/hooks/use-profile-settings';



const getOrCreateChatId = (scope?: string): string => {
  if (globalThis.window === undefined) {
    return '';
  }

  const normalizedScope = (scope ?? '').trim().toLowerCase();
  const safeScope = normalizedScope
    ? normalizedScope.replaceAll(/[^a-z0-9_-]/g, '').slice(0, 40)
    : '';
  const storageKey = safeScope ? `secretChatId:${safeScope}` : 'secretChatId';

  let chatId = localStorage.getItem(storageKey);
  if (!chatId) {
    const randomId = Math.random().toString(36).substring(2, 8);
    chatId = safeScope ? `secret-chat-${safeScope}-${randomId}` : `secret-chat-${randomId}`;
    localStorage.setItem(storageKey, chatId);
  }
  return chatId;
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [selectedFetish, setSelectedFetish] = useState<Fetish | null>(null);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { showAdultContent } = useProfileSettings();
  const pathname = usePathname();

  useEffect(() => {
    setIsClient(true);
    if (!showAdultContent) {
      setIsWarningOpen(false);
    } else {
      const hasConfirmedAge = localStorage.getItem('ageConfirmed');
      if (!hasConfirmedAge) {
        setIsWarningOpen(true);
      }
    }

    const trackVisitor = async () => {
      if (pathname?.startsWith('/admin')) return;

      // Track chat visitor
      const publicUsername = getPublicUsernameFromPathname(pathname);
      const chatId = getOrCreateChatId(publicUsername ?? undefined);
      if (chatId) {
        const chatDocRef = doc(db, 'chats', chatId);
        try {
          const chatDocData: Record<string, any> = {
            lastSeen: serverTimestamp(),
          };

          if (publicUsername) {
            const adminUid = await resolveAdminUidByUsername(publicUsername);
            if (adminUid) chatDocData.adminUid = adminUid;
          }

          await setDoc(chatDocRef, chatDocData, { merge: true });
        } catch (error) {
          // Error handled silently
        }
      }

      // Track page view - Temporarily disabled for development
      /*
      if (pathname) {
          // Sanitize path to use as a document ID in Firestore
          const docId = pathname === '/' ? 'home' : pathname.replace(/\//g, '_');
          const pageViewRef = doc(db, 'pageViews', docId);
          try {
              await runTransaction(db, async (transaction) => {
                  const pageViewDoc = await transaction.get(pageViewRef);
                  if (!pageViewDoc.exists()) {
                      transaction.set(pageViewRef, { path: pathname, count: 1, lastViewed: serverTimestamp() });
                  } else {
                      const newCount = pageViewDoc.data().count + 1;
                      transaction.update(pageViewRef, { count: newCount, lastViewed: serverTimestamp() });
                  }
              });
          } catch (error) {
              // Error handled silently
          }
      }
      */
    };

    trackVisitor();

  }, [pathname, showAdultContent]);

  const handleConfirmAge = () => {
    localStorage.setItem('ageConfirmed', 'true');
    setIsWarningOpen(false);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const handleFetishSelect = (fetish: Fetish) => {
    setSelectedFetish(fetish);
    setSidebarOpen(false);
  };

  const handleCloseModal = () => {
    setSelectedFetish(null);
  };

  if (!isClient) {
    return null;
  }

  const isAdminPanel = pathname?.startsWith('/admin') ?? false;
  const noHeaderLayoutRoutes = ['/auth', '/old-auth-page'];
  const allowHeaderFooterRoutes = ['/auth/action'];
  const isAllowHeaderFooterRoute = allowHeaderFooterRoutes.some(route => pathname?.startsWith(route) ?? false);
  const isBlockedHeaderFooterRoute = noHeaderLayoutRoutes.some(route => pathname?.startsWith(route) ?? false);
  const showHeader = !isAdminPanel && (!isBlockedHeaderFooterRoute || isAllowHeaderFooterRoute);

  const showSiteFooter = !isAdminPanel && (!isBlockedHeaderFooterRoute || isAllowHeaderFooterRoute);

  // Para rotas do admin, retornar apenas o children sem nenhum wrapper
  if (isAdminPanel) {
    return <>{children}</>;
  }


  return (
    <>
      <AdultWarningDialog isOpen={isWarningOpen} onConfirm={handleConfirmAge} />
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        {showHeader && <Header onMenuClick={toggleSidebar} />}
        <IOSSubscriptionSheet
          isOpen={isSidebarOpen}
          onClose={toggleSidebar}
        />
        <main className="flex-grow flex flex-col items-center">{children}</main>
        {showSiteFooter && <MainFooter />}
      </div>
      {selectedFetish && (
        <FetishModal
          fetish={selectedFetish}
          isOpen={!!selectedFetish}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

export default Layout;
