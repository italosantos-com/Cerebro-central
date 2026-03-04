import { createHmac, timingSafeEqual } from 'crypto';

type SupportedProvider = 'google' | 'paypal' | 'facebook' | 'instagram' | 'mercadopago' | 'twitter' | 'stripe';

type OAuthAdminStatePayload = {
  uid: string;
  provider: SupportedProvider;
  nonce: string;
  iat: number;
};

function getStateSecret(): string {
  const secret = process.env.OAUTH_STATE_SECRET || process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('OAuth state secret não configurado (OAUTH_STATE_SECRET/NEXTAUTH_SECRET/JWT_SECRET)');
  }
  return secret;
}

function signPayload(encodedPayload: string, secret: string): string {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

function safeJsonParse(value: string): OAuthAdminStatePayload | null {
  try {
    return JSON.parse(value) as OAuthAdminStatePayload;
  } catch {
    return null;
  }
}

export function createSignedOAuthAdminState(provider: SupportedProvider, uid: string): string {
  const payload: OAuthAdminStatePayload = {
    uid,
    provider,
    nonce: Math.random().toString(36).slice(2),
    iat: Math.floor(Date.now() / 1000),
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = signPayload(encodedPayload, getStateSecret());
  return `${encodedPayload}.${signature}`;
}

export function verifySignedOAuthAdminState(
  expectedProvider: SupportedProvider,
  state: string,
  maxAgeSeconds = 60 * 15
): { valid: true; uid: string } | { valid: false; reason: string } {
  const [encodedPayload, signature] = state.split('.');
  if (!encodedPayload || !signature) {
    return { valid: false, reason: 'state malformado' };
  }

  let expectedSignature: string;
  try {
    expectedSignature = signPayload(encodedPayload, getStateSecret());
  } catch {
    return { valid: false, reason: 'secret de state ausente' };
  }

  const sigA = Buffer.from(signature);
  const sigB = Buffer.from(expectedSignature);
  if (sigA.length !== sigB.length || !timingSafeEqual(sigA, sigB)) {
    return { valid: false, reason: 'assinatura inválida' };
  }

  const payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf8');
  const payload = safeJsonParse(payloadJson);
  if (!payload) {
    return { valid: false, reason: 'payload inválido' };
  }

  if (payload.provider !== expectedProvider) {
    return { valid: false, reason: 'provider inválido' };
  }

  if (!payload.uid || typeof payload.uid !== 'string') {
    return { valid: false, reason: 'uid ausente' };
  }

  if (!payload.iat || typeof payload.iat !== 'number') {
    return { valid: false, reason: 'iat inválido' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (now - payload.iat > maxAgeSeconds) {
    return { valid: false, reason: 'state expirado' };
  }

  return { valid: true, uid: payload.uid };
}