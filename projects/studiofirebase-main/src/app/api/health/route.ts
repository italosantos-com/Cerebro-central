import { NextResponse } from 'next/server';

// Importa handlers específicos para agregar sem requisições externas
import * as SmtpHealth from '@/app/api/health/smtp/route';
import * as PaypalHealth from '@/app/api/health/paypal/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();
  let smtp: any;
  let paypal: any;

  // Tenta executar os sub-handlers diretamente (cada GET retorna NextResponse)
  try {
    const r = await (SmtpHealth as any).GET();
    smtp = await r.json();
  } catch (e: any) {
    smtp = { ok: false, error: e?.message || 'smtp handler error' };
  }
  try {
    const r = await (PaypalHealth as any).GET();
    paypal = await r.json();
  } catch (e: any) {
    paypal = { ok: false, error: e?.message || 'paypal handler error' };
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    aggregated: {
      smtp,
      paypal,
      overallOk: Boolean(smtp.ok && paypal.ok)
    },
    ms: Date.now() - start
  });
}
