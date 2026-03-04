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

    console.log('🔍 [PIX CREATE] Criando PIX:', { email, name, amount, cpf });

    // Validação básica
    if (!email || !name || !amount || !cpf) {
      return NextResponse.json(
        { error: 'Dados incompletos. Email, nome, valor e CPF são obrigatórios.' },
        { status: 400 }
      );
    }

    // Validar CPF (formato básico)
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return NextResponse.json(
        { error: 'CPF inválido. Deve conter 11 dígitos.' },
        { status: 400 }
      );
    }

    // Validar valor
    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Valor deve ser maior que zero.' },
        { status: 400 }
      );
    }

    try {
      // Criar PIX usando o cliente oficial com CPF
      const pixResult = await mercadopagoClient.createPixPayment({
        amount,
        email,
        name,
        description: description || 'Assinatura VIP Studio',
        cpf: cleanCpf // CPF limpo (apenas números)
      });

      console.log('✅ [PIX CREATE] PIX criado com sucesso:', pixResult.id);

      return NextResponse.json({
        success: true,
        paymentId: pixResult.id,
        pixData: {
          qrCode: pixResult.qrCode,
          qrCodeBase64: pixResult.qrCodeBase64
        },
        message: 'PIX gerado com sucesso!'
      });

    } catch (error: any) {
      console.error('❌ [PIX CREATE] Erro ao criar PIX:', error);
      
      let errorMessage = 'Erro interno do servidor. Tente novamente.';
      
      if (error.message) {
        if (error.message.includes('invalid_parameter')) {
          errorMessage = 'Dados inválidos. Verifique o CPF e tente novamente.';
        } else if (error.message.includes('unauthorized')) {
          errorMessage = 'Erro de autenticação. Tente novamente.';
        } else if (error.message.includes('rate_limit')) {
          errorMessage = 'Muitas tentativas. Aguarde um momento e tente novamente.';
        } else {
          errorMessage = error.message;
        }
      }
      
      return NextResponse.json({
        success: false,
        error: errorMessage
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ [PIX CREATE] Erro geral:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor. Tente novamente.'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'API para criação de pagamentos PIX',
    usage: 'POST /api/pix/create com { email, name, amount, description?, cpf }'
  });
}
