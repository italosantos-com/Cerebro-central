import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { getAdminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  const authResult = await requireAdminApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ success: false, message: 'Firestore Admin não configurado' }, { status: 500 });
  }

  const docRef = adminDb.collection('admins').doc(authResult.uid).collection('integrations').doc('calendar');
  await docRef.set(
    {
      google: {
        connected: false,
        accessToken: null,
        refreshToken: null,
        expiryDate: null,
        calendarId: 'primary',
        updatedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );

  return NextResponse.json({ success: true });
}
