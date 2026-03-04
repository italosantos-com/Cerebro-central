/**
 * Cliente HTTP para APIs de Tradução
 * Gerencia autenticação e requests para endpoints de tradução e detecção de idioma
 */

import { auth } from 'firebase/auth';

export interface TranslateOptions {
  text: string;
  targetLang: string;
  sourceLang?: string;
  provider?: 'google' | 'deepl';
}

export interface TranslateResponse {
  ok: boolean;
  translatedText: string;
  provider: 'google' | 'deepl';
  confidence: number;
}

export interface DetectLanguageOptions {
  text: string;
  provider?: 'google' | 'deepl';
}

export interface DetectLanguageResponse {
  ok: boolean;
  language: string;
  provider: 'google' | 'deepl';
}

export class ChatTranslationClient {
  private baseUrl: string;
  private provider: 'google' | 'deepl';

  constructor(baseUrl: string = '/api/chat', provider: 'google' | 'deepl' = 'google') {
    this.baseUrl = baseUrl;
    this.provider = provider;
  }

  /**
   * Obtém o token de autenticação Firebase
   */
  private async getAuthToken(): Promise<string> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Usuário não autenticado');
    }
    return await currentUser.getIdToken();
  }

  /**
   * Traduz um texto
   */
  async translate(options: TranslateOptions): Promise<string> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${this.baseUrl}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: options.text,
          targetLang: options.targetLang,
          sourceLang: options.sourceLang,
          provider: options.provider || this.provider,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao traduzir');
      }

      const data: TranslateResponse = await response.json();
      return data.translatedText;
    } catch (error) {
      console.error('Erro ao traduzir:', error);
      throw error;
    }
  }

  /**
   * Detecta o idioma de um texto
   */
  async detectLanguage(options: DetectLanguageOptions): Promise<string> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${this.baseUrl}/detect-language`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: options.text,
          provider: options.provider || this.provider,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao detectar idioma');
      }

      const data: DetectLanguageResponse = await response.json();
      return data.language;
    } catch (error) {
      console.error('Erro ao detectar idioma:', error);
      throw error;
    }
  }

  /**
   * Define o provedor padrão
   */
  setProvider(provider: 'google' | 'deepl') {
    this.provider = provider;
  }
}

// Instância singleton
export const chatTranslationClient = new ChatTranslationClient();
