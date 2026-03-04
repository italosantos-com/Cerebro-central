import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyAppleCalendarConnection } from '@/lib/calendar/apple-calendar';

export async function POST(request: NextRequest) {
  const authResult = await requireAdminApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ success: false, message: 'Firestore Admin não configurado' }, { status: 500 });
  }

  const body = await request.json();
  const { username, appPassword, calendarUrl } = body || {};

  if (!username || !appPassword) {
    return NextResponse.json({ success: false, message: 'Usuário iCloud e senha de app são obrigatórios' }, { status: 400 });
  }

  try {
    const verification = await verifyAppleCalendarConnection({
      username: String(username),
      appPassword: String(appPassword),
      calendarUrl: calendarUrl ? String(calendarUrl) : null
    });

    const docRef = adminDb.collection('admins').doc(authResult.uid).collection('integrations').doc('calendar');
    await docRef.set(
      {
        apple: {
          connected: true,
          username: String(username),
          appPassword: String(appPassword),
          calendarUrl: verification.calendarUrl,
          calendarName: verification.calendarName,
          updatedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, data: verification });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Falha ao conectar Apple Calendar'
    }, { status: 500 });
  }
}
