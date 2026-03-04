// genkit-flow.ts
// Configuração do Genkit com Google Generative AI (Gemini)

import { genkit, z } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';
import { defineFlow, startFlowsServer } from '@genkit-ai/flow';

// Inicializa o Genkit com o plugin do Google AI (Gemini)
const ai = genkit({
  plugins: [
    googleAI({
      // A API Key será lida da variável de ambiente GOOGLE_GENAI_API_KEY
      apiKey: process.env.GOOGLE_GENAI_API_KEY || '',
    }),
  ],
  logLevel: 'debug',
});

// Define o modelo a ser usado. Gemini 1.5 Pro é o modelo mais recente
export const model = ai.model('google/gemini-1.5-pro-latest');

/**
 * Define o fluxo de IA "centralAssistantBrain".
 * Processa entrada usando o modelo Gemini Pro.
 */
export const centralAssistantBrain = defineFlow(
  {
    name: 'centralAssistantBrain',
    inputSchema: z.object({
      prompt: z.string().describe('O prompt ou pergunta para o assistente'),
      context: z.string().optional().describe('Contexto adicional'),
    }),
    outputSchema: z.string().describe('Resposta do assistente'),
  },
  async (input) => {
    try {
      const response = await ai.generate({
        model,
        prompt: input.context
          ? `${input.context}\n\nUsuário: ${input.prompt}`
          : input.prompt,
      });

      return response.text();
    } catch (error) {
      console.error('Erro ao processar com Genkit:', error);
      throw new Error(`Falha ao processar requisição: ${error}`);
    }
  }
);

// Iniciar o servidor de flows (útil para desenvolvimento local)
if (process.env.GENKIT_DEV === 'true') {
  startFlowsServer({
    flows: [centralAssistantBrain],
    port: 3400,
  });
}
