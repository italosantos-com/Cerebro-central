import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { VerifiedRegistrationResponse } from '@simplewebauthn/server';
import { adminDb } from '@/lib/firebase-admin';
import { ORIGIN, RP_ID } from '@/lib/env';
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
  createdAt?: string;
  updatedAt?: string;
};

async function resolvePasskeyIdentityByEmail(email: string): Promise<{ userId: string; role: string }> {
  if (!adminDb) {
    return { userId: crypto.randomUUID(), role: 'user' };
  }

  const adminByEmail = await adminDb
    .collection('admins')
    .where('email', '==', email)
    .limit(1)
    .get();

  if (!adminByEmail.empty) {
    return { userId: adminByEmail.docs[0].id, role: 'admin' };
  }

  return { userId: crypto.randomUUID(), role: 'user' };
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

    const verification = (await verifyRegistrationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    })) as VerifiedRegistrationResponse;

    if (!verification.verified || !verification.registrationInfo) {
      await clearPasskeyCookies();
      return Response.json({ verified: false }, { status: 400 });
    }

    const userRef = adminDb.collection('passkey_users').doc(email);
    const userDoc = await userRef.get();
    const userData = (userDoc.exists ? (userDoc.data() as PasskeyUserDoc) : null);

    const currentCredentials = userData?.credentials || [];
    const { credential, credentialBackedUp, credentialDeviceType } = verification.registrationInfo;
    const resolvedIdentity = await resolvePasskeyIdentityByEmail(email);

    const credentialId = credential.id;
    const credentialPublicKey = Buffer.from(credential.publicKey).toString('base64url');

    const alreadyExists = currentCredentials.some((c) => c.id === credentialId);

    const nextCredentials = alreadyExists
      ? currentCredentials
      : [
          ...currentCredentials,
          {
            id: credentialId,
            publicKey: credentialPublicKey,
            counter: credential.counter,
            transports: credential.transports,
            deviceType: credentialDeviceType,
            backedUp: credentialBackedUp,
          },
        ];

    await userRef.set(
      {
        userId: userData?.userId || resolvedIdentity.userId,
        email,
        role: userData?.role || resolvedIdentity.role,
        credentials: nextCredentials,
        createdAt: userData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    await clearPasskeyCookies();

    return Response.json({ verified: true });
  } catch (error) {
    console.error('[Passkey][Register Verify] Error:', error);
    await clearPasskeyCookies();
    return Response.json({ verified: false, error: 'Falha ao validar registro de passkey' }, { status: 400 });
  }
}
