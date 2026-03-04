import { NextRequest, NextResponse } from 'next/server';
import { mercadopagoClient } from '@/lib/mercadopago-client';

interface CreatePixRequest {
  email: string;
  name: string;
  amount: number;
  description?: string;
  cpf: string; // CPF obrigatório
}

export async function POST(request: NextRequest) {
  try {
    const { email, name, amount, description, cpf }: CreatePixRequest = await request.json();

    console.log('🔍 [PIX CREATE OFFICIAL] Criando PIX oficial:', { email, amount, cpf });

    // Validações
    if (!email || !name || !amount || !cpf) {
      return NextResponse.json({
        success: false,
        error: 'Email, nome, valor e CPF são obrigatórios'
      }, { status: 400 });
    }

    // Limpar CPF (apenas números)
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return NextResponse.json({
        success: false,
        error: 'CPF deve ter 11 dígitos'
      }, { status: 400 });
    }

    // Validar valor
    if (amount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Valor deve ser maior que zero'
      }, { status: 400 });
    }

    try {
      // Usar APENAS o cliente oficial do Mercado Pago
      const pixResult = await mercadopagoClient.createPixPayment({
        amount,
        email,
        name,
        description: description || 'Assinatura VIP Studio',
        cpf: cleanCpf
      });

      console.log('✅ [PIX CREATE OFFICIAL] PIX criado com sucesso:', pixResult.id);

      return NextResponse.json({
        success: true,
        paymentId: pixResult.id,
        pixData: {
          qrCode: pixResult.qrCode, // QR Code oficial do Mercado Pago
          qrCodeBase64: pixResult.qrCodeBase64, // QR Code em Base64 oficial
          status: pixResult.status,
          amount: pixResult.amount,
          description: pixResult.description
        },
        message: 'PIX criado com sucesso usando métodos oficiais do Mercado Pago'
      });

    } catch (error: any) {
      console.error('❌ [PIX CREATE OFFICIAL] Erro ao criar PIX:', error);
      
      return NextResponse.json({
        success: false,
        error: error.message || 'Erro ao criar PIX',
        details: 'Erro na integração com Mercado Pago'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ [PIX CREATE OFFICIAL] Erro geral:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'API para criar PIX usando APENAS métodos oficiais do Mercado Pago',
    usage: 'POST /api/pix/create-official com { email, name, amount, cpf, description? }',
    features: [
      'Usa SDK oficial do Mercado Pago',
      'QR Code oficial gerado pelo Mercado Pago',
      'CPF obrigatório para verificação',
      'Webhook automático para confirmação',
      'Validações oficiais do Mercado Pago'
    ]
  });
}
