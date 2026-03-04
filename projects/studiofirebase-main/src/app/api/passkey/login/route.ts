import { generateAuthenticationOptions } from '@simplewebauthn/server';
import type { PublicKeyCredentialDescriptorJSON } from '@simplewebauthn/server';
import { adminDb } from '@/lib/firebase-admin';
import { RP_ID } from '@/lib/env';
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

    if (!userDoc.exists) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const userData = userDoc.data() as PasskeyUserDoc;
    const credentials = userData.credentials || [];

    if (!credentials.length) {
      return Response.json({ error: 'Nenhuma passkey cadastrada para este usuário' }, { status: 404 });
    }

    const allowCredentials: PublicKeyCredentialDescriptorJSON[] = credentials.map((credential) => ({
      id: credential.id,
      type: 'public-key',
      transports: credential.transports as PublicKeyCredentialDescriptorJSON['transports'],
    }));

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials,
      userVerification: 'preferred',
    });

    await setPasskeyChallengeCookie(options.challenge);
    await setPasskeyEmailCookie(normalizedEmail);

    return Response.json(options);
  } catch (error) {
    console.error('[Passkey][Login] Error generating auth options:', error);
    return Response.json({ error: 'Falha ao iniciar login com passkey' }, { status: 500 });
  }
}
