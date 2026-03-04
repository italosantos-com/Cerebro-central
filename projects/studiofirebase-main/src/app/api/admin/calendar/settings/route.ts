import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { getAdminDb } from '@/lib/firebase-admin';

const defaultResponse = {
  syncEnabled: false,
  google: { connected: false },
  apple: { connected: false }
};

export async function GET(request: NextRequest) {
  const authResult = await requireAdminApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ success: false, message: 'Firestore Admin não configurado' }, { status: 500 });
  }

  const docRef = adminDb.collection('admins').doc(authResult.uid).collection('integrations').doc('calendar');
  const snap = await docRef.get();

  if (!snap.exists) {
    return NextResponse.json({ success: true, data: defaultResponse });
  }

  const data = snap.data() || {};

  return NextResponse.json({
    success: true,
    data: {
      syncEnabled: Boolean(data.syncEnabled),
      google: {
        connected: Boolean(data.google?.connected),
        calendarId: data.google?.calendarId || 'primary',
        email: data.google?.email || null
      },
      apple: {
        connected: Boolean(data.apple?.connected),
        username: data.apple?.username || null,
        calendarUrl: data.apple?.calendarUrl || null,
        calendarName: data.apple?.calendarName || null
      }
    }
  });
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdminApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ success: false, message: 'Firestore Admin não configurado' }, { status: 500 });
  }

  const body = await request.json();
  const { syncEnabled, google, apple } = body || {};

  const updateData: Record<string, any> = {
    updatedAt: new Date().toISOString()
  };

  if (typeof syncEnabled === 'boolean') {
    updateData.syncEnabled = syncEnabled;
  }

  if (google?.calendarId) {
    updateData['google.calendarId'] = String(google.calendarId);
  }

  if (apple?.calendarUrl !== undefined) {
    updateData['apple.calendarUrl'] = apple.calendarUrl ? String(apple.calendarUrl) : null;
  }

  const docRef = adminDb.collection('admins').doc(authResult.uid).collection('integrations').doc('calendar');
  await docRef.set(updateData, { merge: true });

  return NextResponse.json({ success: true });
}
