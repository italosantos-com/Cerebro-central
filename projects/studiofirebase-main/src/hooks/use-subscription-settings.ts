"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getPublicUsernameFromPathname } from '@/utils/public-admin-scope';
import { resolveAdminUidByUsername } from '@/utils/admin-lookup-client';

interface UseSubscriptionSettingsReturn {
  pixValue: number;
  loading: boolean;
  error: string | null;
  refreshSettings: () => void;
}

export function useSubscriptionSettings(): UseSubscriptionSettingsReturn {
  const [pixValue, setPixValue] = useState<number>(99);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const pathname = usePathname();

  const refreshSettings = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    if (!db) {
      setError('Firebase não está configurado');
      setLoading(false);
      return;
    }

    let isCancelled = false;
    let unsubscribe: (() => void) | null = null;

    const setup = async () => {
      let settingsRef = doc(db, 'admin', 'profileSettings');

      if (globalThis.window) {
        const username = getPublicUsernameFromPathname(pathname || globalThis.window.location.pathname);
        if (username) {
          const adminUid = await resolveAdminUidByUsername(username);
          if (adminUid) {
            settingsRef = doc(db, 'admins', adminUid, 'profile', 'settings');
          }
        }
      }

    
    // Use onSnapshot for real-time updates
      unsubscribe = onSnapshot(
      settingsRef,
      (snap) => {
        if (isCancelled) return;
        if (snap.exists()) {
          const data = snap.data();
          const pix = data?.paymentSettings?.pixValue;
          if (typeof pix === 'number' && pix > 0) {
            setPixValue(pix);
          } else {
            setPixValue(99);
          }
        } else {
          setPixValue(99);
        }
        setError(null);
        setLoading(false);
      },
      (error) => {
        if (isCancelled) return;
        setError('Erro ao carregar configurações de assinatura');
        setPixValue(99); // Fallback value
        setLoading(false);
      }
    );
    };

    setup();

    return () => {
      isCancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [pathname, refreshTrigger]);

  return {
    pixValue,
    loading,
    error,
    refreshSettings
  };
}
