import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { isInternalRequest } from '@/lib/internal-service-auth';
import { sendRawEmail } from '@/lib/emails/sendEmail';

async function resolveAdminRecipients(requested: string[] | undefined) {
    if (requested && requested.length > 0) return requested;

    const adminDb = getAdminDb();
    if (!adminDb) return [] as string[];

    const snap = await adminDb.collection('admins').get();
    const emails = snap.docs
        .map((doc) => doc.data()?.email)
        .filter((email) => typeof email === 'string' && email.includes('@')) as string[];

    return Array.from(new Set(emails));
}

export async function POST(request: NextRequest) {
    const internal = isInternalRequest(request);
    let adminUid: string | null = null;

    if (!internal) {
        const authResult = await requireAdminApiAuth(request);
        if (authResult instanceof NextResponse) return authResult;
        adminUid = authResult.uid;
    }

    try {
        const body = await request.json();
        const toRaw = body?.to;
        const subject = body?.subject;
        const html = body?.html;
        const text = body?.text;

        if (!subject || (!html && !text)) {
            return NextResponse.json(
                { success: false, message: 'subject e html (ou text) sao obrigatorios' },
                { status: 400 }
            );
        }

        const requested = Array.isArray(toRaw)
            ? toRaw.filter((email: string) => typeof email === 'string')
            : typeof toRaw === 'string'
                ? [toRaw]
                : undefined;

        const recipients = await resolveAdminRecipients(requested);
        if (recipients.length === 0) {
            return NextResponse.json(
                { success: false, message: 'Nenhum email de admin encontrado' },
                { status: 400 }
            );
        }

        const results = await Promise.all(
            recipients.map((email) =>
                sendRawEmail({
                    to: email,
                    subject: String(subject),
                    html: html ? String(html) : `<pre>${String(text)}</pre>`,
                    text: text ? String(text) : undefined,
                })
            )
        );

        return NextResponse.json({
            success: results.every((r) => r.success),
            adminUid,
            recipients,
            results,
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error?.message || 'Erro ao enviar notificacao' },
            { status: 500 }
        );
    }
}
