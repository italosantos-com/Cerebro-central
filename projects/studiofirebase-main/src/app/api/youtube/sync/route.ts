import { NextRequest, NextResponse } from 'next/server';
import { YouTubeAccessService } from '@/services/youtubeAccessService';

/**
 * API para sincronizar manualmente todos os acessos
 * POST /api/youtube/sync
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

    console.log('🔄 Iniciando sincronização manual...');

    const result = await YouTubeAccessService.syncWithActiveSubscriptions();

    console.log(`✅ Sincronização concluída: ${result.granted} concedidos, ${result.revoked} revogados`);

    return NextResponse.json({
      success: true,
      granted: result.granted,
      revoked: result.revoked,
      message: `Sincronização concluída: ${result.granted} acessos concedidos, ${result.revoked} revogados`,
    });
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
