import { NextResponse } from 'next/server';

const SMS_ENDPOINT =
  process.env.SMS_ENDPOINT ||
  process.env.NEXT_PUBLIC_SMS_ENDPOINT ||
  'https://sms-email-code-479719049222.europe-west1.run.app';

const SMS_API_KEY = process.env.SMS_API_KEY || process.env.NEXT_PUBLIC_SMS_API_KEY || '';

export async function POST(request: Request) {
  try {
    if (!SMS_API_KEY) {
      return NextResponse.json(
        { error: 'SMS_API_KEY não configurada no servidor.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const phone = body?.phone;

    if (!phone) {
      return NextResponse.json({ error: 'Telefone é obrigatório.' }, { status: 400 });
    }

    const response = await fetch(`${SMS_ENDPOINT}/v1/sms/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SMS_API_KEY
      },
      body: JSON.stringify({ phone })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Falha ao enviar SMS.', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro interno ao enviar SMS.' },
      { status: 500 }
    );
  }
}
