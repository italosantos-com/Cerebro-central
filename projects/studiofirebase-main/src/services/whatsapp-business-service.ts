/**
 * WhatsApp Business API Service
 * 
 * Serviço para integração com a WhatsApp Business API usando a especificação OpenAPI
 * Localização da spec: /openapi/business-messaging-api_v23.0.yaml
 * 
 * Documentação: https://developers.facebook.com/docs/whatsapp
 */

import axios, { AxiosInstance } from 'axios';

// Tipos baseados na especificação OpenAPI
interface WhatsAppMessage {
  messaging_product: 'whatsapp';
  recipient_type?: 'individual';
  to: string;
  type: 'text' | 'image' | 'video' | 'document' | 'template' | 'interactive';
  text?: {
    body: string;
    preview_url?: boolean;
  };
  image?: {
    link?: string;
    id?: string;
    caption?: string;
  };
  video?: {
    link?: string;
    id?: string;
    caption?: string;
  };
  document?: {
    link?: string;
    id?: string;
    caption?: string;
    filename?: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<Record<string, any>>;
  };
  interactive?: {
    type: 'button';
    body: {
      text: string;
    };
    action: {
      buttons: Array<{
        type: 'reply';
        reply: {
          id: string;
          title: string;
        };
      }>;
    };
  };
}

interface WhatsAppMessageResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

interface WhatsAppQrCodeResponse {
  code: string;
  prefilled_message: string;
  deep_link_url: string;
  qr_image_url?: string;
}

interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: {
            body: string;
          };
          type: string;
          interactive?: {
            type: string;
            button_reply?: {
              id: string;
              title: string;
            };
          };
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp?: string;
          recipient_id?: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

/**
 * Classe para interagir com a WhatsApp Business API
 */
export class WhatsAppBusinessService {
  private client: AxiosInstance;
  private phoneNumberId: string;
  private apiVersion: string;

  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v23.0';
    
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    
    if (!accessToken || !this.phoneNumberId) {
      console.warn('WhatsApp API credentials not configured');
    }

