/**
 * WebAuthn/Passkey service for Admin authentication
 * Uses custom /api/passkey endpoints for passkey management
 */

import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { loginWithPasskey, registerWithPasskey, removePasskeyByEmail, getPasskeyStatusByEmail } from '@/services/passkey-client';
import { searchAdminByIdentifier } from '@/services/admin-flexible-auth';

const PASSKEY_DEBUG_ENV_ENABLED = process.env.NEXT_PUBLIC_PASSKEY_DEBUG === 'true';

function isPasskeyDebugEnabled(): boolean {
  if (PASSKEY_DEBUG_ENV_ENABLED) {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem('passkeyDebug') === 'true';
  } catch {
    return false;
  }
}

function maskUserId(userId?: string): string {
  if (!userId) {
    return 'n/a';
  }

  if (userId.length <= 6) {
    return `${userId.slice(0, 2)}***`;
  }

  return `${userId.slice(0, 3)}***${userId.slice(-3)}`;
}

function toSafeError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return { type: typeof error };
  }

  const maybeError = error as Error & { code?: string };
  return {
    name: maybeError.name,
    code: maybeError.code,
    message: maybeError.message,
  };
}

function passkeyDebug(scope: string, message: string, data?: Record<string, unknown>) {
  if (!isPasskeyDebugEnabled()) {
    return;
  }

  if (data) {
    console.log(`[PasskeyDebug][${scope}] ${message}`, data);
    return;
  }

  console.log(`[PasskeyDebug][${scope}] ${message}`);
}

function isPreviewHostUnsupportedForPasskey(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location.hostname.toLowerCase();
  return hostname.endsWith('.github.dev') || hostname.endsWith('.app.github.dev');
}

/**
 * Check if passkeys are supported in the current browser
 */
export function isPasskeySupported(): boolean {
  if (isPreviewHostUnsupportedForPasskey()) {
    passkeyDebug('isPasskeySupported', 'Preview host detected, passkey disabled');
    return false;
  }

  const supported = (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === 'function'
  );

  passkeyDebug('isPasskeySupported', 'Support check finished', {
    supported,
    hasWindow: typeof window !== 'undefined',
    hasPublicKeyCredential: typeof window !== 'undefined' ? window.PublicKeyCredential !== undefined : false,
  });

  return supported;
}

/**
 * Register a passkey for an existing admin user
 * @param userId - The admin user's UID
 * @param displayName - Display name for the passkey
 */
export async function registerAdminPasskey(
  userId: string,
  displayName: string
): Promise<void> {
  passkeyDebug('registerAdminPasskey', 'Starting passkey registration', {
    userId: maskUserId(userId),
    hasDisplayName: Boolean(displayName),
    currentUser: maskUserId(auth.currentUser?.uid),
  });

  if (!isPasskeySupported()) {
    throw new Error('Passkeys não são suportados neste navegador');
  }

  // Validate userId
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('ID de usuário inválido');
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Usuário não autenticado');
  }

  if (currentUser.uid !== userId) {
    throw new Error('Usuário atual não corresponde ao UID fornecido');
  }

  const currentEmail = String(currentUser.email || '').trim().toLowerCase();
  if (!currentEmail) {
    throw new Error('Usuário autenticado sem email válido para registrar passkey');
  }

  try {
    passkeyDebug('registerAdminPasskey', 'Trying custom passkey registration flow', {
      email: currentEmail,
    });

    const customResult = await registerWithPasskey(currentEmail);
    if (!customResult?.verified) {
      throw new Error('Registro custom de passkey não foi verificado');
    }

    passkeyDebug('registerAdminPasskey', 'Custom passkey registration finished successfully');
  } catch (customError) {
    passkeyDebug('registerAdminPasskey', 'Custom registration failed', {
      error: toSafeError(customError),
    });
    throw customError;
  }

  try {

    // Update the admin document to indicate passkey is registered
    const adminRef = doc(db, 'admins', userId);
    await updateDoc(adminRef, {
      passkeyEnabled: true,
      passkeyRegisteredAt: new Date().toISOString(),
      lastPasskeyUpdate: new Date().toISOString()
    });

    console.log('[Admin WebAuthn] Passkey registered successfully for user:', userId);
    passkeyDebug('registerAdminPasskey', 'Admin document updated for passkey registration', {
      userId: maskUserId(userId),
    });
  } catch (error) {
    console.error('[Admin WebAuthn] Error registering passkey:', error);
    passkeyDebug('registerAdminPasskey', 'Registration failed', {
      userId: maskUserId(userId),
      error: toSafeError(error),
    });
    throw new Error('Falha ao registrar chave de acesso');
  }
}

