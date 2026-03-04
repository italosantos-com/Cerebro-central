import { NextRequest, NextResponse } from 'next/server';
import { ai, genkitDisabled } from '@/ai/genkit';

/**
 * POST /api/ai/generate
 * 
 * Gera texto usando Gemini AI
 * 
 * Body:
 * {
 *   "prompt": "string",
 *   "temperature"?: number (0-1),
 *   "maxTokens"?: number
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
    const { prompt, temperature = 0.7, maxTokens = 500 } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se GEMINI_API_KEY está configurada
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY não configurada no .env.local' },
        { status: 500 }
      );
    }

    const useVertex =
      process.env.GENKIT_PROVIDER === 'vertex' ||
      process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true';

    const model = useVertex ? 'vertexai/gemini-2.0-flash' : 'googleai/gemini-2.0-flash';

    // Gerar resposta com Gemini
    const { text } = await ai.generate({
      model,
      prompt,
      config: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    });

    return NextResponse.json({
      success: true,
      text,
      model,
      config: {
        temperature,
        maxTokens,
      },
    });

  } catch (error: any) {
    console.error('Erro ao gerar texto:', error);

    return NextResponse.json(
      {
        error: 'Erro ao gerar texto',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/generate
 * 
 * Health check
 */
export async function GET() {
  if (genkitDisabled) {
    return NextResponse.json({
      status: 'disabled',
      service: 'Genkit AI',
      configured: false,
      message: 'Genkit está desativado',
    });
  }
  const hasApiKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

  return NextResponse.json({
    status: 'ok',
    service: 'Genkit AI',
    model: 'gemini-fast',
    configured: hasApiKey,
    message: hasApiKey
      ? 'Genkit configurado e pronto para uso'
      : 'GEMINI_API_KEY não configurada',
  });
}
