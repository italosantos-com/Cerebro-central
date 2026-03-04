import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { CHAT_CHANNELS, type ChatChannel } from '@/lib/chat-constants';
import { unifiedChatService } from '@/services/unified-chat-service';

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin') || '*';
  const authResult = await requireAdminApiAuth(request);
  if (authResult instanceof NextResponse) return withCors(authResult, origin);

  const url = new URL(request.url);
  const channelParam = url.searchParams.get('channel') as ChatChannel | null;
  
  // Determinar quais canais buscar
  let channels: ChatChannel[] | undefined;
  if (channelParam && channelParam !== CHAT_CHANNELS.ALL) {
    channels = [channelParam];
  }

  try {
    // Usar serviço unificado para buscar conversas
    const conversations = await unifiedChatService.fetchConversations(
      authResult.uid,
      channels
    );

    return withCors(NextResponse.json({
      success: true,
      conversations,
      count: conversations.length
    }), origin);
  } catch (error) {
    console.error('[API] Erro ao buscar conversas:', error);
    return withCors(NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar conversas',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    ), origin);
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || '*';
  return withCors(new NextResponse(null, { status: 204 }), origin);
}

function withCors(response: NextResponse, origin: string) {
  const headers = response.headers;
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  return response;
}
