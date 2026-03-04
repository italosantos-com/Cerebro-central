import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { type ChatChannel } from '@/lib/chat-constants';
import { unifiedChatService } from '@/services/unified-chat-service';
import { isInternalRequest } from '@/lib/internal-service-auth';

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin') || '*';
  const internal = isInternalRequest(request);
  const authResult = internal ? null : await requireAdminApiAuth(request);
  if (!internal && authResult instanceof NextResponse) return withCors(authResult, origin);
  const authUid = authResult && !(authResult instanceof NextResponse) ? authResult.uid : null;

  const url = new URL(request.url);
  const channel = url.searchParams.get('channel') as ChatChannel | null;
  const conversationId =
    url.searchParams.get('conversationId') ||
    url.searchParams.get('participantId') ||
    url.searchParams.get('chatId');
  const limit = Number(url.searchParams.get('limit')) || 100;

  if (!channel || !conversationId) {
    return withCors(NextResponse.json(
      { success: false, message: 'channel e conversationId são obrigatórios' },
      { status: 400 }
    ), origin);
  }

  try {
    const messages = await unifiedChatService.fetchMessages(
      channel,
      conversationId,
      authUid || 'system',
      limit
    );

    return withCors(NextResponse.json({
      success: true,
      messages,
      count: messages.length
    }), origin);
  } catch (error) {
    console.error('[API] Erro ao buscar mensagens:', error);
    return withCors(NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar mensagens',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    ), origin);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin') || '*';
  const internal = isInternalRequest(request);
  const authResult = internal ? null : await requireAdminApiAuth(request);
  if (!internal && authResult instanceof NextResponse) return withCors(authResult, origin);
  const authUid = authResult && !(authResult instanceof NextResponse) ? authResult.uid : null;

  try {
    const body = await request.json();
    const { channel, conversationId, recipientId, text, chatId, participantId, adminUid } = body;
    const resolvedConversationId = conversationId || chatId || participantId;

    if (!channel || !resolvedConversationId || !text) {
      return withCors(NextResponse.json(
        { success: false, message: 'channel, conversationId (ou chatId/participantId) e text são obrigatórios' },
        { status: 400 }
      ), origin);
    }

    const result = await unifiedChatService.sendMessage(
      channel as ChatChannel,
      resolvedConversationId,
      recipientId || resolvedConversationId,
      text,
      authUid || adminUid || 'system'
    );

    if (!result.success) {
      return withCors(NextResponse.json(
        {
          success: false,
          error: result.error?.message || 'Erro ao enviar mensagem'
        },
        { status: 500 }
      ), origin);
    }

    return withCors(NextResponse.json({
      success: true,
      message: result.data
    }), origin);
  } catch (error) {
    console.error('[API] Erro ao enviar mensagem:', error);
    return withCors(NextResponse.json(
      {
        success: false,
        error: 'Erro ao enviar mensagem',
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
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  return response;
}
