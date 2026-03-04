/**
 * Cérebro Central - Fluxo de IA com acesso a todos os microsserviços
 *
 * IMPORTANTE:
 * Este arquivo vive dentro de `src/` para garantir que o runtime do Next/Firebase App Hosting
 * empacote o código corretamente. O arquivo legado `genkit-flow.js` (na raiz) depende de
 * paths como `./src/...` e tende a falhar em produção.
 */

import { ai, models } from '@/ai/genkit';
import { z } from 'zod';
import * as tools from '@/ai/microservices-tools';

const SYSTEM_PROMPT = `
Você é o "Cérebro Central", um assistente de IA avançado da plataforma Italo Santos Studio.

CAPACIDADES:
- Gerenciar usuários e assinaturas
- Processar pagamentos (PIX, PayPal, Stripe)
- Enviar mensagens INDIVIDUAIS e em MASSA (Broadcast) com suporte a MÍDIA
- AGENDAR envios de mensagens e publicações de fotos/vídeos
- Enviar emails
- Verificar admins por foto/vídeo (anti-fake)
- Acessar e gerenciar conteúdo exclusivo
- Buscar e analisar reviews/avaliações
- Monitorar status dos microsserviços
- Gerar estatísticas da plataforma

FERRAMENTAS DISPONÍVEIS:
1. getUserInfo - Buscar informações de usuários
2. checkSubscription - Verificar assinaturas
3. giftSubscriptionDays - Presentear dias de assinatura (por email)
4. sendSecretChatTextMessage - Enviar mensagem de texto como admin no chat secreto (Firestore)
5. deleteSubscriber - Cancelar/remover assinante (ação crítica: exige confirmação)
6. cleanupExpiredSubscribers - Marcar assinaturas expiradas (ação crítica: exige confirmação)
7. purgeExpiredSubscribers - Remover expirados antigos (ação crítica: exige confirmação)
8. resendAccountConfirmationEmail - Reenviar email de confirmação da conta
9. resendMfaOtp - Reenviar MFA (OTP via SMS)
10. sendMessage - Enviar mensagens (Texto/Mídia) por canais sociais (WhatsApp, etc)
11. broadcastMessage - Enviar mensagens em massa para grupos ou todos os usuários
12. scheduleTask - Agendar mensagens ou publicações futuras
13. sendEmail - Enviar emails
14. schedulePublication - Agendar publicação de foto ou vídeo
15. createPixPayment - Criar pagamento PIX
16. createPayPalPayment - Criar pagamento PayPal
17. getExclusiveContent - Listar conteúdo exclusivo
18. getReviews - Buscar avaliações
19. getPlatformStats - Estatísticas da plataforma
20. getSystemStatus - Status dos serviços
21. sendPasswordReset - Enviar link de redefinição de senha
22. verifyAdminIdentityMedia - Enviar fotos/vídeos para validar o admin (anti-fake)

DETALHES DE AGENDAMENTO E MÍDIA:
- Ao agendar mensagens (scheduleTask), use o formato ISO para datas.
- Suporte a mediaUrl está disponível para sendMessage, broadcastMessage e scheduleTask.
- O campo "payload" no agendamento deve conter os dados necessários para a tarefa.

DIRETRIZES:
- Sempre confirme ações críticas antes de executar (pagamentos, envio de mensagens)
- Seja claro e objetivo nas respostas
- Use as ferramentas disponíveis quando necessário
- Para solicitações de troca/redefinição de senha, use sendPasswordReset solicitando o email
- Se não tiver certeza, peça mais informações
- Mantenha a segurança e privacidade dos dados dos usuários

IDIOMA: Responda em português brasileiro, a menos que solicitado de outra forma.
`;

function buildHistoryPrompt(history: unknown) {
  if (!Array.isArray(history) || history.length === 0) return '';
  const trimmed = history
    .slice(-8)
    .map((entry: any) => {
      const role = entry?.role === 'user' ? 'Usuário' : 'Assistente';
      const text = typeof entry?.text === 'string' ? entry.text : '';
      return text ? `${role}: ${text}` : null;
    })
    .filter(Boolean);
  return trimmed.length > 0 ? `${trimmed.join('\n')}\n` : '';
}

