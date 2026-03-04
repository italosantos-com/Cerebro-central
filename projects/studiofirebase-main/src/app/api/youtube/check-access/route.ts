import { NextRequest, NextResponse } from 'next/server';
import { YouTubeAccessService } from '@/services/youtubeAccessService';

/**
 * API para verificar se um email tem acesso a vídeos privados +18
 * GET /api/youtube/check-access?email=user@example.com
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const hasAccess = await YouTubeAccessService.checkAccess(email);
        const details = await YouTubeAccessService.getAccessDetails(email);

        return NextResponse.json({
            hasAccess,
            email,
            details,
        });
    } catch (error) {
        console.error('Erro ao verificar acesso:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * API para obter lista de todos os emails autorizados
 * POST /api/youtube/check-access
 * Body: { adminToken: "secret" }
 */
export async function POST(req: NextRequest) {
    try {
        const { adminToken } = await req.json();

        // Verificar autenticação admin
        if (adminToken !== process.env.ADMIN_SECRET_TOKEN) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const authorizedEmails = await YouTubeAccessService.getAuthorizedEmails();
        const detailedList = await YouTubeAccessService.exportDetailedList();
        const emailsList = await YouTubeAccessService.exportAuthorizedEmailsList();

        return NextResponse.json({
            count: authorizedEmails.length,
            emails: authorizedEmails,
            detailed: detailedList,
            exportText: emailsList,
        });
    } catch (error) {
        console.error('Erro ao buscar lista:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
