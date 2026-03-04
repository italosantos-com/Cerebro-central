/**
 * API Route para Detectar Idioma de Mensagens
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase-admin';

interface DetectLanguageRequest {
  text: string;
  provider: 'google' | 'deepl';
}

/**
 * Detecta idioma usando Google Translate
 */
async function detectLanguageGoogle(text: string) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    throw new Error('Google Translate API key não configurada');
  }

  const url = 'https://translation.googleapis.com/language/translate/v2/detect';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: text,
      key: apiKey,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Translate error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.detections[0][0].language;
}

/**
 * Detecta idioma usando DeepL
 */
async function detectLanguageDeepL(text: string) {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    throw new Error('DeepL API key não configurada');
  }

  // DeepL não tem endpoint específico para detecção
  // Usar um provider como fallback ou retornar 'auto'
  // Para agora, retornar 'auto' já que o DeepL detecta automaticamente
  return 'auto';
}

/**
 * POST /api/chat/detect-language
 * Detecta o idioma de um texto
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Validar token Firebase
    try {
      const adminAuth = getAuth();
      await adminAuth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const body: DetectLanguageRequest = await request.json();
    
    if (!body.text) {
      return NextResponse.json(
        { error: 'text é obrigatório' },
        { status: 400 }
      );
    }

    let language: string;

    switch (body.provider) {
      case 'google':
        language = await detectLanguageGoogle(body.text);
        break;
      case 'deepl':
        language = await detectLanguageDeepL(body.text);
        break;
      default:
        return NextResponse.json(
          { error: 'Provedor não suportado' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      ok: true,
      language,
      provider: body.provider,
    });
  } catch (error) {
    console.error('Erro na detecção de idioma:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro ao detectar idioma',
      },
      { status: 500 }
    );
  }
}
