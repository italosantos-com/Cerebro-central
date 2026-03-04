import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { VerifiedAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/types';
import { cookies } from 'next/headers';
import { adminDb } from '@/lib/firebase-admin';
import { ORIGIN, RP_ID } from '@/lib/env';
import { createSessionToken } from '@/lib/jwt';
import {
  clearPasskeyCookies,
  getPasskeyChallengeCookie,
  getPasskeyEmailCookie,
} from '@/utils/cookies';

export const runtime = 'nodejs';

type StoredCredential = {
  id: string;
  publicKey: string;
  counter: number;
  transports?: string[];
  deviceType?: string;
  backedUp?: boolean;
};

type PasskeyUserDoc = {
  userId: string;
  email: string;
  role?: string;
  credentials: StoredCredential[];
  updatedAt?: string;
};

async function resolvePasskeyIdentityByEmail(email: string, fallbackUid: string): Promise<{ userId: string; role: string }> {
  if (!adminDb) {
    return { userId: fallbackUid, role: 'user' };
  }

  const adminByEmail = await adminDb
    .collection('admins')
    .where('email', '==', email)
    .limit(1)
    .get();

  if (!adminByEmail.empty) {
    return { userId: adminByEmail.docs[0].id, role: 'admin' };
  }

  return { userId: fallbackUid, role: 'user' };
}

function secureCookie(): boolean {
  return process.env.NODE_ENV === 'production';
}

export async function POST(req: Request) {
  try {
    if (!adminDb) {
      return Response.json({ error: 'Firebase Admin indisponível' }, { status: 500 });
    }

    const challenge = await getPasskeyChallengeCookie();
    const email = await getPasskeyEmailCookie();

    if (!challenge || !email) {
      return Response.json({ error: 'Challenge expirado ou inválido' }, { status: 400 });
    }

    const body = await req.json();

    const userRef = adminDb.collection('passkey_users').doc(email);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await clearPasskeyCookies();
      return Response.json({ verified: false, error: 'Usuário não encontrado' }, { status: 404 });
    }

    const userData = userDoc.data() as PasskeyUserDoc;
    const credentials = userData.credentials || [];

    const credential = credentials.find((item) => item.id === body.id);
    if (!credential) {
      await clearPasskeyCookies();
      return Response.json({ verified: false, error: 'Credencial não encontrada' }, { status: 401 });
    }

    const verification = (await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
      credential: {
        id: credential.id,
        publicKey: Buffer.from(credential.publicKey, 'base64url'),
        counter: credential.counter,
        transports: credential.transports as AuthenticatorTransportFuture[] | undefined,
      },
    })) as VerifiedAuthenticationResponse;

    if (!verification.verified) {
      await clearPasskeyCookies();
      return Response.json({ verified: false }, { status: 401 });
    }

    const newCounter = verification.authenticationInfo.newCounter;
    const resolvedIdentity = await resolvePasskeyIdentityByEmail(userData.email, userData.userId);
    const updatedCredentials = credentials.map((item) =>
      item.id === credential.id
        ? { ...item, counter: newCounter }
        : item
    );

    await userRef.set(
      {
        ...userData,
        userId: resolvedIdentity.userId,
        role: resolvedIdentity.role,
        credentials: updatedCredentials,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    const sessionToken = createSessionToken({
      uid: resolvedIdentity.userId,
      email: userData.email,
      role: resolvedIdentity.role,
    });

    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: secureCookie(),
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    await clearPasskeyCookies();

    return Response.json({
      verified: true,
      user: {
        uid: resolvedIdentity.userId,
        email: userData.email,
        role: resolvedIdentity.role,
      },
    });
  } catch (error) {
    console.error('[Passkey][Login Verify] Error:', error);
    await clearPasskeyCookies();
    return Response.json({ verified: false, error: 'Falha ao verificar login com passkey' }, { status: 401 });
  }
}
