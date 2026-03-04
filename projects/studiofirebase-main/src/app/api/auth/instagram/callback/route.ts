/**
 * Instagram OAuth Callback Route
 * Processa o redirect do Instagram após autorização
 * Troca code por access token e salva no Firestore
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface InstagramTokenResponse {
    access_token: string;
    user_id: string;
    permissions?: string;
}

interface InstagramLongLivedTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

interface InstagramProfileData {
    id: string;
    username: string;
    account_type?: string;
    media_count?: number;
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorReason = searchParams.get('error_reason');
        const errorDescription = searchParams.get('error_description');

        // Verificar se houve erro na autorização
        if (error) {
            console.error('[Instagram Callback] Erro na autorização:', {
                error,
                errorReason,
                errorDescription
            });

            return NextResponse.redirect(
                new URL(
                    `/admin/integrations?instagram_error=${encodeURIComponent(errorDescription || 'Autorização negada')}`,
                    request.url
                )
            );
        }

        // Validar code
        if (!code) {
            return NextResponse.redirect(
                new URL(
                    '/admin/integrations?instagram_error=Código de autorização não recebido',
                    request.url
                )
            );
        }

        console.log('[Instagram Callback] Code recebido:', code.substring(0, 20) + '...');

        // Configurações do Instagram App (usar EXATAMENTE o mesmo redirect_uri)
        const instagramAppId = process.env.INSTAGRAM_APP_ID;
        const instagramAppSecret = process.env.INSTAGRAM_APP_SECRET;
        const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

        if (!instagramAppSecret) {
            console.error('[Instagram Callback] INSTAGRAM_APP_SECRET não configurado');
            return NextResponse.redirect(
                new URL(
                    '/admin/integrations?instagram_error=Configuração do servidor incompleta',
                    request.url
                )
            );
        }

        // Passo 1: Trocar code por short-lived token
        console.log('[Instagram Callback] Trocando code por token...');

        const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: instagramAppId,
                client_secret: instagramAppSecret,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
                code: code
            }).toString()
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error('[Instagram Callback] Erro ao trocar code por token:', errorData);

            return NextResponse.redirect(
                new URL(
                    `/admin/integrations?instagram_error=${encodeURIComponent(errorData.error_message || 'Erro ao obter token')}`,
                    request.url
                )
            );
        }

        const tokenData: InstagramTokenResponse = await tokenResponse.json();
        const shortLivedToken = tokenData.access_token;
        const userId = tokenData.user_id;

        console.log('[Instagram Callback] Short-lived token obtido para user:', userId);

        // Passo 2: Trocar por long-lived token (60 dias)
        console.log('[Instagram Callback] Trocando por long-lived token...');

        const longLivedResponse = await fetch(
            `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${instagramAppSecret}&access_token=${shortLivedToken}`,
            { method: 'GET' }
        );

        if (!longLivedResponse.ok) {
            const errorData = await longLivedResponse.json();
            console.error('[Instagram Callback] Erro ao obter long-lived token:', errorData);

            // Mesmo com erro, vamos usar o short-lived token
            console.warn('[Instagram Callback] Usando short-lived token como fallback');
        }

        let finalToken = shortLivedToken;
        let expiresIn = 3600; // 1 hora (short-lived padrão)

        if (longLivedResponse.ok) {
            const longLivedData: InstagramLongLivedTokenResponse = await longLivedResponse.json();
            finalToken = longLivedData.access_token;
            expiresIn = longLivedData.expires_in;
            console.log('[Instagram Callback] Long-lived token obtido (válido por 60 dias)');
        }

        // Passo 3: Buscar dados do perfil
        console.log('[Instagram Callback] Buscando dados do perfil...');

        const profileResponse = await fetch(
            `https://graph.instagram.com/${userId}?fields=id,username,account_type,media_count&access_token=${finalToken}`,
            { method: 'GET' }
        );

        let profileData: InstagramProfileData = {
            id: userId,
            username: 'unknown'
        };

        if (profileResponse.ok) {
            profileData = await profileResponse.json();
            console.log('[Instagram Callback] Perfil obtido:', profileData.username);
        } else {
            console.warn('[Instagram Callback] Erro ao buscar perfil, usando dados mínimos');
        }

        // Passo 4: Verificar autenticação do usuário
        // Buscar o UID do usuário autenticado (via cookie ou header)
        const sessionCookie = request.cookies.get('session');

        if (!sessionCookie) {
            console.error('[Instagram Callback] Usuário não autenticado');
            return NextResponse.redirect(
                new URL(
                    '/admin/integrations?instagram_error=Você precisa estar logado',
                    request.url
                )
            );
        }

        let uid: string;
        try {
            const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie.value, true);
            uid = decodedClaims.uid;
        } catch (error) {
            console.error('[Instagram Callback] Erro ao verificar sessão:', error);
            return NextResponse.redirect(
                new URL(
                    '/admin/integrations?instagram_error=Sessão inválida',
                    request.url
                )
            );
        }

        // Passo 5: Salvar no Firestore
        console.log('[Instagram Callback] Salvando credenciais no Firestore...');

        const expiresAt = new Date(Date.now() + expiresIn * 1000);

        await adminDb
            .collection('users')
            .doc(uid)
            .collection('integrations')
            .doc('instagram')
            .set({
                platform: 'instagram',
                userId: profileData.id,
                username: profileData.username,
                accountType: profileData.account_type || 'BUSINESS',
                accessToken: finalToken,
                tokenType: 'long_lived',
                expiresAt: expiresAt,
                expiresIn: expiresIn,
                permissions: tokenData.permissions || '',
                mediaCount: profileData.media_count || 0,
                connectedAt: new Date(),
                lastRefreshedAt: new Date(),
                isActive: true
            }, { merge: true });

        console.log('[Instagram Callback] ✅ Instagram conectado com sucesso!');

        // Redirecionar de volta para integrations com sucesso
        return NextResponse.redirect(
            new URL(
                `/admin/integrations?instagram_success=true&username=${encodeURIComponent(profileData.username)}`,
                request.url
            )
        );

    } catch (error) {
        console.error('[Instagram Callback] Erro inesperado:', error);

        return NextResponse.redirect(
            new URL(
                `/admin/integrations?instagram_error=${encodeURIComponent('Erro ao processar autorização')}`,
                request.url
            )
        );
    }
}
