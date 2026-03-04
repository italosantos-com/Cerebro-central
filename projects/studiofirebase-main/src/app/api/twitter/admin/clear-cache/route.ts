import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
    try {
        console.log('[TWITTER-CACHE] Iniciando limpeza de cache...');

        // Verificar token de autenticação do Firebase
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('[TWITTER-CACHE] Token não fornecido');
            return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];

        // Verificar token do Firebase Admin
        const adminApp = getAdminApp();
        if (!adminApp) {
            console.error('[TWITTER-CACHE] Firebase Admin não inicializado');
            return NextResponse.json({ error: 'Erro ao inicializar Firebase Admin' }, { status: 500 });
        }

        const auth = getAuth(adminApp);
        const decodedToken = await auth.verifyIdToken(token);
        const uid = decodedToken.uid;

        console.log('[TWITTER-CACHE] Usuário autenticado:', uid);

        // Buscar username do Firestore
        const db = getFirestore(adminApp);
        const twitterAdminDoc = await db.collection('twitter_admins').doc(uid).get();

        if (!twitterAdminDoc.exists) {
            console.error('[TWITTER-CACHE] Username não encontrado no Firestore');
            return NextResponse.json({ 
                error: 'Usuário não possui Twitter autenticado. Por favor, autentique na página /admin/integrations' 
            }, { status: 404 });
        }

        const userData = twitterAdminDoc.data() as { username: string };
        const username = userData.username;

        console.log('[TWITTER-CACHE] Limpando cache para username:', username);

        // Limpar cache de fotos
        const photosRef = db.collection('twitter_cache')
            .doc(username)
            .collection('media')
            .doc('photos');
        
        const photosSnap = await photosRef.get();
        if (photosSnap.exists) {
            await photosRef.delete();
            console.log('[TWITTER-CACHE] ✅ Cache de fotos deletado');
        }

        // Limpar cache de vídeos
        const videosRef = db.collection('twitter_cache')
            .doc(username)
            .collection('media')
            .doc('videos');
        
        const videosSnap = await videosRef.get();
        if (videosSnap.exists) {
            await videosRef.delete();
            console.log('[TWITTER-CACHE] ✅ Cache de vídeos deletado');
        }

        console.log('[TWITTER-CACHE] ✅ Cache limpo com sucesso');

        return NextResponse.json({
            success: true,
            message: 'Cache do Twitter limpo com sucesso',
            username
        });

    } catch (error) {
        console.error('[TWITTER-CACHE] Erro:', error);
        return NextResponse.json({
            success: false,
            error: 'Erro ao limpar cache do Twitter',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
        }, { status: 500 });
    }
}
