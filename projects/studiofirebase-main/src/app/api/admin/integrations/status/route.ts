import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';

type Integration = 'twitter' | 'instagram' | 'facebook' | 'paypal' | 'mercadopago' | 'whatsapp' | 'stripe' | 'youtube';

export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAdminApiAuth(req);
        if (authResult instanceof NextResponse) return authResult;

        const url = new URL(req.url);
        const servicesParam = url.searchParams.get('services');
        const services: Integration[] = servicesParam
            ? (servicesParam.split(',').map(s => s.trim()) as Integration[])
            : ['twitter', 'instagram', 'facebook', 'paypal', 'mercadopago', 'whatsapp', 'stripe', 'youtube'];

        const adminApp = getAdminApp();
        if (!adminApp) {
            console.error('[integrations/status] Admin app not initialized');
            return NextResponse.json({ ok: false, error: 'Admin app not initialized' }, { status: 500 });
        }

        const db = getDatabase(adminApp);
        const ref = db.ref(`admin/integrations/${authResult.uid}`);
        const snapshot = await ref.once('value');
        const data = snapshot.val() || {};

        const result: Record<string, any> = {};
        for (const s of services) {
            if (s === 'youtube') {
                result[s] = !!authResult.adminDoc?.youtube?.accessToken;
                continue;
            }
            const v = data[s];
            if (s === 'twitter' && v && typeof v === 'object') {
                result[s] = { connected: !!v.connected, screen_name: v.screen_name };
            } else if (s === 'whatsapp' && v && typeof v === 'object') {
                result[s] = {
                    connected: !!v.connected,
                    phone_number_id: v.phone_number_id || null,
                    waba_id: v.waba_id || null,
                };
            } else if (typeof v === 'object') {
                result[s] = !!v.connected;
            } else {
                result[s] = !!v;
            }
        }

        return NextResponse.json({ ok: true, status: result });
    } catch (e: any) {
        console.error('[integrations/status] Error:', e);
        return NextResponse.json({ ok: false, error: e?.message || 'Failed to fetch status' }, { status: 500 });
    }
}
