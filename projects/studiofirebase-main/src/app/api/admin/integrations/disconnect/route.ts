import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';

type Integration = 'twitter' | 'instagram' | 'facebook' | 'paypal' | 'mercadopago' | 'whatsapp' | 'stripe' | 'youtube';

export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAdminApiAuth(req);
        if (authResult instanceof NextResponse) return authResult;

        const body = await req.json().catch(() => ({}));
        const platform: Integration = body.platform;
        if (!platform) return NextResponse.json({ success: false, message: 'Missing platform' }, { status: 400 });

        const adminApp = getAdminApp();
        if (!adminApp) return NextResponse.json({ success: false, message: 'Admin app not initialized' }, { status: 500 });

        const db = getDatabase(adminApp);
        const ref = db.ref(`admin/integrations/${authResult.uid}`).child(platform);
        const updateValue = (platform === 'twitter' || platform === 'mercadopago' || platform === 'paypal' || platform === 'whatsapp' || platform === 'stripe') ? null : false;
        await ref.set(updateValue);

        if (platform === 'youtube') {
            const adminDb = getAdminDb();
            if (!adminDb) return NextResponse.json({ success: false, message: 'Firestore Admin não configurado' }, { status: 500 });

            await adminDb.collection('admins').doc(authResult.uid).set({
                youtube: {
                    accessToken: null,
                    updatedAt: new Date().toISOString()
                }
            }, { merge: true });
        }

        return NextResponse.json({ success: true, message: `${platform} disconnected successfully.` });
    } catch (e: any) {
        return NextResponse.json({ success: false, message: e?.message || 'Failed to disconnect' }, { status: 500 });
    }
}
