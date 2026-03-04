import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';

/**
 * Cliente oficial do Mercado Pago
 * Usa o SDK oficial para melhor integração e confiabilidade
 */
export class MercadoPagoClient {
  // Resolve o access token ativo do Mercado Pago, priorizando o conectado no Admin
  private async resolveAccessToken(): Promise<string | null> {
    try {
      const adminApp = getAdminApp();
      if (adminApp) {
        const db = getDatabase(adminApp);
        const snap = await db.ref('admin/integrations/mercadopago/access_token').get();
        const token = snap?.val();
        if (typeof token === 'string' && token.length > 0) return token;
      }
    } catch (e) {
      // Log leve e seguir para fallback de env
      console.warn('[MercadoPagoClient] Falha ao ler token do Admin DB, usando variável de ambiente');
    }

    // Fallback para variável de ambiente
    const envToken = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN || null;
    return envToken || null;
  }

  // Cria uma instância do cliente Payment com o token resolvido
  private async getPaymentClient(): Promise<Payment> {
    const accessToken = await this.resolveAccessToken();
    if (!accessToken) {
      throw new Error('Token do Mercado Pago não configurado. Conecte uma conta em Admin > Integrações ou defina MERCADOPAGO_ACCESS_TOKEN.');
    }
    const client = new MercadoPagoConfig({ accessToken });
    return new Payment(client);
  }

  async createPixPayment(data: {
    amount: number;
    email: string;
    name: string;
    description?: string;
    cpf: string; // CPF obrigatório
    phone?: string;
    address?: {
      zip_code?: string;
      street_name?: string;
      street_number?: string;
      neighborhood?: string;
      city?: string;
      federal_unit?: string;
    };
    metadata?: Record<string, any>;
  }) {
    try {
      const payment = await this.getPaymentClient();

      // Preparar dados do pagamento conforme documentação oficial
      const paymentData: Record<string, unknown> = {
        transaction_amount: data.amount,
        description: data.description || 'Assinatura VIP Studio',
        payment_method_id: 'pix',
        external_reference: `pix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        payer: {
          email: data.email,
          first_name: data.name.split(' ')[0] || data.name,
          last_name: data.name.split(' ').slice(1).join(' ') || '',
          identification: {
            type: 'CPF',
            number: data.cpf.replace(/\D/g, '') // Apenas números
          }
        }
      };

      // Add optional phone if provided
      if (data.phone) {
        (paymentData.payer as any).phone = {
          area_code: data.phone.replace(/\D/g, '').substring(0, 2),
          number: data.phone.replace(/\D/g, '').substring(2)
        };
      }

      // Add optional address if provided
      if (data.address) {
        (paymentData.payer as any).address = data.address;
      }

      // Add metadata for tracking
      if (data.metadata) {
        paymentData.metadata = data.metadata;
      }

      // Adicionar notification_url para webhook do Firebase
      const firebaseWebhookUrl = `https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net/mercadopagoWebhook`;
      paymentData.notification_url = firebaseWebhookUrl;



      // Preparar opções com idempotency key para produção
      const options: Record<string, unknown> = {};
      if (process.env.NODE_ENV === 'production') {
        options.requestOptions = {
          customHeaders: {
            'X-Idempotency-Key': `pix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }
        };
      }



      // Criar pagamento
      const response = await payment.create({
        body: paymentData,
        ...options
      });



      // Extrair dados do PIX
      const pixData = response.point_of_interaction?.transaction_data;

      if (!pixData?.qr_code) {
        throw new Error('QR Code não encontrado na resposta do Mercado Pago');
      }

      // Calcular data de expiração (padrão: 30 minutos)
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      return {
        id: response.id,
        qrCode: pixData.qr_code,
        qrCodeBase64: pixData.qr_code_base64,
        pixCopiaECola: pixData.qr_code, // O qr_code é o código "copia e cola"
        status: response.status,
        amount: response.transaction_amount,
        description: response.description,
        payer: response.payer,
        expiresAt
      };

    } catch (error: any) {


      // Tratar erros específicos do Mercado Pago
      if (error.message) {
        if (error.message.includes('invalid_parameter')) {
          throw new Error('Dados inválidos. Verifique o CPF e tente novamente.');
        } else if (error.message.includes('unauthorized')) {
          throw new Error('Token de acesso inválido. Verifique as configurações.');
        } else if (error.message.includes('rate_limit')) {
          throw new Error('Muitas tentativas. Aguarde um momento e tente novamente.');
        } else if (error.message.includes('invalid_amount')) {
          throw new Error('Valor inválido para pagamento PIX.');
        } else if (error.message.includes('invalid_email')) {
          throw new Error('Email inválido para pagamento PIX.');
        }
      }

      throw error;
    }
  }

  async getPayment(paymentId: string, maxRetries = 3, delayMs = 2000) {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const payment = await this.getPaymentClient();
        const response = await payment.get({ id: paymentId });



        return response;

      } catch (error: unknown) {
        lastError = error;


        if (attempt < maxRetries) {

          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError || new Error('Não foi possível buscar o pagamento');
  }

  async isPaymentApproved(paymentId: string) {
    try {
      const payment = await this.getPayment(paymentId, 1, 1000);
      return payment.status === 'approved';
    } catch (error) {

      return false;
    }
  }

  async listRecentPayments(limit = 10) {
    try {
      const payment = await this.getPaymentClient();
      const response: any = await payment.search({
        filters: {
          status: 'approved',
          payment_method_id: 'pix'
        },
        limit: limit
      } as any);

      return (response.results || []).map((payment: any) => ({
        id: payment.id,
        status: payment.status,
        transaction_amount: payment.transaction_amount,
        payment_method_id: payment.payment_method_id,
        payer: {
          email: payment.payer?.email,
          first_name: payment.payer?.first_name,
          last_name: payment.payer?.last_name,
          identification: payment.payer?.identification
        },
        date_created: payment.date_created,
        date_approved: payment.date_approved
      }));

    } catch (error) {
      throw error;
    }
  }

  async listAllRecentPayments(limit = 20) {
    try {
      const payment = await this.getPaymentClient();
      const response: any = await payment.search({
        filters: {}, // Sem filtros para buscar todos os status
        limit: limit
      } as any);

      return (response.results || []).map((payment: any) => ({
        id: payment.id,
        status: payment.status,
        transaction_amount: payment.transaction_amount,
        payment_method_id: payment.payment_method_id,
        payer: {
          email: payment.payer?.email,
          first_name: payment.payer?.first_name,
          last_name: payment.payer?.last_name,
          identification: payment.payer?.identification
        },
        date_created: payment.date_created,
        date_approved: payment.date_approved,
        date_last_updated: payment.date_last_updated,
        description: payment.description
      }));

    } catch (error) {
      throw error;
    }
  }
}

export const mercadopagoClient = new MercadoPagoClient();
