import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { saveChannelMessage } from '@/lib/channel-messages';

async function resolveAdminUidByTwitterUserId(twitterUserId: string) {
  const adminApp = getAdminApp();
  if (!adminApp) return null;
  const db = getDatabase(adminApp);
  const snapshot = await db.ref('admin/integrations').get();
  const integrations = snapshot.val() || {};

  for (const [uid, platforms] of Object.entries<any>(integrations)) {
    const tw = platforms?.twitter;
    if (tw?.user_id === twitterUserId) {
      return uid;
    }
  }
  return null;
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const events = body?.direct_message_events || [];
  const forUserId = body?.for_user_id;

  if (!forUserId) {
    return NextResponse.json({ success: true });
  }

  const adminUid = await resolveAdminUidByTwitterUserId(forUserId);
  if (!adminUid) {
    return NextResponse.json({ success: true });
  }

  for (const event of events) {
    const senderId = event?.message_create?.sender_id;
    const recipientId = event?.message_create?.target?.recipient_id;
    const text = event?.message_create?.message_data?.text || '';

    if (!senderId || !text) continue;

    const conversationId = senderId === forUserId ? (recipientId || senderId) : senderId;

    await saveChannelMessage({
      adminUid,
      channel: 'twitter',
      externalId: event?.id || null,
      sender: senderId,
      recipient: recipientId || null,
      conversationId,
      text,
      read: false,
      metadata: event,
    });
  }

  return NextResponse.json({ success: true });
}
