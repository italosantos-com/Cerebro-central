/**
 * Middleware helper para APIs que precisam isolamento por adminUid
 * Extrai e valida o adminUid do token JWT
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export interface AdminApiRequest extends NextRequest {
  adminUid?: string;
  isMainAdmin?: boolean;
}

/**
 * Extrai adminUid do token JWT de duas formas:
 * 1. Via header Authorization (Bearer token)
 * 2. Via cookie __session (Firebase session cookie)
 */
export async function extractAdminUidFromRequest(
  request: NextRequest
): Promise<{ adminUid: string | null; error: string | null; isMainAdmin?: boolean }> {
  try {
    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      return { adminUid: null, error: 'Firebase Admin não inicializado' };
    }

    // Tentar extrair de Authorization header (Bearer token)
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    // Tentar extrair de session cookie
    const sessionCookie = request.cookies.get('__session')?.value;

    let decodedToken: any = null;

    if (token) {
      try {
        decodedToken = await adminAuth.verifyIdToken(token);
      } catch (error) {
        console.error('[API Auth] Erro ao verificar ID token:', error);
      }
    }

    if (!decodedToken && sessionCookie) {
      try {
        decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
      } catch (error) {
        console.error('[API Auth] Erro ao verificar session cookie:', error);
      }
    }

    if (!decodedToken) {
      return { adminUid: null, error: 'Token não fornecido ou inválido' };
    }

    // Verificar se tem claim de admin
    const isAdmin = decodedToken.admin === true;
    if (!isAdmin) {
      return { adminUid: null, error: 'Usuário não é admin' };
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return { adminUid: null, error: 'Firebase Admin DB não inicializado' };
    }

    const adminSnap = await adminDb.collection('admins').doc(decodedToken.uid).get();
    if (!adminSnap.exists) {
      return { adminUid: null, error: 'Administrador não encontrado' };
    }

    const adminDoc = adminSnap.data() || {};
    if (adminDoc.status && adminDoc.status !== 'active') {
      return { adminUid: null, error: 'Administrador inativo' };
    }

    return {
      adminUid: decodedToken.uid,
      error: null,
      isMainAdmin: Boolean(adminDoc.isMainAdmin),
    };
  } catch (error) {
    console.error('[API Auth] Erro geral:', error);
    return {
      adminUid: null,
      error: 'Erro ao autenticar: ' + (error instanceof Error ? error.message : String(error))
    };
  }
}

/**
 * Middleware para proteger rotas de admin
 * Automáticamente extrai adminUid e retorna 401 se não autenticado
 */
export async function requireAdminAuth(request: NextRequest) {
  const { adminUid, error, isMainAdmin } = await extractAdminUidFromRequest(request);

  if (!adminUid) {
    return {
      isValid: false,
      adminUid: null,
      response: NextResponse.json(
        { error: error || 'Não autenticado', success: false },
        { status: 401 }
      )
    };
  }

  return {
    isValid: true,
    adminUid,
    isMainAdmin: Boolean(isMainAdmin),
    response: null
  };
}

/**
 * Helper para aplicar filtro de adminUid em query de Firestore
 */
export function createAdminScopedQuery(
  baseQuery: any,
  adminUid: string
) {
  // Se a query já tem um where, concatena. Caso contrário, cria um novo
  return baseQuery.where('adminUid', '==', adminUid);
}

/**
 * Helper para adicionar adminUid ao salvar documento
 */
export function addAdminScopeToData(
  data: any,
  adminUid: string
) {
  return {
    ...data,
    adminUid,
    createdBy: adminUid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Validar que o documento pertence ao admin autenticado
 */
export function validateOwnership(
  documentData: any,
  requestingAdminUid: string
): boolean {
  if (!documentData) return false;
  return documentData.adminUid === requestingAdminUid;
}

/**
 * Validates that an authenticated user only accesses data belonging to their own UID.
 * Prevents cross-UID data leakage: a non-mainAdmin user must never read/write another
 * UID's profile, and must never access the global (superadmin) profile.
 *
 * Returns true when the request is allowed, false when it should be rejected.
 *
 * Rules:
 *  - If requestedUid is provided, the authenticated user must own it OR be mainAdmin.
 *  - If requestedUid is absent (global scope), only mainAdmin can proceed.
 */
export function assertUidIsolation(
  requestedUid: string | null | undefined,
  authenticatedUid: string,
  isMainAdmin: boolean
): boolean {
  if (!requestedUid) {
    // Global scope: only main admin may access
    return isMainAdmin;
  }
  // UID-scoped: must be the owner, or main admin
  return authenticatedUid === requestedUid || isMainAdmin;
}


/**
 * Wrapper para rotas de API isoladas (com suporte a params dinâmicos)
 * 
 * Exemplo de uso em rota GET/POST:
 * export const POST = withAdminAuth(async (request, { adminUid }) => {
 *   const data = await request.json();
 *   // ... seu código aqui
 * });
 *
 * Exemplo de uso em rota dinâmica [id]/route.ts:
 * export const GET = withAdminAuth(async (request, { adminUid, params }) => {
 *   const id = (params as any).id;
 *   // ... seu código aqui
 * });
 */
export function withAdminAuth(
  handler: (
    request: NextRequest,
    context: { adminUid: string; isMainAdmin: boolean; params?: any }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, { params }: { params?: any } = {}) => {
    const { isValid, adminUid, isMainAdmin, response } = await requireAdminAuth(request);

    if (!isValid || !adminUid) {
      return response;
    }

    try {
      return await handler(request, { adminUid, isMainAdmin: Boolean(isMainAdmin), params });
    } catch (error) {
      console.error('[API] Erro na rota protegida:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor', success: false },
        { status: 500 }
      );
    }
  };
}
