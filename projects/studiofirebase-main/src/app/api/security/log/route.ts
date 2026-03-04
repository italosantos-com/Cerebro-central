import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { createHash } from 'crypto';

type SecurityEventPayload = {
  eventType?: string;
  scope?: string;
  path?: string;
  userId?: string | null;
};

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as SecurityEventPayload;
    const adminDb = getAdminDb();

    if (!adminDb) {
      return NextResponse.json({ success: false }, { status: 500 });
    }

    const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
    const ipValue = ipHeader.split(',')[0]?.trim() || '';
    const userAgent = request.headers.get('user-agent') || '';

    const payload = {
      eventType: String(body.eventType || 'unknown'),
      scope: String(body.scope || 'unknown'),
      path: String(body.path || ''),
      userHash: body.userId ? hashValue(String(body.userId)) : null,
      ipHash: ipValue ? hashValue(ipValue) : null,
      userAgentHash: userAgent ? hashValue(userAgent) : null,
      createdAt: new Date().toISOString(),
    };

    await adminDb.collection('security_events').add(payload);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Security Log] Erro ao registrar evento:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
