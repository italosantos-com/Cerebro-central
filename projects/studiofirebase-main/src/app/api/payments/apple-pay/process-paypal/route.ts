import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { order_id, payment_token, amount, currency } = await request.json();

    if (!order_id || !payment_token) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos' },
        { status: 400 }
      );
    }

    // 1. Capturar ordem no PayPal
    const paypalAuth = Buffer.from(
      `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    const mode = process.env.NEXT_PUBLIC_PAYPAL_MODE || 'sandbox';
    const baseUrl = mode === 'live' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';

    // Obter access token
    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${paypalAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) {
      throw new Error('Falha ao obter token PayPal');
    }

    const { access_token } = await tokenResponse.json();

    // Capturar ordem
    const captureResponse = await fetch(
      `${baseUrl}/v2/checkout/orders/${order_id}/capture`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`,
        },
      }
    );

    if (!captureResponse.ok) {
      const error = await captureResponse.json();
      throw new Error(`Falha ao capturar ordem: ${JSON.stringify(error)}`);
    }

    const captureData = await captureResponse.json();

    // 2. Registrar pagamento no banco de dados (Firebase, etc)
    // ... seu código aqui ...

    return NextResponse.json({
      success: true,
      transaction_id: captureData.id,
      capture_id: captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id,
      status: captureData.status,
      amount: amount,
      currency: currency,
      payment_method: 'apple_pay',
      payment_token: payment_token,
    });
  } catch (error: any) {
    console.error('Erro ao processar Apple Pay via PayPal:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar pagamento' },
      { status: 500 }
    );
  }
}
