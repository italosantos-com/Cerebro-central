/**
 * API Route para Tradução de Mensagens de Chat
 * Suporta Google Translate e DeepL
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'firebase-admin';
import { getAuth } from '@/lib/firebase-admin';

interface TranslateRequest {
  text: string;
  sourceLang?: string;
  targetLang: string;
  provider: 'google' | 'deepl';
}

/**
 * Traduz usando Google Translate
 */
async function translateWithGoogle(text: string, targetLang: string, sourceLang?: string) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    throw new Error('Google Translate API key não configurada');
  }

  const url = 'https://translation.googleapis.com/language/translate/v2';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: text,
      source_language: sourceLang || 'auto',
      target_language: targetLang,
      key: apiKey,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Translate error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data.translations[0].translatedText;
}

/**
 * Traduz usando DeepL
 */
async function translateWithDeepL(text: string, targetLang: string, sourceLang?: string) {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    throw new Error('DeepL API key não configurada');
  }

  const url = 'https://api-free.deepl.com/v1/translate';
  
  const body = new URLSearchParams();
  body.append('text', text);
  body.append('target_lang', targetLang.toUpperCase());
  if (sourceLang && sourceLang !== 'auto') {
    body.append('source_lang', sourceLang.toUpperCase());
  }
  body.append('auth_key', apiKey);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`DeepL error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.translations[0].text;
}

/**
 * POST /api/chat/translate
 * Traduz uma mensagem de chat
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

    const body: TranslateRequest = await request.json();
    
    if (!body.text || !body.targetLang) {
      return NextResponse.json(
        { error: 'text e targetLang são obrigatórios' },
        { status: 400 }
      );
    }

    let translatedText: string;

    switch (body.provider) {
      case 'google':
        translatedText = await translateWithGoogle(body.text, body.targetLang, body.sourceLang);
        break;
      case 'deepl':
        translatedText = await translateWithDeepL(body.text, body.targetLang, body.sourceLang);
        break;
      default:
        return NextResponse.json(
          { error: 'Provedor não suportado' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      ok: true,
      translatedText,
      provider: body.provider,
      confidence: 0.95,
    });
  } catch (error) {
    console.error('Erro na tradução:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro ao traduzir',
      },
      { status: 500 }
    );
  }
}
