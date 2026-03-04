import { adminDb } from '@/lib/firebase-admin';

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
  credentials?: StoredCredential[];
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
      return Response.json({ hasPasskey: false });
    }

    const userData = userDoc.data() as PasskeyUserDoc;
    const credentials = userData.credentials || [];

    return Response.json({ hasPasskey: credentials.length > 0 });
  } catch (error) {
    console.error('[Passkey][Status] Error:', error);
    return Response.json({ error: 'Falha ao consultar status de passkey' }, { status: 500 });
  }
}