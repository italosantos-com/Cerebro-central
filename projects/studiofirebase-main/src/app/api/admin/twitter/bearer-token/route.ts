import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// GET - Buscar o Bearer Token atual (Firestore ou .env)
export async function GET(request: NextRequest) {
  try {
    console.log('[BEARER-TOKEN] Buscando token atual...');

    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const adminApp = getAdminApp();
    if (!adminApp) {
      return NextResponse.json({ error: 'Erro ao inicializar Firebase Admin' }, { status: 500 });
    }

    const auth = getAuth(adminApp);
    await auth.verifyIdToken(token);

    // Buscar token customizado do Firestore
    const db = getFirestore(adminApp);
    const configDoc = await db.collection('twitter_config').doc('bearer_token').get();

    if (configDoc.exists && configDoc.data()?.token) {
      console.log('[BEARER-TOKEN] Token customizado encontrado no Firestore');
      return NextResponse.json({
        source: 'firestore',
        hasCustomToken: true
      });
    }

    console.log('[BEARER-TOKEN] Usando token padrão do .env');
    return NextResponse.json({
      source: '.env',
      hasCustomToken: false
    });

  } catch (error) {
    console.error('[BEARER-TOKEN] Erro ao buscar token:', error);
    return NextResponse.json({
      error: 'Erro ao buscar token',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// POST - Salvar novo Bearer Token no Firestore
export async function POST(request: NextRequest) {
  try {
    console.log('[BEARER-TOKEN] Salvando novo token...');

    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const adminApp = getAdminApp();
    if (!adminApp) {
      return NextResponse.json({ error: 'Erro ao inicializar Firebase Admin' }, { status: 500 });
    }

    const auth = getAuth(adminApp);
    const decodedToken = await auth.verifyIdToken(token);

    // Pegar o novo Bearer Token do body
    const body = await request.json();
    const newBearerToken = body.token;

    if (!newBearerToken || typeof newBearerToken !== 'string' || newBearerToken.trim().length === 0) {
      return NextResponse.json({ error: 'Bearer Token inválido' }, { status: 400 });
    }

    // Salvar no Firestore
    const db = getFirestore(adminApp);
    await db.collection('twitter_config').doc('bearer_token').set({
      token: newBearerToken,
      updatedAt: new Date().toISOString(),
      updatedBy: decodedToken.uid
    });

    console.log('[BEARER-TOKEN] ✅ Token salvo com sucesso');
    return NextResponse.json({
      success: true,
      message: 'Bearer Token atualizado com sucesso'
    });

  } catch (error) {
    console.error('[BEARER-TOKEN] Erro ao salvar token:', error);
    return NextResponse.json({
      error: 'Erro ao salvar token',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// DELETE - Remover token customizado (volta a usar .env)
export async function DELETE(request: NextRequest) {
  try {
    console.log('[BEARER-TOKEN] Removendo token customizado...');

    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const adminApp = getAdminApp();
    if (!adminApp) {
      return NextResponse.json({ error: 'Erro ao inicializar Firebase Admin' }, { status: 500 });
    }

    const auth = getAuth(adminApp);
    await auth.verifyIdToken(token);

    // Deletar do Firestore
    const db = getFirestore(adminApp);
    await db.collection('twitter_config').doc('bearer_token').delete();

    console.log('[BEARER-TOKEN] ✅ Token customizado removido');
    return NextResponse.json({
      success: true,
      message: 'Token customizado removido, voltando a usar o padrão do .env'
    });

  } catch (error) {
    console.error('[BEARER-TOKEN] Erro ao remover token:', error);
    return NextResponse.json({
      error: 'Erro ao remover token',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
