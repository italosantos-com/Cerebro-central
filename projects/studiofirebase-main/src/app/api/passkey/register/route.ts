import { generateRegistrationOptions } from '@simplewebauthn/server';
import type { PublicKeyCredentialDescriptorJSON } from '@simplewebauthn/server';
import { adminDb } from '@/lib/firebase-admin';
import { RP_ID, RP_NAME } from '@/lib/env';
import { setPasskeyChallengeCookie, setPasskeyEmailCookie } from '@/utils/cookies';

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

export async function POST(req: Request) {
  try {
    if (!adminDb) {
      return Response.json({ error: 'Firebase Admin indisponível' }, { status: 500 });
    }

    const { email } = await req.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return Response.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    const userRef = adminDb.collection('passkey_users').doc(normalizedEmail);
    const userDoc = await userRef.get();
    const userData = (userDoc.exists ? (userDoc.data() as PasskeyUserDoc) : null);

    const userId = userData?.userId || crypto.randomUUID();
    const credentials = userData?.credentials || [];

    const excludeCredentials: PublicKeyCredentialDescriptorJSON[] = credentials.map((credential) => ({
      id: credential.id,
      type: 'public-key',
      transports: credential.transports as PublicKeyCredentialDescriptorJSON['transports'],
    }));

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: new TextEncoder().encode(userId),
      userName: normalizedEmail,
      userDisplayName: normalizedEmail,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      supportedAlgorithmIDs: [-7, -257],
      excludeCredentials,
    });

    await setPasskeyChallengeCookie(options.challenge);
    await setPasskeyEmailCookie(normalizedEmail);

    return Response.json(options);
  } catch (error) {
    console.error('[Passkey][Register] Error generating options:', error);
    return Response.json({ error: 'Falha ao iniciar registro de passkey' }, { status: 500 });
  }
}
