import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getProfileSettings } from '@/app/admin/settings/actions';
import { getAdminDb } from '@/lib/firebase-admin';

async function resolveAdminUidByUsername(username: string): Promise<string | null> {
  const normalized = username.trim().toLowerCase();
  if (!normalized) return null;

  const adminDb = getAdminDb();
  if (!adminDb) return null;

  const snap = await adminDb
    .collection('admins')
    .where('username', '==', normalized)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0].id;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminUid = searchParams.get('adminUid') || undefined;
    const username = searchParams.get('username') || undefined;
    let refererUsername: string | undefined;

    const referer = request.headers.get('referer');
    if (referer) {
      try {
        const pathname = new URL(referer).pathname;
        refererUsername = pathname.match(/^\/([^\/]+)\/admin(\/|$)/)?.[1] || undefined;
      } catch {
        refererUsername = undefined;
      }
    }

    let effectiveAdminUid = adminUid;

    if (!effectiveAdminUid) {
      const candidateUsername = username || refererUsername;
      if (candidateUsername) {
        const resolvedUid = await resolveAdminUidByUsername(candidateUsername);
        if (resolvedUid) effectiveAdminUid = resolvedUid;
      }
    }

    const settings = await getProfileSettings(effectiveAdminUid);

    if (!settings?.paymentSettings) {
      return NextResponse.json({
        pixValue: 99.00
      });
    }

    return NextResponse.json({
      pixValue: settings.paymentSettings.pixValue || 99.00
    });

  } catch (error) {
    console.error('❌ [PIX SETTINGS] Erro ao buscar configurações:', error);
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        pixValue: 99.00
      },
      { status: 500 }
    );
  }
}
