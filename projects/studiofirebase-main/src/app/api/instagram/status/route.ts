import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
    try {
        // Verificar se há token salvo no Firestore
        const configRef = db.collection('config').doc('instagram');
        const configDoc = await configRef.get();

        if (!configDoc.exists) {
            return NextResponse.json({
                success: true,
                connected: false
            });
        }

        const data = configDoc.data();
        const accessToken = data?.accessToken;
        const tokenExpiry = data?.tokenExpiry;

        if (!accessToken) {
            return NextResponse.json({
                success: true,
                connected: false
            });
        }

        // Verificar se o token ainda é válido
        if (tokenExpiry && new Date(tokenExpiry) < new Date()) {
            return NextResponse.json({
                success: true,
                connected: false,
                message: 'Token expirado'
            });
        }

        // Buscar informações da conta
        const accountResponse = await fetch(
            `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${accessToken}`
        );

        if (!accountResponse.ok) {
            return NextResponse.json({
                success: true,
                connected: false,
                message: 'Token inválido'
            });
        }

        const account = await accountResponse.json();

        return NextResponse.json({
            success: true,
            connected: true,
            account,
            tokenExpiry: data?.tokenExpiry,
            lastRefresh: data?.lastRefresh
        });

    } catch (error: any) {
        console.error('Erro ao verificar status do Instagram:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