    this.client = axios.create({
      baseURL: `https://graph.facebook.com/${this.apiVersion}`,
      headers: {
        'Authorization': accessToken ? `Bearer ${accessToken}` : '',
        'Content-Type': 'application/json',
      },
    });
  }

  private resolvePhoneNumberId(phoneNumberId?: string) {
    const resolved = (phoneNumberId || this.phoneNumberId || '').trim();
    if (!resolved) {
      throw new Error('WhatsApp phone_number_id não configurado.');
    }
    return resolved;
  }

  private async postMessage(payload: Record<string, any>, phoneNumberId?: string) {
    const resolvedPhoneNumberId = this.resolvePhoneNumberId(phoneNumberId);
    return this.client.post(`/${resolvedPhoneNumberId}/messages`, payload);
  }

  /**
   * Retorna o status da configuração da API do WhatsApp
   */
  getConfigStatus(): { ok: boolean; missing: string[] } {
    const missing: string[] = [];

    if (!process.env.WHATSAPP_ACCESS_TOKEN) missing.push('WHATSAPP_ACCESS_TOKEN');
    if (!process.env.WHATSAPP_PHONE_NUMBER_ID) missing.push('WHATSAPP_PHONE_NUMBER_ID');

    return {
      ok: missing.length === 0,
      missing,
    };
  }

  /**
   * Envia uma mensagem de texto simples
   */
  async sendTextMessage(
    to: string,
    message: string,
    previewUrl: boolean = false,
    phoneNumberId?: string
  ): Promise<WhatsAppMessageResponse> {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp API não está configurada. Verifique as variáveis de ambiente.');
    }

    try {
      const payload: WhatsAppMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
          body: message,
          preview_url: previewUrl,
        },
      };

      const response = await this.postMessage(payload, phoneNumberId);

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Erro ao enviar mensagem WhatsApp: ${errorMessage}`, { cause: error });
    }
  }

  /**
   * Envia uma imagem
   */
  async sendImage(
    to: string,
    imageUrl: string,
    caption?: string,
    phoneNumberId?: string
  ): Promise<WhatsAppMessageResponse> {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp API não está configurada. Verifique as variáveis de ambiente.');
    }

    try {
      const payload: WhatsAppMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'image',
        image: {
          link: imageUrl,
          caption,
        },
      };

      const response = await this.postMessage(payload, phoneNumberId);

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Erro ao enviar imagem WhatsApp: ${errorMessage}`, { cause: error });
    }
  }

  /**
   * Envia um vídeo
   */
  async sendVideo(
    to: string,
    videoUrl: string,
    caption?: string,
    phoneNumberId?: string
  ): Promise<WhatsAppMessageResponse> {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp API não está configurada. Verifique as variáveis de ambiente.');
    }

    try {
      const payload: WhatsAppMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'video',
        video: {
          link: videoUrl,
          caption,
        },
      };

      const response = await this.postMessage(payload, phoneNumberId);

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Erro ao enviar vídeo WhatsApp: ${errorMessage}`, { cause: error });
    }
  }

  /**
   * Envia um documento
   */
  async sendDocument(
    to: string,
    documentUrl: string,
    filename?: string,
    caption?: string,
    phoneNumberId?: string
  ): Promise<WhatsAppMessageResponse> {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp API não está configurada. Verifique as variáveis de ambiente.');
    }

    try {
      const payload: WhatsAppMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'document',
        document: {
          link: documentUrl,
          filename,
          caption,
        },
      };

      const response = await this.postMessage(payload, phoneNumberId);

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Erro ao enviar documento WhatsApp: ${errorMessage}`, { cause: error });
    }
  }

  /**
   * Envia um template de mensagem (para notificações)
   * 
   * @param to - Número do destinatário
   * @param templateName - Nome do template aprovado no WhatsApp
   * @param languageCode - Código do idioma (ex: 'pt_BR', 'en_US')
   * @param components - Componentes do template (header, body, footer, buttons)
   *                     Se não fornecido, envia template sem parâmetros
   * 
   * @example
   * // Template simples com parâmetros no body
   * await sendTemplate('+5511999999999', 'hello_world', 'pt_BR', [
   *   { type: 'body', parameters: [{ type: 'text', text: 'João' }] }
   * ]);
   * 
   * @example
   * // Template com header e body
   * await sendTemplate('+5511999999999', 'order_confirmation', 'pt_BR', [
   *   { type: 'header', parameters: [{ type: 'text', text: 'Pedido #123' }] },
   *   { type: 'body', parameters: [{ type: 'text', text: 'João Silva' }] }
   * ]);
   */
  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string = 'pt_BR',
    components?: Array<{
      type: string;
      sub_type?: string;
      index?: number;
      parameters?: Array<Record<string, any>>;
      cards?: Array<Record<string, any>>;
    }>,
    phoneNumberId?: string
  ): Promise<WhatsAppMessageResponse> {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp API não está configurada. Verifique as variáveis de ambiente.');
    }

    try {
      const payload: WhatsAppMessage = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
          ...(components && components.length > 0 && {
            components,
          }),
        },
      };

      const response = await this.postMessage(payload, phoneNumberId);

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Erro ao enviar template WhatsApp: ${errorMessage}`, { cause: error });
    }
  }

  /**
   * Marca uma mensagem como lida
   */
  async markMessageAsRead(
    messageId: string,
    phoneNumberId?: string
  ): Promise<{ success: boolean }> {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp API não está configurada. Verifique as variáveis de ambiente.');
    }

    try {
      const response = await this.client.post(
        `/${this.resolvePhoneNumberId(phoneNumberId)}/messages`,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }
      );

      return { success: response.data.success !== false };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Erro ao marcar mensagem como lida: ${errorMessage}`, { cause: error });
    }
  }

  /**
   * Gera ou atualiza um QR Code de mensagem para o WhatsApp Business
   */
  async createMessageQrCode(params: {
    prefilledMessage: string;
    generateQrImage?: 'SVG' | 'PNG';
    code?: string;
  }, phoneNumberId?: string): Promise<WhatsAppQrCodeResponse> {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp API não está configurada. Verifique as variáveis de ambiente.');
    }

    try {
      const payload: Record<string, any> = {
        prefilled_message: params.prefilledMessage,
      };

      if (params.generateQrImage) {
        payload.generate_qr_image = params.generateQrImage;
      }

      if (params.code) {
        payload.code = params.code;
      }

      console.info('[WhatsApp][QR] Gerando QR code...', {
        hasCode: !!params.code,
        image: params.generateQrImage || 'none',
      });

      const response = await this.client.post(
        `/${this.resolvePhoneNumberId(phoneNumberId)}/message_qrdls`,
        payload
      );

      console.info('[WhatsApp][QR] QR code gerado com sucesso', {
        code: response?.data?.code,
      });

      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      const apiError = error.response?.data?.error;
      const errorMessage = apiError?.message || error.message;
      console.error('[WhatsApp][QR] Falha ao gerar QR code', error.response?.data || errorMessage);
      const enrichedError = new Error(`Erro ao gerar QR code WhatsApp: ${errorMessage}`) as Error & {
        status?: number;
        details?: any;
      };
      if (status) enrichedError.status = status;
      if (apiError) enrichedError.details = apiError;
      throw enrichedError;
    }
  }

  /**
   * Processa webhook do WhatsApp
   * Extrai mensagens recebidas do payload
   */
  processWebhook(payload: WhatsAppWebhookPayload): Array<{
    from: string;
    messageId: string;
    timestamp: string;
    text: string;
    type: string;
    phoneNumberId?: string;
    interactiveId?: string;
    interactiveTitle?: string;
  }> {
    const messages: Array<{
      from: string;
      messageId: string;
      timestamp: string;
      text: string;
      type: string;
      phoneNumberId?: string;
      interactiveId?: string;
      interactiveTitle?: string;
    }> = [];

    if (payload.object === 'whatsapp_business_account') {
      payload.entry?.forEach((entry) => {
        entry.changes?.forEach((change) => {
          if (change.field === 'messages' && change.value.messages) {
            const phoneNumberId = change.value.metadata?.phone_number_id;
            change.value.messages.forEach((message) => {
              const interactiveId = message.interactive?.button_reply?.id;
              const interactiveTitle = message.interactive?.button_reply?.title;
              const text =
                message.text?.body ||
                interactiveTitle ||
                '';
              messages.push({
                from: message.from,
                messageId: message.id,
                timestamp: message.timestamp,
                text,
                type: message.type,
                phoneNumberId,
                interactiveId,
                interactiveTitle,
              });
            });
          }
        });
      });
    }

    return messages;
  }

  /**
   * Verifica se o serviço está configurado corretamente
   */
  isConfigured(): boolean {
    return this.getConfigStatus().ok;
  }

  /**
   * Envia mensagem interativa com botões de resposta rápida
   */
  async sendInteractiveButtons(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>,
    phoneNumberId?: string
  ): Promise<WhatsAppMessageResponse> {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp API não está configurada. Verifique as variáveis de ambiente.');
    }

    try {
      const payload: WhatsAppMessage = {
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: bodyText,
          },
          action: {
            buttons: buttons.map((cta) => ({
              type: 'reply',
              reply: {
                id: cta.id,
                title: cta.title,
              },
            })),
          },
        },
      };

      const response = await this.postMessage(payload, phoneNumberId);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Erro ao enviar mensagem interativa WhatsApp: ${errorMessage}`, { cause: error });
    }
  }
}

// Exportar instância singleton
export const whatsappService = new WhatsAppBusinessService();

// Exportar tipos para uso externo
export type {
  WhatsAppMessage,
  WhatsAppMessageResponse,
  WhatsAppWebhookPayload,
  WhatsAppQrCodeResponse,
};
