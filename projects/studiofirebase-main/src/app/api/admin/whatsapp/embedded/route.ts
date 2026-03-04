import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';

const DEFAULT_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v23.0';

function resolveAppId() {
  return process.env.FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';
}

function resolveAppSecret() {
  return process.env.FACEBOOK_APP_SECRET || '';
}

function resolveRedirectUri(request: NextRequest) {
  return (
    process.env.WHATSAPP_EMBEDDED_SIGNUP_REDIRECT_URI ||
    process.env.NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_REDIRECT_URI ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    request.nextUrl.origin
  );
}

async function exchangeCodeForToken(code: string, request: NextRequest) {
  const appId = resolveAppId();
  const appSecret = resolveAppSecret();

  if (!appId || !appSecret) {
    throw new Error('FACEBOOK_APP_ID/FACEBOOK_APP_SECRET não configurados');
  }

  const tokenUrl = new URL(`https://graph.facebook.com/${DEFAULT_API_VERSION}/oauth/access_token`);
  tokenUrl.searchParams.set('client_id', appId);
  tokenUrl.searchParams.set('client_secret', appSecret);
  tokenUrl.searchParams.set('code', code);

  const redirectUri = resolveRedirectUri(request);
  if (redirectUri) {
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
  }

  const response = await fetch(tokenUrl.toString());
  const data = await response.json();

  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || 'Falha ao trocar code por token');
  }

  return data as {
    access_token: string;
    token_type?: string;
    expires_in?: number;
  };
}

async function fetchWabaId(accessToken: string) {
  const url = new URL(`https://graph.facebook.com/${DEFAULT_API_VERSION}/me/whatsapp_business_accounts`);
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || 'Falha ao buscar WABA');
  }

  const waba = Array.isArray(data?.data) ? data.data[0] : null;
  return waba?.id || null;
}

async function fetchPhoneNumber(accessToken: string, wabaId: string) {
  const url = new URL(`https://graph.facebook.com/${DEFAULT_API_VERSION}/${wabaId}/phone_numbers`);
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || 'Falha ao buscar phone_number_id');
  }

  const phone = Array.isArray(data?.data) ? data.data[0] : null;
  return phone
    ? {
        id: phone?.id || null,
        display_phone_number: phone?.display_phone_number || null,
      }
    : null;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminApiAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { code, waba_id } = body || {};

    if (!code) {
      return NextResponse.json({ ok: false, error: 'code é obrigatório' }, { status: 400 });
    }

    const token = await exchangeCodeForToken(code, request);
    const accessToken = token.access_token;

    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'Access token não retornado' }, { status: 500 });
    }

    const resolvedWabaId = waba_id || (await fetchWabaId(accessToken));

    if (!resolvedWabaId) {
      return NextResponse.json({ ok: false, error: 'WABA ID não encontrado' }, { status: 404 });
    }

    const phone = await fetchPhoneNumber(accessToken, resolvedWabaId);
    const phoneNumberId = phone?.id || null;
    const displayPhoneNumber = phone?.display_phone_number || null;

    if (!phoneNumberId) {
      return NextResponse.json({ ok: false, error: 'phone_number_id não encontrado' }, { status: 404 });
    }

    const adminApp = getAdminApp();
    if (!adminApp) {
      return NextResponse.json({ ok: false, error: 'Admin app não inicializado' }, { status: 500 });
    }

    const db = getDatabase(adminApp);
    const ref = db.ref(`admin/integrations/${authResult.uid}/whatsapp`);

    const expiresAt = token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : null;

    const payload = {
      connected: true,
      access_token: accessToken,
      token_type: token.token_type || null,
      expires_in: token.expires_in || null,
      expires_at: expiresAt,
      waba_id: resolvedWabaId,
      phone_number_id: phoneNumberId,
      display_phone_number: displayPhoneNumber,
      source: 'embedded_signup',
      updated_at: new Date().toISOString(),
    };

    await ref.set(payload);

    return NextResponse.json({ ok: true, integration: payload });
  } catch (error: any) {
    console.error('[WhatsApp][Embedded] Erro:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao concluir embedded signup' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminApiAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const adminApp = getAdminApp();
    if (!adminApp) {
      return NextResponse.json({ ok: false, error: 'Admin app não inicializado' }, { status: 500 });
    }

    const db = getDatabase(adminApp);
    const snapshot = await db.ref(`admin/integrations/${authResult.uid}/whatsapp`).get();
    const data = snapshot.val();

    return NextResponse.json({ ok: true, integration: data || null });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao buscar integração' },
      { status: 500 }
    );
  }
}
