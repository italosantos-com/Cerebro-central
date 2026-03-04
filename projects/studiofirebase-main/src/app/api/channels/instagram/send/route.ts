import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import { isInternalRequest } from '@/lib/internal-service-auth';
import { getDatabase } from 'firebase-admin/database';
import { saveChannelMessage } from '@/lib/channel-messages';

async function getAccessToken(adminUid: string) {
  const adminApp = getAdminApp();
  if (!adminApp) return null;
  const db = getDatabase(adminApp);
  const snap = await db.ref(`admin/integrations/${adminUid}/instagram`).get();
  return snap?.val()?.access_token || null;
}

export async function POST(request: NextRequest) {
  const internal = isInternalRequest(request);
  const authResult = internal ? null : await requireAdminApiAuth(request);
  if (!internal && authResult instanceof NextResponse) return authResult;
  const authUid = authResult && !(authResult instanceof NextResponse) ? authResult.uid : null;

  const body = await request.json();
  const { participantId, message, accessToken, igUserId, adminUid } = body || {};

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

  const token = accessToken || (await getAccessToken(effectiveAdminUid));
  if (!token) {
    return NextResponse.json({ success: false, message: 'Access token do Instagram não encontrado.' }, { status: 500 });
  }

  const targetIgUserId = igUserId || participantId;

  const response = await fetch(`https://graph.facebook.com/v19.0/${targetIgUserId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      recipient: { id: participantId },
      message: { text: message }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json({ success: false, message: data?.error?.message || 'Falha ao enviar Direct', data }, { status: 500 });
  }

  const created = await saveChannelMessage({
    adminUid: effectiveAdminUid,
    channel: 'instagram',
    externalId: data?.message_id || null,
    sender: 'admin',
    recipient: participantId,
    conversationId: participantId,
    text: String(message),
    read: true,
    metadata: data,
  });

  return NextResponse.json({ success: true, message: created, provider: data });
}
