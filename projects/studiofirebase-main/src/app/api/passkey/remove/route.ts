import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

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
      return Response.json({ removed: true });
    }

    await userRef.set(
      {
        credentials: [],
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return Response.json({ removed: true });
  } catch (error) {
    console.error('[Passkey][Remove] Error:', error);
    return Response.json({ error: 'Falha ao remover passkey' }, { status: 500 });
  }
}