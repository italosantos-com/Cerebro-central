import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { verifySignedOAuthAdminState } from '@/lib/oauth-admin-state';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    const savedState = request.cookies.get('instagram_state')?.value;

    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString();

    if (error) {
        const url = new URL('/auth/callback', base);
        url.searchParams.set('platform', 'instagram');
        url.searchParams.set('error', 'instagram_auth_failed');
        url.searchParams.set('message', `Instagram error: ${error}`);
        const resp = NextResponse.redirect(url);
        resp.cookies.delete('instagram_state');
        return resp;
    }

    if (!state || !code || !savedState || state !== savedState) {
        const url = new URL('/auth/callback', base);
        url.searchParams.set('platform', 'instagram');
        url.searchParams.set('error', 'instagram_auth_failed');
        url.searchParams.set('message', 'Invalid authentication callback');
        const resp = NextResponse.redirect(url);
        resp.cookies.delete('instagram_state');
        return resp;
    }

    const verifiedState = verifySignedOAuthAdminState('instagram', state);
    if (!verifiedState.valid) {
        const url = new URL('/auth/callback', base);
        url.searchParams.set('platform', 'instagram');
        url.searchParams.set('error', 'instagram_auth_failed');
        url.searchParams.set('message', `Invalid state: ${verifiedState.reason}`);
        const resp = NextResponse.redirect(url);
        resp.cookies.delete('instagram_state');
        return resp;
    }

    const adminUid = verifiedState.uid;

    const appId = process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.INSTAGRAM_APP_SECRET || process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
        const url = new URL('/auth/callback', base);
        url.searchParams.set('platform', 'instagram');
        url.searchParams.set('error', 'instagram_config_error');
        url.searchParams.set('message', 'Instagram/Facebook credentials not configured');
        const resp = NextResponse.redirect(url);
        resp.cookies.delete('instagram_state');
        return resp;
    }

    try {
        // Use fixed callback URL to match the provider redirect URI exactly
        const callbackUrl = 'https://italosantos.com/api/admin/instagram/callback';

        // Exchange code for access token using Facebook Graph OAuth endpoint
        const tokenUrl = new URL('https://graph.facebook.com/v23.0/oauth/access_token');
        tokenUrl.searchParams.set('client_id', appId);
        tokenUrl.searchParams.set('client_secret', appSecret);
        tokenUrl.searchParams.set('redirect_uri', callbackUrl);
        tokenUrl.searchParams.set('code', code);

        const tokenResponse = await fetch(tokenUrl.toString());
        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok || tokenData.error) {
            console.error('Instagram token exchange failed:', tokenData);
            const url = new URL('/auth/callback', base);
            url.searchParams.set('platform', 'instagram');
            url.searchParams.set('error', 'instagram_token_exchange_failed');
            url.searchParams.set('message', 'Failed to exchange authorization code');
            const resp = NextResponse.redirect(url);
            resp.cookies.delete('instagram_state');
            return resp;
        }

        const { access_token, expires_in } = tokenData;

        // Resolve Instagram Business Account via connected Pages
        // 1) Get pages linked to the user
        const pagesResp = await fetch(`https://graph.facebook.com/v23.0/me/accounts?fields=id,name,instagram_business_account{ig_id,username}&access_token=${access_token}`);
        const pagesData = await pagesResp.json();

        if (!pagesResp.ok || pagesData.error) {
            console.error('Fetch pages failed:', pagesData);
            const url = new URL('/auth/callback', base);
            url.searchParams.set('platform', 'instagram');
            url.searchParams.set('error', 'instagram_pages_fetch_failed');
            url.searchParams.set('message', 'Failed to fetch linked Facebook Pages');
            const resp = NextResponse.redirect(url);
            resp.cookies.delete('instagram_state');
            return resp;
        }

        let igUserId: string | null = null;
        let igUsername: string | null = null;
        let pageId: string | null = null;

        if (Array.isArray(pagesData.data)) {
            for (const page of pagesData.data) {
                if (page.instagram_business_account && page.instagram_business_account.ig_id) {
                    igUserId = page.instagram_business_account.ig_id;
                    igUsername = page.instagram_business_account.username || null;
                    pageId = page.id || null;
                    break;
                }
            }
        }

        if (!igUserId) {
            // Could not resolve an IG business account
            const url = new URL('/auth/callback', base);
            url.searchParams.set('platform', 'instagram');
            url.searchParams.set('error', 'instagram_connection_failed');
            url.searchParams.set('message', 'Nenhuma conta do Instagram de Negócios vinculada a uma Página do Facebook foi encontrada.');
            const resp = NextResponse.redirect(url);
            resp.cookies.delete('instagram_state');
            return resp;
        }

        // If username wasn't present in the page expand, try to fetch directly
        if (!igUsername) {
            const igResp = await fetch(`https://graph.facebook.com/v23.0/${igUserId}?fields=ig_id,username&access_token=${access_token}`);
            const igData = await igResp.json();
            if (igResp.ok && !igData.error) {
                igUsername = igData.username || null;
            }
        }

        // Compute expires_at ISO
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + parseInt(String(expires_in), 10));

        // Store token and IG account info
        const adminApp = getAdminApp();
        if (adminApp) {
            const db = getDatabase(adminApp);
            const ref = db.ref(`admin/integrations/${adminUid}/instagram`);
            await ref.set({
                connected: true,
                admin_uid: adminUid,
                access_token,
                expires_in,
                expires_at: expiresAt.toISOString(),
                user_id: igUserId,
                username: igUsername,
                page_id: pageId,
                connected_at: new Date().toISOString(),
                // Optional placeholders for future refresh tracking
                refresh_token: tokenData.refresh_token || null,
                refresh_token_expires_in: tokenData.refresh_token_expires_in || null,
                last_refresh_at: null,
                updated_at: new Date().toISOString(),
            });
        }

        // Redirect back to the popup callback route so UI can update/toast
        const url = new URL('/auth/callback', base);
        url.searchParams.set('platform', 'instagram');
        url.searchParams.set('success', 'true');
        if (igUsername) url.searchParams.set('username', igUsername);
        const resp = NextResponse.redirect(url);
        resp.cookies.delete('instagram_state');
        return resp;
    } catch (err) {
        console.error('Instagram callback error:', err);
        const url = new URL('/auth/callback', base);
        url.searchParams.set('platform', 'instagram');
        url.searchParams.set('error', 'instagram_server_error');
        url.searchParams.set('message', 'Server error during Instagram authentication');
        const resp = NextResponse.redirect(url);
        resp.cookies.delete('instagram_state');
        return resp;
    }
}
