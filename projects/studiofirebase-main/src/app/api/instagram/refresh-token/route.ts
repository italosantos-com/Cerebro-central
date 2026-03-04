import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    // Buscar token atual
    const configRef = db.collection('config').doc('instagram');
    const configDoc = await configRef.get();

    if (!configDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma conexão encontrada'
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

    // Renovar token (long-lived tokens podem ser renovados antes de expirar)
    const refreshResponse = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`
    );

    if (!refreshResponse.ok) {
      const errorData = await refreshResponse.json();
      throw new Error(errorData.error?.message || 'Erro ao renovar token');
    }

    const refreshData = await refreshResponse.json();
    const newAccessToken = refreshData.access_token;
    const expiresIn = refreshData.expires_in; // segundos

    // Calcular nova data de expiração
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000);

    // Atualizar no Firestore
    await configRef.update({
      accessToken: newAccessToken,
      tokenExpiry: tokenExpiry.toISOString(),
      lastRefresh: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      tokenExpiry: tokenExpiry.toISOString()
    });

  } catch (error: any) {
    console.error('Erro ao renovar token do Instagram:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
