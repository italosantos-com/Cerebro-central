import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export type AdminApiAuthResult = {
  uid: string;
  decodedToken: Record<string, any>;
  adminDoc: Record<string, any>;
};

function unauthorized(message = 'Não autenticado') {
  return NextResponse.json({ success: false, message }, { status: 401 });
}

function forbidden(message = 'Acesso negado') {
  return NextResponse.json({ success: false, message }, { status: 403 });
}

function serverError(message = 'Erro interno') {
  return NextResponse.json({ success: false, message }, { status: 500 });
}

function getBearerToken(request: NextRequest): string {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return '';
  return authHeader.slice('Bearer '.length).trim();
}

export async function requireAdminApiAuth(request: NextRequest): Promise<AdminApiAuthResult | NextResponse> {
  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();

  if (!adminAuth || !adminDb) {
    return serverError('Firebase Admin não inicializado');
  }

  const token = getBearerToken(request);
  const sessionCookie = request.cookies.get('__session')?.value;

  let decodedToken: any;
  if (token) {
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
      return unauthorized('Token inválido ou expirado');
    }
  } else if (sessionCookie) {
    try {
      decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch {
      return unauthorized('Session cookie inválido ou expirado');
    }
  } else {
    return unauthorized('Token Bearer ausente');
  }

  const uid = decodedToken?.uid;
  if (!uid) {
    return unauthorized('Token inválido');
  }

  try {
    const adminSnap = await adminDb.collection('admins').doc(uid).get();
    if (!adminSnap.exists) {
      return forbidden('Usuário não é administrador');
    }

    const adminDoc = adminSnap.data() || {};
    if (adminDoc.status && adminDoc.status !== 'active') {
      return forbidden('Administrador inativo');
    }

    return { uid, decodedToken, adminDoc };
  } catch {
    return serverError('Falha ao validar administrador');
  }
}

export async function requireMainAdminApiAuth(request: NextRequest): Promise<AdminApiAuthResult | NextResponse> {
  const result = await requireAdminApiAuth(request);
  if (result instanceof NextResponse) return result;
  if (!result.adminDoc?.isMainAdmin) {
    return forbidden('Apenas o administrador principal pode executar esta ação');
  }
  return result;
}
