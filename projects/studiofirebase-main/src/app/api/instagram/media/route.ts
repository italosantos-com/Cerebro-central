import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
    try {
        // Buscar token
        const configRef = db.collection('config').doc('instagram');
        const configDoc = await configRef.get();

        if (!configDoc.exists) {
            return NextResponse.json({
                success: false,
                error: 'Instagram não conectado'
            }, { status: 404 });
        }

        const data = configDoc.data();
        const accessToken = data?.accessToken;

        if (!accessToken) {
            return NextResponse.json({
                success: false,
                error: 'Token não encontrado'
            }, { status: 404 });
        }

        // Buscar mídia do Instagram
        const { searchParams } = new URL(req.url);
        const limit = searchParams.get('limit') || '25';

        const mediaResponse = await fetch(
            `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=${limit}&access_token=${accessToken}`
        );

        if (!mediaResponse.ok) {
            const errorData = await mediaResponse.json();
            throw new Error(errorData.error?.message || 'Erro ao buscar mídia');
        }

        const mediaData = await mediaResponse.json();

        return NextResponse.json({
            success: true,
            media: mediaData.data || [],
            paging: mediaData.paging
        });

    } catch (error: any) {
        console.error('Erro ao buscar mídia do Instagram:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
