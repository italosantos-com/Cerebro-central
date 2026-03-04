import { NextRequest, NextResponse } from 'next/server';
import { ai, genkitDisabled } from '@/ai/genkit';
import { buildBrainContext, serializeBrainContext } from '@/lib/brain-context-builder';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/ai/brain
 *
 * Endpoint de chat com contexto completo do Cérebro (brain):
 *   1. Carrega brain_global, persona, rules do Firestore
 *   2. Recupera knowledge relevante via RAG simples
 *   3. Detecta estágio de conversão e objeções
 *   4. Monta prompt final e chama Gemini via Genkit
 *   5. Salva conversa em /conversations/{conversationId}
 *
 * Body:
 * {
 *   "message": "string",         // mensagem do usuário (obrigatório)
 *   "uid"?: "string",            // UID do usuário autenticado
 *   "profileId"?: "string",      // ID do perfil (isolamento multi-perfil)
 *   "conversationId"?: "string", // ID da conversa existente (para histórico)
 *   "history"?: [                // histórico da conversa
 *     { "role": "user"|"assistant", "content": "string" }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    if (genkitDisabled) {
      return NextResponse.json(
        { error: 'Genkit está desativado' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { message, uid, profileId, conversationId, history = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'O campo "message" é obrigatório.' },
        { status: 400 }
      );
    }

    // 1–4. Construir contexto do brain
    const brainCtx = await buildBrainContext(message, uid, profileId);
    const brainBlock = serializeBrainContext(brainCtx);

    // Montar histórico de conversa para o prompt
    const historyText = Array.isArray(history) && history.length > 0
      ? history
          .slice(-8)
          .map((h: { role: string; content: string }) => {
            const roleLabel = h.role === 'user' ? 'Usuário' : h.role === 'assistant' ? 'Assistente' : null;
            return roleLabel ? `${roleLabel}: ${h.content}` : null;
          })
          .filter(Boolean)
          .join('\n') + '\n'
      : '';

    const useVertex =
      process.env.GENKIT_PROVIDER === 'vertex' ||
      process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true';
    const model = useVertex ? 'vertexai/gemini-2.0-flash' : 'googleai/gemini-2.0-flash';

    const systemPrompt = brainBlock
      ? `Você é um assistente especializado. Siga rigorosamente as instruções abaixo:\n\n${brainBlock}`
      : 'Você é um assistente especializado.';

    const fullPrompt = historyText
      ? `${historyText}Usuário: ${message}`
      : message;

    // 5. Gerar resposta
    const { text } = await ai.generate({
      model,
      system: systemPrompt,
      prompt: fullPrompt,
      config: { temperature: 0.7, maxOutputTokens: 1024 },
    });

    const responseText = text ?? 'Desculpe, não consegui gerar uma resposta agora.';

    // 6. Salvar conversa no Firestore (admin SDK para escrita segura no servidor)
    let savedConversationId: string | null = conversationId ?? null;
    try {
      const adminDb = getAdminDb();
      if (adminDb) {
        const newMessage = [
          { role: 'user', content: message },
          { role: 'assistant', content: responseText },
        ];

        if (savedConversationId) {
          const docRef = adminDb.collection('conversations').doc(savedConversationId);
          await docRef.update({
            messages: FieldValue.arrayUnion(...newMessage),
            updatedAt: FieldValue.serverTimestamp(),
            stage: brainCtx.conversionStage ?? null,
          });
        } else {
          const docRef = await adminDb.collection('conversations').add({
            uid: uid ?? null,
            profileId: profileId ?? null,
            messages: newMessage,
            converted: false,
            stage: brainCtx.conversionStage ?? null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          savedConversationId = docRef.id;
        }
      }
    } catch (saveErr) {
      // Falha ao salvar não deve bloquear a resposta
      console.warn('[brain] Falha ao salvar conversa:', saveErr);
    }

    return NextResponse.json({
      success: true,
      text: responseText,
      conversationId: savedConversationId,
      stage: brainCtx.conversionStage,
    });

  } catch (error: any) {
    console.error('[brain] Erro ao processar:', error);
    return NextResponse.json(
      {
        error: 'Erro ao processar mensagem',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/brain
 * Health check
 */
export async function GET() {
  const hasApiKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY);
  return NextResponse.json({
    status: genkitDisabled ? 'disabled' : 'ok',
    service: 'Brain API',
    configured: !genkitDisabled && hasApiKey,
    collections: [
      'brain/global/items',
      'brain/persona/items',
      'brain/rules/items',
      'brain/knowledge/items',
      'brain/conversion/items',
      'brain/objections/items',
    ],
  });
}
