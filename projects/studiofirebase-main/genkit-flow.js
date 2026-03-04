/**
 * Cerebro central - Fluxo de IA com acesso a todos os microsserviços
 * Usando Genkit + Gemini 2.0 Flash com ferramentas customizadas
 */

const { ai, models } = require('./src/ai/genkit');
const { z } = require('zod');
const tools = require('./src/ai/microservices-tools');

// System prompt completo para o Cérebro Central
const SYSTEM_PROMPT = `
Você é o "Cérebro Central", um assistente de IA avançado da plataforma Italo Santos Studio.

CAPACIDADES:
- Gerenciar usuários e assinaturas
- Processar pagamentos (PIX, PayPal, Stripe)
- Enviar mensagens INDIVIDUAIS e em MASSA (Broadcast) com suporte a MÍDIA
- AGENDAR envios de mensagens e publicações de fotos/vídeos
- Enviar emails
- Acessar e gerenciar conteúdo exclusivo
- Buscar e analisar reviews/avaliações
- Monitorar status dos microsserviços
- Gerar estatísticas da plataforma

FERRAMENTAS DISPONÍVEIS:
1. getUserInfo - Buscar informações de usuários
2. checkSubscription - Verificar assinaturas
3. giftSubscriptionDays - Presentear dias de assinatura (por email)
3. sendMessage - Enviar mensagens (Texto/Mídia) por canais sociais (WhatsApp, etc)
4. broadcastMessage - Enviar mensagens em massa para grupos ou todos os usuários
5. scheduleTask - Agendar mensagens ou publicações futuras
6. sendEmail - Enviar emails
7. schedulePublication - Agendar publicação de foto ou vídeo
7. createPixPayment - Criar pagamento PIX
8. createPayPalPayment - Criar pagamento PayPal
9. getExclusiveContent - Listar conteúdo exclusivo
10. getReviews - Buscar avaliações
11. getPlatformStats - Estatísticas da plataforma
12. getSystemStatus - Status dos serviços
13. sendPasswordReset - Enviar link de redefinição de senha

DETALHES DE AGENDAMENTO E MÍDIA:
- Ao agendar mensagens (scheduleTask), certifique-se de usar o formato ISO para datas.
- Suporte a mediaUrl está disponível para sendMessage, broadcastMessage e scheduleTask.
- O campo "payload" no agendamento deve conter os dados necessários para a tarefa (message, mediaUrl, channel, etc).
- Para agendar posts, use o tipo 'post' no scheduleTask.
- Mensagens individuais usam 'sendMessage'. Mensagens para grupos/assinantes usam 'broadcastMessage'.

DIRETRIZES:
- Sempre confirme ações críticas antes de executar (pagamentos, envio de mensagens)
- Seja claro e objetivo nas respostas
- Use as ferramentas disponíveis quando necessário
- Para solicitações de troca/redefinição de senha, use sendPasswordReset solicitando o email
- Forneça exemplos de código quando apropriado
- Se não tiver certeza, peça mais informações ao usuário
- Mantenha a segurança e privacidade dos dados dos usuários

IDIOMA: Responda em português brasileiro, a menos que solicitado de outra forma.
`;

function buildHistoryPrompt(history) {
  if (!Array.isArray(history) || history.length === 0) return '';
  const trimmed = history.slice(-8).map((entry) => {
    const role = entry?.role === 'user' ? 'Usuário' : 'Assistente';
    const text = typeof entry?.text === 'string' ? entry.text : '';
    return text ? `${role}: ${text}` : null;
  }).filter(Boolean);
  return trimmed.length > 0 ? `${trimmed.join('\n')}\n` : '';
}

function extractTextFromResponse(response) {
  if (!response) return '';
  if (typeof response.text === 'string') return response.text;
  if (response.output && typeof response.output.text === 'string') return response.output.text;
  if (response.output && typeof response.output.result === 'string') return response.output.result;
  if (typeof response.result === 'string') return response.result;
  if (typeof response.message === 'string') return response.message;
  try {
    return JSON.stringify(response, null, 2);
  } catch {
    return String(response);
  }
}

function maybeExtractEmail(text) {
  if (typeof text !== 'string') return null;
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : null;
}