function extractTextFromResponse(response: any): string {
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

function maybeExtractEmail(text: unknown) {
  if (typeof text !== 'string') return null;
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : null;
}

async function invokeTool(tool: any, parameters: any) {
  if (!tool) throw new Error('Ferramenta não encontrada');

  let raw: any;
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

  if (raw && typeof raw === 'object' && Object.prototype.hasOwnProperty.call(raw, 'result')) {
    return raw.result;
  }
  return raw;
}

async function runFastCommand(question: unknown) {
  const normalized = String(question || '').toLowerCase();
  const wantsPasswordReset =
    normalized.includes('alterar senha') ||
    normalized.includes('resetar senha') ||
    normalized.includes('redefinir senha') ||
    normalized.includes('reset de senha') ||
    normalized.includes('redefini') ||
    normalized.includes('reset');

  if (wantsPasswordReset) {
    const email = maybeExtractEmail(question);
    if (!email) return 'Informe o email para enviar o link de redefinição de senha.';

    try {
      const result = await invokeTool((tools as any).sendPasswordReset, { email });
      if (result?.success) return result.message || `Link de redefinição enviado para ${email}.`;
      return result?.error || 'Não foi possível enviar o link de redefinição agora.';
    } catch (error: any) {
      return `Não foi possível enviar o link de redefinição agora. ${error?.message || ''}`.trim();
    }
  }

  const wantsGift =
    normalized.includes('presente') ||
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
    const dryRun = normalized.includes('teste') || normalized.includes('simula') || normalized.includes('dry');

    try {
      const result = await invokeTool((tools as any).giftSubscriptionDays, { email, days: safeDays, dryRun });
      if (result?.success) {
        const end = result?.data?.subscriptionEndDate;
        const endText = end ? ` (válido até ${new Date(end).toLocaleDateString('pt-BR')})` : '';
        const prefix = dryRun ? '🧪 Simulação: ' : '';
        return `${prefix}🎁 Presente ${dryRun ? 'seria ' : ''}enviado: ${safeDays} dias de assinatura para ${email}${endText}.`;
      }
      return result?.error || 'Não foi possível presentear agora.';
    } catch (error: any) {
      return `Não foi possível presentear agora. ${error?.message || ''}`.trim();
    }
  }

  return null;
}

export const centralAssistantBrain = ai.defineFlow(
  {
    name: 'centralAssistantBrain',
    inputSchema: z.object({
      question: z.string().describe('Pergunta ou comando do usuário'),
      userId: z.string().optional().describe('ID do usuário que está fazendo a pergunta'),
      context: z
        .object({
          channel: z.string().optional(),
          chatId: z.string().optional(),
          history: z
            .array(
              z.object({
                role: z.string(),
                text: z.string(),
                timestamp: z.string().optional(),
              })
            )
            .optional(),
          options: z
            .object({
              modelTier: z.enum(['fast', 'high']).optional(),
              tools: z
                .object({
                  webSearch: z.boolean().optional(),
                })
                .optional(),
            })
            .optional(),
        })
        .optional()
        .describe('Contexto adicional da conversa'),
    }),
    outputSchema: z.string(),
  },
  async (input: any) => {
    try {
      const { question, userId, context } = input;

      const fastResponse = await runFastCommand(question);
      if (fastResponse) return fastResponse;

      const historyPrompt = buildHistoryPrompt(context?.history);
      let prompt = `${historyPrompt}${question}`;
      if (userId) prompt = `[Usuário: ${userId}]\n${prompt}`;
      if (context?.channel) prompt = `[Canal: ${context.channel}]\n${prompt}`;
      if (context?.chatId) prompt = `[ChatId: ${context.chatId}]\n${prompt}`;

      const requestedTier = context?.options?.modelTier;
      const complexity = process.env.GENKIT_COMPLEXITY || 'standard';
      const tierToUse = requestedTier || (complexity === 'high' ? 'high' : 'fast');
      const modelToUse = tierToUse === 'high' ? (models as any).high : (models as any).fast;
      const generationConfig =
        tierToUse === 'high'
          ? { temperature: 0.6, maxOutputTokens: 4096, topP: 0.95, topK: 40 }
          : { temperature: 0.7, maxOutputTokens: 2048, topP: 0.9, topK: 40 };

      const enableWebSearch = context?.options?.tools?.webSearch === true;
      const toolsList = [
        ...(enableWebSearch ? [(tools as any).webSearch] : []),
        (tools as any).getUserInfo,
        (tools as any).checkSubscription,
        (tools as any).giftSubscriptionDays,
        (tools as any).sendSecretChatTextMessage,
        (tools as any).deleteSubscriber,
        (tools as any).cleanupExpiredSubscribers,
        (tools as any).purgeExpiredSubscribers,
        (tools as any).resendAccountConfirmationEmail,
        (tools as any).resendMfaOtp,
        (tools as any).sendMessage,
        (tools as any).broadcastMessage,
        (tools as any).scheduleTask,
        (tools as any).schedulePublication,
        (tools as any).sendEmail,
        (tools as any).createPixPayment,
        (tools as any).createPayPalPayment,
        (tools as any).getExclusiveContent,
        (tools as any).getReviews,
        (tools as any).getPlatformStats,
        (tools as any).getSystemStatus,
        (tools as any).sendPasswordReset,
        (tools as any).verifyAdminIdentityMedia,
      ].filter(Boolean);

      const systemPrompt = enableWebSearch
        ? `${SYSTEM_PROMPT}\n\nFERRAMENTA EXTRA (OPCIONAL):\n- webSearch: use apenas quando precisar de links e informações públicas atuais.`
        : SYSTEM_PROMPT;

      const response = await ai.generate({
        model: modelToUse,
        system: systemPrompt,
        prompt,
        tools: toolsList,
        config: generationConfig,
      });

      const extracted = extractTextFromResponse(response);
      return extracted || 'Desculpe, não consegui gerar uma resposta agora.';
    } catch (error: any) {
      console.error('[Cérebro Central] Erro ao processar:', error);
      return `Desculpe, encontrei um erro ao processar sua solicitação: ${error?.message || String(error)}. Por favor, tente novamente ou reformule sua pergunta.`;
    }
  }
);
