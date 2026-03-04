'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isAdminRoutePath } from '@/config/admin-routes';

const FACE_ID_AUTH_DEBUG_VERSION = '2025-12-15.1';
let hasWarnedOutsideProvider = false;

function isVerboseDebugEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_VERBOSE_DEBUG === 'true') {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem('verboseDebug') === 'true';
  } catch {
    return false;
  }
}

function faceIdInfo(message: string, ...args: unknown[]) {
  if (!isVerboseDebugEnabled()) {
    return;
  }
  console.info(message, ...args);
}

if (typeof globalThis !== 'undefined') {
  faceIdInfo(`[FaceIDAuthContext] loaded (v=${FACE_ID_AUTH_DEBUG_VERSION})`);
}

type FaceIDUserType = 'vip' | 'member';

interface FaceIDAuthContextType {
  isAuthenticated: boolean;
  userType: FaceIDUserType | null;
  userEmail: string | null;
  login: (userType: FaceIDUserType, email?: string) => void;
  logout: () => void;
  registerUserWithFaceID: (email: string, faceDescriptor: Float32Array) => Promise<void>;
}

const DEFAULT_FACE_ID_AUTH_CONTEXT: FaceIDAuthContextType = {
  isAuthenticated: false,
  userType: null,
  userEmail: null,
  login: () => {
    console.warn('[useFaceIDAuth] login() chamado fora do provider');
  },
  logout: () => {
    console.warn('[useFaceIDAuth] logout() chamado fora do provider');
  },
  registerUserWithFaceID: async () => {
    console.warn('[useFaceIDAuth] registerUserWithFaceID() chamado fora do provider');
  }
};

const FaceIDAuthContext = createContext<FaceIDAuthContextType>(DEFAULT_FACE_ID_AUTH_CONTEXT);

export function FaceIDAuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState<FaceIDUserType | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const pathname = usePathname();
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    faceIdInfo(`[FaceIDAuthProvider] mounted (v=${FACE_ID_AUTH_DEBUG_VERSION})`, {
      pathname,
      hasLocalStorage: typeof globalThis !== 'undefined' && 'localStorage' in globalThis
    });
    return () => {
      mountedRef.current = false;
      faceIdInfo(`[FaceIDAuthProvider] unmounted (v=${FACE_ID_AUTH_DEBUG_VERSION})`, { pathname });
    };
  }, [pathname]);

  useEffect(() => {
    if (isAdminRoutePath(pathname)) {
      return;
    }

    const authStatus = localStorage.getItem('isAuthenticated');
    const storedUserType = localStorage.getItem('userType') as FaceIDUserType | null;
    const storedUserEmail = localStorage.getItem('userEmail');

    if (authStatus === 'true') {
      setIsAuthenticated(true);
      setUserType(storedUserType);
      setUserEmail(storedUserEmail);
    }
  }, [pathname]);

  const login = useCallback((type: FaceIDUserType, email?: string) => {
    if (isAdminRoutePath(pathname)) {
      return;
    }

    setIsAuthenticated(true);
    setUserType(type);
    setUserEmail(email || null);

    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userType', type);
    if (email) {
      localStorage.setItem('userEmail', email);
    }

    document.cookie = `isAuthenticated=true; path=/; max-age=${30 * 24 * 60 * 60}`;

    if (type === 'vip') {
      localStorage.setItem('hasSubscription', 'true');
      const vipExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      localStorage.setItem('subscriptionExpiry', vipExpiry);
      document.cookie = `hasSubscription=true; path=/; max-age=${365 * 24 * 60 * 60}`;
    }
  }, [pathname]);

  const logout = useCallback(() => {
    if (isAdminRoutePath(pathname)) {
      return;
    }

    setIsAuthenticated(false);
    setUserType(null);
    setUserEmail(null);

    localStorage.clear();
    sessionStorage.clear();

    document.cookie = 'isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = 'hasSubscription=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = 'isAdmin=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';

    if (typeof globalThis !== 'undefined' && 'caches' in globalThis) {
      globalThis.caches.keys().then((names) => {
        for (const name of names) {
          globalThis.caches.delete(name);
        }
      });
    }

    if (typeof globalThis !== 'undefined' && 'location' in globalThis) {
      globalThis.location.href = '/';
    }
  }, [pathname]);

  const registerUserWithFaceID = useCallback(async (email: string, faceDescriptor: Float32Array) => {
    // This is a placeholder for the actual implementation
    faceIdInfo("Registering user with Face ID:", { email, faceDescriptor });
    // In a real application, you would store the face descriptor in Firestore
    // associated with the user's email.
  }, []);

  const contextValue = useMemo(() => ({
    isAuthenticated,
    userType,
    userEmail,
    login,
    logout,
    registerUserWithFaceID
  }), [isAuthenticated, userType, userEmail, login, logout, registerUserWithFaceID]);

  return (
    <FaceIDAuthContext.Provider value={contextValue}>
      {children}
    </FaceIDAuthContext.Provider>
  );
}

export function useFaceIDAuth(): FaceIDAuthContextType {
  const context = useContext(FaceIDAuthContext);

  const pathname =
    typeof globalThis !== 'undefined' && 'location' in globalThis
      ? globalThis.location.pathname
      : '(no-location)';

  // Fora do provider, o createContext retorna o DEFAULT_*.
  if (context === DEFAULT_FACE_ID_AUTH_CONTEXT) {
    if (!hasWarnedOutsideProvider) {
      hasWarnedOutsideProvider = true;
      console.warn(`[useFaceIDAuth] ⚠️ Hook usado fora do FaceIDAuthProvider (v=${FACE_ID_AUTH_DEBUG_VERSION})`, {
        pathname
      });
      console.trace('[useFaceIDAuth] stack trace (primeira ocorrência)');
    }
  }

  return context;
}
