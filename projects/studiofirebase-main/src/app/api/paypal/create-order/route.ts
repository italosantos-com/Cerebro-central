import { NextRequest, NextResponse } from 'next/server';
import { fetchPaypalAccessToken, resolvePaypalApiConfig } from '@/lib/paypal-server';

export async function POST(request: NextRequest) {
  try {
    const { amount, currency = 'BRL', description = 'Assinatura Premium' } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Valor é obrigatório e deve ser maior que zero'
      }, { status: 400 });
    }

    const paypalConfig = resolvePaypalApiConfig();
    const accessToken = await fetchPaypalAccessToken(paypalConfig);

    // Criar pedido
    const response = await fetch(`${paypalConfig.baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount.toString(),
            },
            description: description,
          },
        ],
      }),
    });

    const orderData = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        orderId: orderData.id,
        orderData: orderData
      });
    } else {
      console.error('Erro ao criar pedido PayPal:', orderData);
      return NextResponse.json({
        success: false,
        error: 'Erro ao criar pedido PayPal',
        details: orderData
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Erro na API create-order:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
