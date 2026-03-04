import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { isInternalRequest } from '@/lib/internal-service-auth';
import { saveChannelMessage } from '@/lib/channel-messages';

async function getTokens(adminUid: string) {
  const adminDb = getAdminDb();
  if (!adminDb) return null;
  const adminDoc = await adminDb.collection('admins').doc(adminUid).get();
  const data = adminDoc.data();
  return data?.twitterCredentials || null;
}

export async function POST(request: NextRequest) {
  const internal = isInternalRequest(request);
  const authResult = internal ? null : await requireAdminApiAuth(request);
  if (!internal && authResult instanceof NextResponse) return authResult;
  const authUid = authResult && !(authResult instanceof NextResponse) ? authResult.uid : null;

  const body = await request.json();
  const { participantId, message, adminUid } = body || {};

  if (!participantId || !message) {
    return NextResponse.json({ success: false, message: 'participantId e message são obrigatórios' }, { status: 400 });
  }

  let effectiveAdminUid = authUid || adminUid;
  if (!effectiveAdminUid) {
    const adminDb = getAdminDb();
    const fallbackEmail = process.env.SUPERADMIN_EMAIL || 'pix@italosantos.com';
    if (adminDb) {
      const snap = await adminDb.collection('admins').where('email', '==', fallbackEmail).limit(1).get();
      if (!snap.empty) {
        effectiveAdminUid = snap.docs[0].id;
      }
    }
  }

  if (!effectiveAdminUid) {
    return NextResponse.json({ success: false, message: 'Admin UID nao encontrado.' }, { status: 401 });
  }

  const tokens = await getTokens(effectiveAdminUid);
  const accessToken = tokens?.accessToken || process.env.TWITTER_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json({ success: false, message: 'Tokens do X não encontrados. Conecte sua conta em Admin > Integrações.' }, { status: 400 });
  }

  const dmResponse = await fetch(`https://api.x.com/2/dm_conversations/with/${encodeURIComponent(participantId)}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text: String(message) })
  });

  if (!dmResponse.ok) {
    const err = await dmResponse.json().catch(() => ({}));
    return NextResponse.json({ success: false, message: 'Falha ao enviar DM no X', details: err }, { status: dmResponse.status });
  }

  const dm = await dmResponse.json();

  const created = await saveChannelMessage({
    adminUid: effectiveAdminUid,
    channel: 'twitter',
    externalId: dm?.data?.dm_event_id || null,
    sender: 'admin',
    recipient: participantId,
    conversationId: participantId,
    text: String(message),
    read: true,
    metadata: dm as any,
  });

  return NextResponse.json({ success: true, message: created, provider: dm });
}
