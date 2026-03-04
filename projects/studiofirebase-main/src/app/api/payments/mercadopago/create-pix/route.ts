/**
 * API Route: Criar Pagamento PIX via Mercado Pago
 * Gera QR Code PIX usando a conta conectada no painel admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoClient } from '@/lib/mercadopago-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, description, customer, metadata } = body;

    // Validações
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valor inválido' },
        { status: 400 }
      );
    }

    if (!customer || !customer.name || !customer.email || !customer.cpf) {
      return NextResponse.json(
        { success: false, error: 'Dados do cliente incompletos' },
        { status: 400 }
      );
    }

    // Validar CPF (11 dígitos)
    const cpfNumbers = customer.cpf.replace(/\D/g, '');
    if (cpfNumbers.length !== 11) {
      return NextResponse.json(
        { success: false, error: 'CPF inválido' },
        { status: 400 }
      );
    }

    // Criar pagamento PIX
    const mpClient = new MercadoPagoClient();
    
    const paymentData = await mpClient.createPixPayment({
      amount: Number(amount),
      email: customer.email,
      name: customer.name,
      cpf: cpfNumbers,
      description: description || 'Pagamento via PIX',
      phone: customer.phone,
      address: customer.address,
      metadata: metadata || {
        source: 'web',
        timestamp: new Date().toISOString(),
      }
    });

    return NextResponse.json({
      success: true,
      paymentId: paymentData.id,
      qrCode: paymentData.qrCode,
      qrCodeBase64: paymentData.qrCodeBase64,
      pixCopiaECola: paymentData.pixCopiaECola,
      expiresAt: paymentData.expiresAt,
    });
  } catch (error) {
    console.error('[API] Erro ao criar pagamento PIX:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar pagamento PIX',
      },
      { status: 500 }
    );
  }
}
