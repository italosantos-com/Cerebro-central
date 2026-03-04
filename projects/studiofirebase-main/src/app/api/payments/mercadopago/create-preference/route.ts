import { NextRequest, NextResponse } from 'next/server';

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

    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'MercadoPago access token não configurado' },
        { status: 500 }
      );
    }

    // Generate unique external reference
    const externalReference = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Preparar items com todas as informações recomendadas
    const preferenceItems = items || [
      {
        id: `item_${Date.now()}`,
        title: description || 'Produto',
        description: description || 'Assinatura Premium',
        category_id: 'services', // Categoria padrão para serviços
        unit_price: amount,
        quantity: 1,
        currency_id: currency || 'BRL'
      }
    ];

    // Criar preferência no MercadoPago
    const preference: Record<string, any> = {
      items: preferenceItems,
      payer: {
        name: payer?.name || '',
        surname: payer?.surname || '',
        email: payer?.email || 'customer@example.com',
        ...(payer?.phone && {
          phone: {
            area_code: payer.phone.replace(/\D/g, '').substring(0, 2),
            number: payer.phone.replace(/\D/g, '').substring(2)
          }
        }),
        ...(payer?.identification && {
          identification: {
            type: payer.identification.type || 'CPF',
            number: payer.identification.number.replace(/\D/g, '')
          }
        }),
        ...(payer?.address && {
          address: payer.address
        })
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success`,
        failure: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/failure`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/pending`
      },
      auto_return: 'approved',
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook/mercadopago`,
      statement_descriptor: 'ITALOSANTOS',
      external_reference: externalReference,
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
      ...(metadata && { metadata })
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
      },
      body: JSON.stringify(preference)
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        preferenceId: data.id,
        initPoint: data.init_point,
        sandboxInitPoint: data.sandbox_init_point
      });
    } else {
      console.error('Erro MercadoPago API:', data);
      return NextResponse.json(
        { error: 'Erro ao criar preferência', details: data },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Erro ao criar preferência MercadoPago:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
