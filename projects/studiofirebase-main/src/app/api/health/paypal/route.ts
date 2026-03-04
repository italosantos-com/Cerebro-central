import { NextResponse } from 'next/server';
import { withCache } from '@/lib/healthCache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function head(url: string) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return { status: res.status, ok: res.ok };
  } catch (e: any) {
    return { status: 0, ok: false, error: e?.message || 'Erro network' };
  }
}

export async function GET() {
  const start = Date.now();
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ ok: false, stage: 'precheck', missing: ['NEXT_PUBLIC_PAYPAL_CLIENT_ID'], ms: Date.now() - start });
  }
  const ttl = Number(process.env.HEALTH_CACHE_SECONDS || '30');
  const result = await withCache(`paypal:${clientId}`, ttl, async () => {
    const sdkUrl = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=BRL`;
    const primary = await head(sdkUrl);
    let hint: string | undefined;
    if (!primary.ok) {
      hint = 'Possível bloqueio por firewall ou extensão (content blocker). Verificar *.paypal.com.';
    }
    return {
      ok: primary.ok,
      clientIdPresent: true,
      sdkStatus: primary.status,
      error: primary.ok ? undefined : primary.error,
      hint
    };
  });
  return NextResponse.json({ ...result.data, cached: result.cached, ageMs: result.age, ms: Date.now() - start });
}
