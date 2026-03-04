
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { centralAssistantBrain, getCentralAssistantDiagnostics } from '@/lib/central-assistant';

export const maxDuration = 60; // Timeout de 60 segundos para LLM

export async function POST(request: NextRequest) {
  const requestId = typeof randomUUID === 'function' ? randomUUID() : `central-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = Date.now();
  const authResult = await requireAdminApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { message, context, clientRequestId, options } = body || {};

    const requestedModelTier =
      (options?.modelTier ?? context?.options?.modelTier) as unknown;
    const safeModelTier = requestedModelTier === 'high'
      ? 'high'
      : requestedModelTier === 'fast'
        ? 'fast'
        : undefined;

    const requestedWebSearch = (options?.tools?.webSearch ?? context?.options?.tools?.webSearch) as unknown;
    const safeWebSearch = requestedWebSearch === true;

    const safeOptions = {
      ...(safeModelTier ? { modelTier: safeModelTier } : {}),
      tools: {
        webSearch: safeWebSearch,
      },
    };

      function extractAssistantText(value: unknown) {
        if (typeof value === 'string') return value;
        if (value && typeof value === 'object') {
          const candidate = (value as any).text ?? (value as any).result ?? (value as any).message ?? (value as any).data;
          if (typeof candidate === 'string') return candidate;
          if (candidate && typeof candidate === 'object') {
            const nested = (candidate as any).text ?? (candidate as any).result ?? (candidate as any).message;
            if (typeof nested === 'string') return nested;
          }
        }
        return '';
      }

    console.debug('[Central Assistant API] Requisição recebida', {
      requestId,
      clientRequestId,
      adminUid: authResult.uid,
      hasMessage: Boolean(message),
      messageLength: typeof message === 'string' ? message.length : null,
      contextKeys: context ? Object.keys(context) : []
    });

    if (!message) {
      console.warn('[Central Assistant API] Mensagem ausente', { requestId, clientRequestId, adminUid: authResult.uid });
      return NextResponse.json({ success: false, message: 'Message is required', requestId }, { status: 400 });
    }

    // Executar o fluxo do Genkit
    const safeChatId = typeof context?.chatId === 'string' ? context.chatId : undefined;
    const aiResponseText = await centralAssistantBrain.run({
      question: message,
      userId: authResult.uid,
      context: {
        channel: 'admin-panel',
        ...(safeChatId ? { chatId: safeChatId } : {}),
        ...(context || {}),
        options: safeOptions,
      }
    });

      const responseText = extractAssistantText(aiResponseText) || 'Desculpe, não consegui gerar uma resposta agora.';

    const diagnostics = getCentralAssistantDiagnostics();
    if (diagnostics.isFallback) {
      console.warn('[Central Assistant API] Central assistant is running in fallback mode', {
        requestId,
        clientRequestId,
        adminUid: authResult.uid,
        loadError: diagnostics.loadError,
      });
    }

    console.debug('[Central Assistant API] Resposta gerada', {
      requestId,
      clientRequestId,
      durationMs: Date.now() - startedAt,
        responseLength: responseText.length
    });

    return NextResponse.json({
      success: true,
      message: responseText,
      diagnostics,
      data: {
        id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text: responseText,
        role: 'assistant',
        timestamp: new Date().toISOString()
      },
      requestId
    });

  } catch (error: any) {
    console.error('[Central Assistant API] Error:', { requestId, error });
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Internal Server Error',
      requestId
    }, { status: 500 });
  }
}