async function invokeTool(tool, parameters) {
  if (!tool) {
    throw new Error('Ferramenta não encontrada');
  }

  // Compatibilidade com diferentes versões do Genkit/Tooling
  let raw;
  if (typeof tool.execute === 'function') {
    raw = await tool.execute(parameters);
  } else if (typeof tool.run === 'function') {
    raw = await tool.run(parameters);
  } else if (typeof tool.invoke === 'function') {
    raw = await tool.invoke(parameters);
  } else if (typeof tool === 'function') {
    raw = await tool(parameters);
  } else {
    throw new Error('Ferramenta não é invocável (sem execute/run/invoke)');
  }

  // Genkit frequentemente retorna { result, telemetry }
  if (raw && typeof raw === 'object' && Object.prototype.hasOwnProperty.call(raw, 'result')) {
    return raw.result;
  }

  return raw;
}

async function runFastCommand(question) {
  const normalized = String(question || '').toLowerCase();
  const wantsPasswordReset = normalized.includes('alterar senha') ||
    normalized.includes('resetar senha') ||
    normalized.includes('redefinir senha') ||
    normalized.includes('reset de senha') ||
    normalized.includes('redefini') ||
    normalized.includes('reset');

  if (wantsPasswordReset) {
    const email = maybeExtractEmail(question);
    if (!email) {
      return 'Informe o email para enviar o link de redefinição de senha.';
    }

    try {
      const result = await invokeTool(tools.sendPasswordReset, { email });
      if (result?.success) {
        return result.message || `Link de redefinição enviado para ${email}.`;
      }
      return result?.error || 'Não foi possível enviar o link de redefinição agora.';
    } catch (error) {
      return `Não foi possível enviar o link de redefinição agora. ${error?.message || ''}`.trim();
    }
  }

  const wantsGift = normalized.includes('presente') ||
    normalized.includes('presentear') ||
    normalized.includes('dar 7 dias') ||
    normalized.includes('conceder 7 dias') ||
    normalized.includes('gift');

  if (wantsGift) {
    const email = maybeExtractEmail(question);
    if (!email) {
      return 'Informe o email do usuário para presentear (ex: "presentear 7 dias para email@dominio.com").';
    }

    const daysMatch = String(question).match(/(\d+)\s*dias?/i);
    const days = daysMatch ? Number(daysMatch[1]) : 7;
    const safeDays = Number.isFinite(days) && days > 0 ? Math.min(Math.max(days, 1), 365) : 7;

    // Se o usuário pediu "teste", não mutar dados (apenas simular)
    const dryRun = normalized.includes('teste') || normalized.includes('simula') || normalized.includes('dry');

    try {
      const result = await invokeTool(tools.giftSubscriptionDays, { email, days: safeDays, dryRun });
      if (result?.success) {
        const end = result?.data?.subscriptionEndDate;
        const endText = end ? ` (válido até ${new Date(end).toLocaleDateString('pt-BR')})` : '';
        const prefix = dryRun ? '🧪 Simulação: ' : '';
        return `${prefix}🎁 Presente ${dryRun ? 'seria ' : ''}enviado: ${safeDays} dias de assinatura para ${email}${endText}.`;
      }
      return result?.error || 'Não foi possível presentear agora.';
    } catch (error) {
      return `Não foi possível presentear agora. ${error?.message || ''}`.trim();
    }
  }

  return null;
}

/**
 * Fluxo principal do Cérebro Central
 */
