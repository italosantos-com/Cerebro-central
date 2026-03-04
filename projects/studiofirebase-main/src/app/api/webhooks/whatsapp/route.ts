/**
 * WhatsApp Business API Webhook
 * 
 * Endpoint para receber notificações do WhatsApp:
 * - Mensagens recebidas
 * - Status de entrega
 * - Leitura de mensagens
 * 
 * Configure este webhook no Facebook Business Manager:
 * URL: https://seudominio.com/api/webhooks/whatsapp
 * 
 * Documentação:
 * - https://developers.facebook.com/docs/whatsapp/webhooks
 * - Especificação OpenAPI: /openapi/business-messaging-api_v23.0.yaml
 */

import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/services/whatsapp-business-service';
import { handleJasperMessage, isJasperDemoEnabled } from '@/services/whatsapp-jasper-bot';

/**
 * GET - Verificação do Webhook
 * Facebook envia uma requisição GET para verificar se o webhook é válido
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Parâmetros enviados pelo Facebook
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  console.log('[WhatsApp Webhook] Verificação recebida:', { mode });

  // Verificar se o modo é 'subscribe' e o token corresponde
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('[WhatsApp Webhook] ✅ Webhook verificado com sucesso!');
    
    // Retornar o challenge para completar a verificação
    return new NextResponse(challenge, { 
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  console.error('[WhatsApp Webhook] ❌ Verificação falhou: token inválido');

  return new NextResponse('Forbidden', { status: 403 });
}

/**
 * POST - Receber Notificações
 * Facebook envia notificações via POST quando eventos ocorrem
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[WhatsApp Webhook] Notificação recebida:', 
      JSON.stringify(body, null, 2)
    );

    // Verificar se é uma notificação do WhatsApp Business
    if (body.object !== 'whatsapp_business_account') {
      console.warn('[WhatsApp Webhook] Objeto desconhecido:', body.object);
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    // Processar mensagens recebidas
    const messages = whatsappService.processWebhook(body);
    
    console.log(`[WhatsApp Webhook] ${messages.length} mensagem(ns) processada(s)`);

    // Processar cada mensagem
    for (const message of messages) {
      console.log('[WhatsApp Webhook] Mensagem:', {
        from: message.from,
        text: message.text,
        type: message.type,
        timestamp: message.timestamp,
      });

      // Aqui você pode implementar sua lógica de negócio
      // Exemplos:
      // - Salvar mensagem no banco de dados
      // - Enviar notificação para admin
      // - Responder automaticamente
      // - Integrar com chatbot/IA

      // Exemplo: Marcar mensagem como lida
      if (message.messageId) {
        try {
          await whatsappService.markMessageAsRead(message.messageId, message.phoneNumberId);
          console.log('[WhatsApp Webhook] Mensagem marcada como lida:', message.messageId);
        } catch (error) {
          console.error('[WhatsApp Webhook] Erro ao marcar como lida:', error);
        }
      }

      if (isJasperDemoEnabled()) {
        try {
          await handleJasperMessage({
            phoneNumberId: message.phoneNumberId,
            sender: message.from,
            messageId: message.messageId,
            text: message.text,
            type: message.type,
            interactiveId: message.interactiveId,
            interactiveTitle: message.interactiveTitle,
          });
        } catch (error) {
          console.error('[WhatsApp Webhook] Erro ao responder Jasper:', error);
        }
      }

      // Exemplo: Responder automaticamente (descomente para usar)
      /*
      if (message.text.toLowerCase().includes('oi')) {
        await whatsappService.sendTextMessage(
          message.from,
          'Olá! Como posso ajudar você hoje?'
        );
      }
      */
    }

    // Processar status de entrega
    if (body.entry) {
      for (const entry of body.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'messages' && change.value?.statuses) {
              for (const status of change.value.statuses) {
                console.log('[WhatsApp Webhook] Status atualizado:', {
                  messageId: status.id,
                  status: status.status,
                  timestamp: status.timestamp,
                });

                // Possíveis status: sent, delivered, read, failed
                // Implemente sua lógica aqui
              }
            }
          }
        }
      }
    }

    // Sempre retornar 200 para confirmar recebimento
    return NextResponse.json({ 
      status: 'ok',
      messagesProcessed: messages.length 
    }, { status: 200 });

  } catch (error) {
    console.error('[WhatsApp Webhook] Erro ao processar notificação:', error);
    
    // Mesmo com erro, retorne 200 para evitar reenvios do Facebook
    return NextResponse.json({ 
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 });
  }
}

/**
 * Exemplo de uso em outros lugares da aplicação:
 * 
 * // Enviar mensagem de boas-vindas após cadastro
 * import { whatsappService } from '@/services/whatsapp-business-service';
 * 
 * await whatsappService.sendTextMessage(
 *   '+5511999999999',
 *   'Bem-vindo ao nosso serviço! 🎉'
 * );
 * 
 * // Enviar notificação de pagamento aprovado (template com body)
 * await whatsappService.sendTemplate(
 *   '+5511999999999',
 *   'payment_approved',
 *   'pt_BR',
 *   [
 *     { 
 *       type: 'body', 
 *       parameters: [
 *         { type: 'text', text: 'João Silva' },
 *         { type: 'text', text: 'R$ 99,90' }
 *       ]
 *     }
 *   ]
 * );
 */
