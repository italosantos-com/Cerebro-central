import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
    try {
        // Verificar token de autenticação do Firebase
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];

        // Verificar token do Firebase Admin
        const adminApp = getAdminApp();
        if (!adminApp) {
            console.error('[TWITTER-ME] Firebase Admin não inicializado');
            return NextResponse.json({ error: 'Erro ao inicializar Firebase Admin' }, { status: 500 });
        }

        const auth = getAuth(adminApp);
        const decodedToken = await auth.verifyIdToken(token);
        const uid = decodedToken.uid;

        console.log('[TWITTER-ME] Buscando dados do usuário:', uid);

        // Buscar username do Twitter no Firestore
        const db = getFirestore(adminApp);
        const twitterAuthDoc = await db.collection('twitter_admins').doc(uid).get();

        if (twitterAuthDoc.exists) {
            const data = twitterAuthDoc.data();
            console.log('[TWITTER-ME] Dados encontrados no Firestore:', data);

            return NextResponse.json({
                username: data?.username,
                displayName: data?.displayName || null,
                email: data?.email || null,
                photoURL: data?.photoURL || null,
                authenticatedAt: data?.authenticatedAt || null,
            });
        }

        // Se não encontrar no DB, buscar do Twitter API
        console.log('[TWITTER-ME] Dados não encontrados no Firebase, buscando do Twitter API');

        const bearerToken = process.env.TWITTER_BEARER_TOKEN;
        if (!bearerToken) {
            return NextResponse.json({ error: 'Twitter Bearer Token não configurado' }, { status: 500 });
        }

        // Buscar informações do usuário autenticado no Firebase Auth
        const userRecord = await auth.getUser(uid);
        const twitterProvider = userRecord.providerData.find(p => p.providerId === 'twitter.com');

        if (!twitterProvider || !twitterProvider.uid) {
            return NextResponse.json({ error: 'Usuário não possui autenticação do Twitter' }, { status: 404 });
        }

        // Usar o Twitter User ID para buscar informações
        const twitterUserId = twitterProvider.uid;
        const response = await fetch(`https://api.twitter.com/2/users/${twitterUserId}?user.fields=username,name,profile_image_url`, {
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
            },
        });

        if (!response.ok) {
            console.error('[TWITTER-ME] Erro ao buscar do Twitter API:', response.status);
            return NextResponse.json({ error: 'Erro ao buscar dados do Twitter' }, { status: response.status });
        }

        const twitterData = await response.json();
        const username = twitterData.data?.username;

        if (!username) {
            return NextResponse.json({ error: 'Username do Twitter não encontrado' }, { status: 404 });
        }

        // Salvar no Firestore para próxima vez
        await db.collection('twitter_admins').doc(uid).set({
            username: username,
            displayName: twitterData.data?.name || null,
            photoURL: twitterData.data?.profile_image_url || null,
            email: userRecord.email || null,
            twitterUserId: twitterUserId,
            authenticatedAt: new Date().toISOString(),
        });

        console.log('[TWITTER-ME] Dados salvos no Firestore:', username);

        return NextResponse.json({
            username: username,
            displayName: twitterData.data?.name || null,
            email: userRecord.email || null,
            photoURL: twitterData.data?.profile_image_url || null,
            authenticatedAt: new Date().toISOString(),
        });

    } catch (error) {
        console.error('[TWITTER-ME] Erro:', error);
        return NextResponse.json({
            error: 'Erro ao buscar dados do usuário',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
        }, { status: 500 });
    }
}