/**
 * Sign in with passkey
 * @returns The authenticated user credential
 */
export async function signInAdminWithPasskey(identifier?: string) {
  passkeyDebug('signInAdminWithPasskey', 'Starting sign-in flow', {
    currentUser: maskUserId(auth.currentUser?.uid),
  });

  if (!isPasskeySupported()) {
    throw new Error('Passkeys não são suportados neste navegador');
  }

  if (isPreviewHostUnsupportedForPasskey()) {
    throw new Error('Passkey não disponível em domínio de preview. Use domínio de produção/local autorizado no Firebase.');
  }

  try {
    console.log('[Admin WebAuthn] Attempting passkey sign in...');
    const fallbackIdentifier = String(identifier || '').trim() || await resolveFallbackIdentifierForPasskey();
    if (!fallbackIdentifier) {
      throw new Error('Informe email, @username ou telefone para entrar com passkey');
    }

    const result = await signInAdminWithCustomPasskey(fallbackIdentifier);
    passkeyDebug('signInAdminWithPasskey', 'Custom passkey sign-in succeeded');
    return result;
  } catch (error: any) {
    passkeyDebug('signInAdminWithPasskey', 'Sign-in flow failed', {
      error: toSafeError(error),
    });

    console.error('[Admin WebAuthn] Error signing in with passkey:', error);
    
    if (error.message === 'ADMIN_NOT_REGISTERED' || error.message === 'ADMIN_DISABLED') {
      throw error;
    }
    
    // Handle specific WebAuthn errors
    if (error.name === 'NotAllowedError') {
      throw new Error('Autenticação com chave de acesso foi cancelada ou não permitida');
    } else if (error.name === 'InvalidStateError') {
      throw new Error('Chave de acesso não encontrada para este dispositivo');
    } else if (error.name === 'NotSupportedError') {
      throw new Error('Chave de acesso não é suportada neste navegador');
    }
    
    throw new Error('Falha ao entrar com chave de acesso');
  }
}

async function resolveFallbackIdentifierForPasskey(): Promise<string | null> {
  try {
    const fromStorage = window.localStorage.getItem('adminPasskeyIdentifier');
    const normalized = String(fromStorage || '').trim();
    return normalized || null;
  } catch {
    return null;
  }
}

async function resolveIdentifierToAdminEmail(identifier: string): Promise<string> {
  const normalizedIdentifier = identifier.trim();
  if (!normalizedIdentifier) {
    throw new Error('Informe email, @username ou telefone para login com passkey');
  }

  if (normalizedIdentifier.startsWith('@')) {
    const adminByUsername = await searchAdminByIdentifier(normalizedIdentifier);
    if (!adminByUsername?.email) {
      throw new Error('Username de admin não encontrado para login com passkey');
    }
    return adminByUsername.email.toLowerCase();
  }

  const isLikelyEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdentifier);
  if (isLikelyEmail) {
    return normalizedIdentifier.toLowerCase();
  }

  const admin = await searchAdminByIdentifier(normalizedIdentifier);
  if (!admin?.email) {
    throw new Error('Identificador de admin não encontrado para login com passkey');
  }

  return admin.email.toLowerCase();
}

export async function checkAdminPasskeyForIdentifier(identifier: string): Promise<boolean> {
  const adminEmail = await resolveIdentifierToAdminEmail(identifier);
  const status = await getPasskeyStatusByEmail(adminEmail);
  return status.hasPasskey === true;
}

async function signInAdminWithCustomPasskey(identifier: string) {
  const adminEmail = await resolveIdentifierToAdminEmail(identifier);
  const authResult = await loginWithPasskey(adminEmail);

  if (!authResult?.verified || !authResult.user) {
    throw new Error('Falha ao verificar login com passkey');
  }

  if (authResult.user.role !== 'admin') {
    throw new Error('ADMIN_NOT_REGISTERED');
  }

  const adminRef = doc(db, 'admins', authResult.user.uid);
  const adminDoc = await getDoc(adminRef);

  if (!adminDoc.exists()) {
    throw new Error('ADMIN_NOT_REGISTERED');
  }

  const adminData = adminDoc.data();
  if (adminData.status && adminData.status !== 'active') {
    throw new Error('ADMIN_DISABLED');
  }

  await updateDoc(adminRef, {
    lastLoginAt: new Date().toISOString(),
    lastLoginMethod: 'passkey',
  });

  return {
    user: {
      uid: authResult.user.uid,
      email: authResult.user.email,
    },
    admin: adminData,
  };
}

