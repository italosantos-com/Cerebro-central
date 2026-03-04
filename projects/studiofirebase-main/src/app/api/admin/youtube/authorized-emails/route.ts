import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { YouTubeAccessService } from '@/services/youtubeAccessService';

type ExportFormat = 'json' | 'txt' | 'csv';

function sanitizeEmails(emails: string[]): string[] {
    return Array.from(new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)));
}

function toTxt(emails: string[]): string {
    return emails.join('\n');
}

function toCsv(emails: string[]): string {
    const rows = ['email', ...emails.map((email) => `"${email.replace(/"/g, '""')}"`)];
    return rows.join('\n');
}

function getContentType(format: ExportFormat): string {
    switch (format) {
        case 'txt':
            return 'text/plain; charset=utf-8';
        case 'csv':
            return 'text/csv; charset=utf-8';
        default:
            return 'application/json; charset=utf-8';
    }
}

function getFilename(format: ExportFormat): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    return `youtube-authorized-emails-${timestamp}.${format}`;
}

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireAdminApiAuth(request);
        if (authResult instanceof NextResponse) return authResult;

        const searchParams = request.nextUrl.searchParams;
        const formatParam = (searchParams.get('format') || 'json').toLowerCase();
        const download = searchParams.get('download') === '1';

        const format: ExportFormat = formatParam === 'txt' || formatParam === 'csv' ? formatParam : 'json';

        const emails = sanitizeEmails(await YouTubeAccessService.getAuthorizedEmails());

        if (format === 'json') {
            return NextResponse.json({
                success: true,
                count: emails.length,
                emails,
                exportedBy: authResult.uid,
                generatedAt: new Date().toISOString(),
            });
        }

        const body = format === 'txt' ? toTxt(emails) : toCsv(emails);
        const headers: Record<string, string> = {
            'Content-Type': getContentType(format),
            'Cache-Control': 'no-store',
        };

        if (download) {
            headers['Content-Disposition'] = `attachment; filename="${getFilename(format)}"`;
        }

        return new NextResponse(body, { status: 200, headers });
    } catch (error) {
        console.error('[YouTube Authorized Emails Export] Error:', error);
        return NextResponse.json(
            {
                success: false,
                message: 'Erro ao exportar emails autorizados do YouTube',
            },
            { status: 500 }
        );
    }
}
