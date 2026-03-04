import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { getAuth } from 'firebase-admin/auth';

/**
 * POST /api/admin/twitter/persist
 * Persiste informações do usuário Twitter autenticado no Firebase Realtime Database
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verificar token com Firebase Admin
    const app = getAdminApp();
    if (!app) {
      return NextResponse.json(
        { error: 'Firebase Admin não inicializado' },
        { status: 500 }
      );
    }
    
    const auth = getAuth(app);
    
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Obter dados do body
    const body = await request.json();
    const { username, uid, email } = body;

    if (!username || !uid) {
      return NextResponse.json(
        { error: 'Username e UID são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o UID do token corresponde ao do body
    if (decodedToken.uid !== uid) {
      return NextResponse.json(
        { error: 'UID não corresponde ao token fornecido' },
        { status: 403 }
      );
    }

    // Salvar no Firebase Realtime Database
    const db = getDatabase(app);
    const userRef = db.ref(`twitter_auth/${uid}`);
    
    await userRef.set({
      username,
      email,
      uid,
      connected: true,
      lastUpdated: Date.now(),
      provider: 'twitter'
    });

    console.log(`✅ Dados do Twitter persistidos para @${username} (${uid})`);

    return NextResponse.json({
      success: true,
      message: 'Dados persistidos com sucesso',
      username
    });

  } catch (error: any) {
    console.error('❌ Erro ao persistir dados do Twitter:', error);
    return NextResponse.json(
      { error: 'Erro ao persistir dados', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/twitter/persist
 * Recupera informações do usuário Twitter autenticado
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verificar token com Firebase Admin
    const app = getAdminApp();
    if (!app) {
      return NextResponse.json(
        { error: 'Firebase Admin não inicializado' },
        { status: 500 }
      );
    }
    
    const auth = getAuth(app);
    
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Buscar dados no Firebase Realtime Database
    const db = getDatabase(app);
    const userRef = db.ref(`twitter_auth/${decodedToken.uid}`);
    const snapshot = await userRef.get();

    if (!snapshot.exists()) {
      return NextResponse.json(
        { error: 'Dados não encontrados' },
        { status: 404 }
      );
    }

    const data = snapshot.val();

    return NextResponse.json({
      success: true,
      data: {
        username: data.username,
        email: data.email,
        connected: data.connected,
        lastUpdated: data.lastUpdated
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar dados do Twitter:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados', details: error.message },
      { status: 500 }
    );
  }
}
