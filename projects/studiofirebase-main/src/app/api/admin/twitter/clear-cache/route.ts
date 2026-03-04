import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// POST - Limpar cache do Twitter quando usuário desconectar
export async function POST(request: NextRequest) {
    try {
        console.log('[CLEAR-CACHE] Limpando cache do Twitter...');

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

        // Pegar username do body
        const body = await request.json();
        const username = body.username;

        if (!username) {
            return NextResponse.json({ error: 'Username não fornecido' }, { status: 400 });
        }

        // Deletar cache do Firestore
        const db = getFirestore(adminApp);
        const mediaRef = db.collection('twitter_cache').doc(username).collection('media');

        // Deletar fotos e vídeos
        await mediaRef.doc('photos').delete();
        await mediaRef.doc('videos').delete();

        console.log(`[CLEAR-CACHE] ✅ Cache limpo para @${username}`);
        return NextResponse.json({
            success: true,
            message: 'Cache limpo com sucesso'
        });

    } catch (error) {
        console.error('[CLEAR-CACHE] Erro ao limpar cache:', error);
        return NextResponse.json({
            error: 'Erro ao limpar cache',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
        }, { status: 500 });
    }
}
