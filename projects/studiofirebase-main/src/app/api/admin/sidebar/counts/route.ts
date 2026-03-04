import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
    const authResult = await requireAdminApiAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const emptyCounts = {
        reports: 0,
        subscribers: 0,
        fraudAlerts: 0,
    };

    const adminDb = getAdminDb();
    if (!adminDb) {
        return NextResponse.json(
            {
                success: true,
                data: emptyCounts,
                degraded: true,
                message: 'Firestore Admin não configurado',
            }
        );
    }

    try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const safeCount = async (label: string, op: () => Promise<number>) => {
            try {
                return await op();
            } catch (error) {
                console.warn(`[admin/sidebar/counts] Falha ao contar ${label}:`, error);
                return 0;
            }
        };

        const [reports, subscribers, fraudAlerts] = await Promise.all([
            safeCount('denuncias', async () => {
                const snap = await adminDb.collection('admin_reports').where('status', '==', 'open').count().get();
                return snap.data().count || 0;
            }),
            safeCount('novos_assinantes', async () => {
                const snap = await adminDb
                    .collection('subscribers')
                    .where('status', '==', 'active')
                    .where('createdAt', '>=', since)
                    .count()
                    .get();
                return snap.data().count || 0;
            }),
            safeCount('alertas_fraude', async () => {
                const snap = await adminDb
                    .collection('admin_fraud_alerts')
                    .where('status', '==', 'open')
                    .where('recipients', 'array-contains', authResult.uid)
                    .count()
                    .get();
                return snap.data().count || 0;
            }),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                reports,
                subscribers,
                fraudAlerts,
            },
        });
    } catch (error: any) {
        console.error('[admin/sidebar/counts] Error:', error);
        return NextResponse.json(
            {
                success: true,
                data: emptyCounts,
                degraded: true,
                message: error instanceof Error ? error.message : 'Erro ao carregar contagens',
            },
        );
    }
}
