import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import { isInternalRequest } from '@/lib/internal-service-auth';
import { getDatabase } from 'firebase-admin/database';
import { saveChannelMessage } from '@/lib/channel-messages';

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

  const adminApp = getAdminApp();
  if (!adminApp) {
    return NextResponse.json({ success: false, message: 'Admin app não inicializado.' }, { status: 500 });
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

  const db = getDatabase(adminApp);
  const integrationSnap = await db.ref(`admin/integrations/${effectiveAdminUid}/whatsapp`).get();
  const integration = integrationSnap.val() || {};

  const apiVersion = process.env.WHATSAPP_API_VERSION || integration.api_version || 'v23.0';
  const apiUrl = process.env.WHATSAPP_API_URL || `https://graph.facebook.com/${apiVersion}`;
  const accessToken = integration.access_token || process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = integration.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!apiUrl || !accessToken || !phoneNumberId) {
    return NextResponse.json({
      success: false,
      message: 'Configuração do WhatsApp Business não encontrada.'
    }, { status: 500 });
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: participantId,
    type: 'text',
    text: { body: message }
  };

  const response = await fetch(`${apiUrl}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json({ success: false, message: data?.error?.message || 'Falha ao enviar WhatsApp', data }, { status: 500 });
  }

  const created = await saveChannelMessage({
    adminUid: effectiveAdminUid,
    channel: 'whatsapp',
    externalId: data?.messages?.[0]?.id || null,
    sender: 'admin',
    recipient: participantId,
    conversationId: participantId,
    text: String(message),
    read: true,
    metadata: data,
  });

  return NextResponse.json({ success: true, message: created, provider: data });
}
