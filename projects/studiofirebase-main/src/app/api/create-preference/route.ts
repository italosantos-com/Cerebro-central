import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Configurar MercadoPago com token de acesso
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const {
      amount,
      currency,
      description,
      payer,
      items,
      metadata
    } = await request.json();

    // Criar nova preferência
    const preference = new Preference(client);

    // Generate unique external reference
    const externalReference = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Preparar items com informações completas
    const preferenceItems = items || [
      {
        id: `item_${Date.now()}`,
        title: description || 'Assinatura Premium',
        description: description || 'Assinatura Premium',
        category_id: 'services', // Categoria padrão
        unit_price: parseFloat(amount),
        quantity: 1,
        currency_id: currency || 'BRL',
      }
    ];

    const preferenceBody: Record<string, any> = {
      items: preferenceItems,
      payer: {
        name: payer?.name || '',
        surname: payer?.surname || '',
        email: payer?.email || 'test@example.com', // Email do comprador
        ...(payer?.phone && {
          phone: {
            area_code: payer.phone.replace(/\D/g, '').substring(0, 2),
            number: payer.phone.replace(/\D/g, '').substring(2)
          }
        }),
        ...(payer?.address && {
          address: payer.address
        })
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/payment/success`,
        failure: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/payment/failure`,
        pending: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/payment/pending`,
      },
      auto_return: 'approved',
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12, // Até 12 parcelas
      },
      statement_descriptor: 'PREMIUM ACCESS',
      external_reference: externalReference,
      notification_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/webhook/mercadopago`,
    };

    // Add metadata if provided
    if (metadata) {
      preferenceBody.metadata = metadata;
    }

    const result = await preference.create({
      body: preferenceBody,
    });

    return NextResponse.json({
      preferenceId: result.id,
      initPoint: result.init_point,
      sandboxInitPoint: result.sandbox_init_point,
    });

  } catch (error) {
    console.error('Erro ao criar preferência MercadoPago:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