/**
 * Check if the current admin user has a passkey registered
 * @param userId - The admin user's UID
 */
export async function hasAdminPasskey(userId: string): Promise<boolean> {
  // Validate userId is provided and non-empty
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    console.warn('[Admin WebAuthn] Invalid userId provided to hasAdminPasskey');
    return false;
  }

  try {
    const adminRef = doc(db, 'admins', userId);
    const adminDoc = await getDoc(adminRef);
    passkeyDebug('hasAdminPasskey', 'Admin document fetched', {
      userId: maskUserId(userId),
      adminDocExists: adminDoc.exists(),
    });
    
    if (!adminDoc.exists()) {
      return false;
    }

    const adminData = adminDoc.data();
    passkeyDebug('hasAdminPasskey', 'Passkey status read from admin doc', {
      userId: maskUserId(userId),
      passkeyEnabled: adminData.passkeyEnabled === true,
    });
    return adminData.passkeyEnabled === true;
  } catch (error) {
    console.error('[Admin WebAuthn] Error checking passkey status:', error);
    passkeyDebug('hasAdminPasskey', 'Passkey status check failed', {
      userId: maskUserId(userId),
      error: toSafeError(error),
    });
    return false;
  }
}

/**
 * Remove passkey from an admin user
 * @param userId - The admin user's UID
 */
export async function removeAdminPasskey(userId: string): Promise<void> {
  passkeyDebug('removeAdminPasskey', 'Starting remove flow', {
    userId: maskUserId(userId),
    currentUser: maskUserId(auth.currentUser?.uid),
  });

  // Validate userId
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('ID de usuário inválido');
  }

  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== userId) {
    throw new Error('Usuário não autenticado');
  }

  const currentEmail = String(currentUser.email || '').trim().toLowerCase();

  try {
    if (currentEmail) {
      passkeyDebug('removeAdminPasskey', 'Trying custom passkey remove flow', {
        email: currentEmail,
      });
      await removePasskeyByEmail(currentEmail);
      passkeyDebug('removeAdminPasskey', 'Custom passkey remove flow finished');
    }
  } catch (customError) {
    passkeyDebug('removeAdminPasskey', 'Custom remove failed', {
      error: toSafeError(customError),
    });
    throw customError;
  }

  try {

    // Update the admin document
    const adminRef = doc(db, 'admins', userId);
    await updateDoc(adminRef, {
      passkeyEnabled: false,
      passkeyRemovedAt: new Date().toISOString()
    });

    console.log('[Admin WebAuthn] Passkey removed successfully');
    passkeyDebug('removeAdminPasskey', 'Admin document updated after passkey removal', {
      userId: maskUserId(userId),
    });
  } catch (error) {
    console.error('[Admin WebAuthn] Error removing passkey:', error);
    passkeyDebug('removeAdminPasskey', 'Remove flow failed', {
      userId: maskUserId(userId),
      error: toSafeError(error),
    });
    throw new Error('Falha ao remover chave de acesso');
  }
}

/**
 * Verify if passkey authentication is available for the current session
 */
export async function isPasskeyAvailable(): Promise<boolean> {
  if (!isPasskeySupported()) {
    passkeyDebug('isPasskeyAvailable', 'Support is false, availability is false');
    return false;
  }

  try {
    // Check if conditional UI is supported (autofill)
    if (
      window.PublicKeyCredential &&
      'isConditionalMediationAvailable' in window.PublicKeyCredential
    ) {
      const available = await (window.PublicKeyCredential as any).isConditionalMediationAvailable();
      passkeyDebug('isPasskeyAvailable', 'Conditional mediation check finished', { available });
      return available;
    }

    passkeyDebug('isPasskeyAvailable', 'Conditional mediation API missing, defaulting to true');
    return true;
  } catch (error) {
    console.error('[Admin WebAuthn] Error checking passkey availability:', error);
    passkeyDebug('isPasskeyAvailable', 'Availability check failed', {
      error: toSafeError(error),
    });
    return false;
  }
}
