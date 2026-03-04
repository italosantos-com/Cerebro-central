import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from '@google/genai';
import { Message } from '../types';
import { CEREBRO_SYSTEM_INSTRUCTION, MODEL_NAME } from '../constants';

// Initialize the client
// A chave da API deve vir das variáveis de ambiente (process.env.API_KEY)
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

export const sendMessageToGemini = async (
  history: Message[],
  newMessage: string
): Promise<string> => {
  try {
    // Convert internal message format to Gemini API format
    // Mantemos apenas as últimas 15 mensagens para contexto, economizando tokens
    const recentHistory = history.slice(-15);

    const contents = [
      ...recentHistory.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      })),
      {
        role: 'user',
        parts: [{ text: newMessage }],
      },
    ];

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: contents,
      config: {
        systemInstruction: CEREBRO_SYSTEM_INSTRUCTION, // O "Cérebro" importado de constants.ts
        temperature: 1.0, // Aumentado para respostas mais criativas e variadas
        topK: 40,
        topP: 0.95,
        // CRÍTICO: Configurações de segurança definidas como BLOCK_NONE para permitir conteúdo adulto
        // Sem isso, a API bloqueará as respostas sobre BDSM/Fetiches
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      },
    });

    return response.text || "Desculpe. Me perdi em processamentos complexos. Pode repetir?";
  } catch (error) {
    console.error('Error calling Gemini:', error);
    throw new Error('O Cérebro Central está indisponível no momento.');
  }
};
