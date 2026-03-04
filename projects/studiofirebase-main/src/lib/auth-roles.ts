/**
 * auth-roles.ts
 *
 * Helpers de validação de roles para controle de acesso baseado em perfil.
 *
 * Roles suportadas:
 *  - superadmin: acesso global a todas as rotas e dados
 *  - user/admin: acesso restrito ao próprio UID
 */

import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

// -----------------------------------------------------------------------
// Constantes
// -----------------------------------------------------------------------

/** Role atribuída ao superadmin no custom claim do Firebase Auth */
export const ROLE_SUPERADMIN = 'superadmin';

/** Role padrão de administrador de conteúdo */
export const ROLE_ADMIN = 'admin';

// -----------------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------------

export interface TokenClaims {
  role?: string;
  admin?: boolean;
  uid: string;
  [key: string]: unknown;
}

// -----------------------------------------------------------------------
// Helpers síncronos (baseados em dados já obtidos do token)
// -----------------------------------------------------------------------

/**
 * Verifica se os claims do token indicam a role de superadmin.
 */
export function hasSuperAdminRole(claims: TokenClaims): boolean {
  return claims.role === ROLE_SUPERADMIN;
}

/**
 * Verifica se os claims do token pertencem a um admin comum ou superadmin.
 */
export function hasAdminRole(claims: TokenClaims): boolean {
  return hasSuperAdminRole(claims) || claims.admin === true || claims.role === ROLE_ADMIN;
}

/**
 * Verifica se os claims do token correspondem ao UID informado.
 * Superadmins têm acesso a qualquer UID.
 */
export function hasUidAccess(claims: TokenClaims, uid: string): boolean {
  if (hasSuperAdminRole(claims)) return true;
  return claims.uid === uid;
}

// -----------------------------------------------------------------------
// Helpers assíncronos (consultam o Firebase Auth diretamente)
// -----------------------------------------------------------------------

/**
 * Retorna os custom claims do usuário autenticado.
 * Retorna null se o usuário não estiver autenticado.
 *
 * @param forceRefresh - Quando true, força a renovação do token antes de ler os claims.
 *   Use apenas quando a role do usuário tiver sido alterada recentemente.
 */
export async function getCurrentUserClaims(forceRefresh = false): Promise<TokenClaims | null> {
  return new Promise((resolve) => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      unsubscribe();
      if (!user) {
        resolve(null);
        return;
      }
      try {
        const idTokenResult = await user.getIdTokenResult(forceRefresh);
        resolve({
          uid: user.uid,
          ...(idTokenResult.claims as Omit<TokenClaims, 'uid'>),
        });
      } catch {
        resolve(null);
      }
    });
  });
}

/**
 * Verifica se o usuário autenticado possui a role de superadmin.
 */
export async function isSuperAdmin(): Promise<boolean> {
  const claims = await getCurrentUserClaims();
  if (!claims) return false;
  return hasSuperAdminRole(claims);
}

/**
 * Verifica se o usuário autenticado tem acesso ao UID informado.
 * Superadmins têm acesso a qualquer UID; outros usuários apenas ao próprio.
 */
export async function canAccessUid(uid: string): Promise<boolean> {
  const claims = await getCurrentUserClaims();
  if (!claims) return false;
  return hasUidAccess(claims, uid);
}
