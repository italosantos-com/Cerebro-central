import { NextRequest, NextResponse } from 'next/server';
import { buildBrainContext, brainContextToSystemPrompt } from '@/lib/brain-context';

/**
 * POST /api/ai/brain-context
 *
 * Assembles the brain context for a user message.
 * Returns the structured context object and a ready-to-use system prompt.
 *
 * Body:
 * {
 *   "userInput": "string",
 *   "profileId"?: "string"   // optional: per-profile brain override
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userInput, profileId } = body || {};

    if (!userInput || typeof userInput !== 'string') {
      return NextResponse.json(
        { error: 'userInput é obrigatório e deve ser uma string' },
        { status: 400 }
      );
    }

    // Optionally load admin Firestore when configured
    let adminDb: FirebaseFirestore.Firestore | undefined;
    try {
      const { adminDb: firestoreDb } = await import('@/lib/firebase-admin');
      adminDb = firestoreDb;
    } catch {
      // Firebase Admin not available; fall back to local JSON datasets
    }

    const ctx = await buildBrainContext({
      userInput,
      adminDb,
      ...(profileId ? { profilePath: `profiles/${profileId}/brain` } : {}),
    });

    const systemPrompt = brainContextToSystemPrompt(ctx);

    return NextResponse.json({
      success: true,
      context: ctx,
      systemPrompt,
    });
  } catch (error: any) {
    console.error('[Brain Context API] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao montar contexto do cérebro', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/brain-context
 *
 * Health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Brain Context Builder',
    description: 'Monta contexto RAG do cérebro para prompts de IA',
  });
}
