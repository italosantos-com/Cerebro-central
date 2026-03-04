import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || '';
  if (!clientId) {
    return NextResponse.json({ ok: false, error: 'Missing PayPal client ID' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, clientId });
}
