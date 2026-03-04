import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { saveChannelMessage } from '@/lib/channel-messages';

function getVerificationToken() {
  return process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';
}

async function resolveAdminUidByPageId(pageId: string) {
  const adminApp = getAdminApp();
  if (!adminApp) return null;
  const db = getDatabase(adminApp);
  const snapshot = await db.ref('admin/integrations').get();
  const integrations = snapshot.val() || {};

  for (const [uid, platforms] of Object.entries<any>(integrations)) {
    const fb = platforms?.facebook;
    if (fb?.user_id === pageId || fb?.page_id === pageId) {
      return uid;
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token && token === getVerificationToken()) {
    return new NextResponse(challenge || '', { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const entries = body?.entry || [];

  for (const entry of entries) {
    const pageId = entry.id;
    const adminUid = await resolveAdminUidByPageId(pageId);
    if (!adminUid) continue;

    const messaging = entry.messaging || [];
    for (const item of messaging) {
      const senderId = item?.sender?.id;
      const recipientId = item?.recipient?.id;
      const text = item?.message?.text || '';

      if (!senderId || !text) continue;

      await saveChannelMessage({
        adminUid,
        channel: 'facebook',
        externalId: item?.message?.mid || null,
        sender: senderId,
        recipient: recipientId || null,
        conversationId: senderId,
        text,
        read: false,
        metadata: item,
      });
    }
  }

  return NextResponse.json({ success: true });
}