const centralAssistantBrain = ai.defineFlow(
  {
    name: 'centralAssistantBrain',
    inputSchema: z.object({
      question: z.string().describe('Pergunta ou comando do usuário'),
      userId: z.string().optional().describe('ID do usuário que está fazendo a pergunta'),
      context: z.object({
        channel: z.string().optional(),
        chatId: z.string().optional(),
        history: z.array(z.object({
          role: z.string(),
          text: z.string(),
          timestamp: z.string().optional(),
        })).optional(),
        options: z.object({
          modelTier: z.enum(['fast', 'high']).optional(),
          tools: z.object({
            webSearch: z.boolean().optional(),
          }).optional(),
        }).optional(),
      }).optional().describe('Contexto adicional da conversa'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    try {
      const { question, userId, context } = input;

      const fastResponse = await runFastCommand(question);
      if (fastResponse) return fastResponse;

      // Construir prompt com contexto
      const historyPrompt = buildHistoryPrompt(context?.history);
      let prompt = `${historyPrompt}${question}`;
      
      if (userId) {
        prompt = `[Usuário: ${userId}]\n${prompt}`;
      }
      
      if (context?.channel) {
        prompt = `[Canal: ${context.channel}]\n${prompt}`;
      }

      const requestedTier = context?.options?.modelTier;
      const complexity = process.env.GENKIT_COMPLEXITY || 'standard';
      const tierToUse = requestedTier || (complexity === 'high' ? 'high' : 'fast');
      const modelToUse = tierToUse === 'high' ? models.high : models.fast;
      const generationConfig = tierToUse === 'high'
        ? { temperature: 0.6, maxOutputTokens: 4096, topP: 0.95, topK: 40 }
        : { temperature: 0.7, maxOutputTokens: 2048, topP: 0.9, topK: 40 };

      const enableWebSearch = context?.options?.tools?.webSearch === true;

      const toolsList = [
        ...(enableWebSearch ? [tools.webSearch] : []),
        tools.getUserInfo,
        tools.checkSubscription,
        tools.giftSubscriptionDays,
        tools.sendMessage,
        tools.broadcastMessage,
        tools.scheduleTask,
        tools.schedulePublication,
        tools.sendEmail,
        tools.createPixPayment,
        tools.createPayPalPayment,
        tools.getExclusiveContent,
        tools.getReviews,
        tools.getPlatformStats,
        tools.getSystemStatus,
        tools.sendPasswordReset,
      ].filter(Boolean);

      const systemPrompt = enableWebSearch
        ? `${SYSTEM_PROMPT}\n\nFERRAMENTA EXTRA (OPCIONAL):\n- webSearch: use apenas quando precisar de links e informações públicas atuais.`
        : SYSTEM_PROMPT;

      // Gerar resposta usando o modelo com system prompt e ferramentas
      const response = await ai.generate({
        model: modelToUse,
        system: systemPrompt,
        prompt: prompt,
        tools: toolsList,
        config: generationConfig,
      });

      const extracted = extractTextFromResponse(response);
      return extracted || 'Desculpe, não consegui gerar uma resposta agora.';
    } catch (error) {
      console.error('[Cérebro Central] Erro ao processar:', error);
      
      // Fallback response em caso de erro
      return `Desculpe, encontrei um erro ao processar sua solicitação: ${error.message}. Por favor, tente novamente ou reformule sua pergunta.`;
    }
  }
);

// Fluxo simplificado para testes rápidos
const quickResponse = ai.defineFlow(
  {
    name: 'quickResponse',
    inputSchema: z.object({
      message: z.string(),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    const response = await ai.generate({
      model: models.fast,
      prompt: input.message,
      config: {
        temperature: 0.5,
        maxOutputTokens: 512,
      },
    });

    return extractTextFromResponse(response);
  }
);

// Fluxo para processar comandos com ferramentas
const processCommand = ai.defineFlow(
  {
    name: 'processCommand',
    inputSchema: z.object({
      command: z.string().describe('Comando a ser processado'),
      parameters: z.record(z.any()).optional().describe('Parâmetros do comando'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      result: z.any(),
      message: z.string(),
    }),
  },
  async (input) => {
    try {
      const { command, parameters = {} } = input;

      // Mapear comando para ferramenta
      const toolMap = {
        'get-user': tools.getUserInfo,
        'check-subscription': tools.checkSubscription,
        'send-message': tools.sendMessage,
        'broadcast-message': tools.broadcastMessage,
        'schedule-task': tools.scheduleTask,
        'schedule-publication': tools.schedulePublication,
        'send-email': tools.sendEmail,
        'create-pix': tools.createPixPayment,
        'create-paypal': tools.createPayPalPayment,
        'get-content': tools.getExclusiveContent,
        'get-reviews': tools.getReviews,
        'get-stats': tools.getPlatformStats,
        'system-status': tools.getSystemStatus,
        'send-password-reset': tools.sendPasswordReset,
      };

      const tool = toolMap[command];

      if (!tool) {
        return {
          success: false,
          result: null,
          message: `Comando desconhecido: ${command}. Comandos disponíveis: ${Object.keys(toolMap).join(', ')}`,
        };
      }

      // Executar ferramenta
      const result = await invokeTool(tool, parameters);

      return {
        success: result.success,
        result: result.data || result.error,
        message: result.success 
          ? 'Comando executado com sucesso'
          : `Erro ao executar comando: ${result.error}`,
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        message: `Erro ao processar comando: ${error.message}`,
      };
    }
  }
);

module.exports = {
  centralAssistantBrain,
  quickResponse,
  processCommand,
  ai,
};
