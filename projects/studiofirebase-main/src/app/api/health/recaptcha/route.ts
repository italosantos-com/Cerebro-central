import { NextResponse } from 'next/server';
import { withCache } from '@/lib/healthCache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function check(siteKey: string) {
  const url = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return { reachable: res.ok, status: res.status };
  } catch (e: any) {
    return { reachable: false, status: 0, error: e?.message || 'network error' };
  }
}

export async function GET() {
  const start = Date.now();
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) {
    return NextResponse.json({ ok: false, missing: ['NEXT_PUBLIC_RECAPTCHA_SITE_KEY'], ms: Date.now() - start });
  }
  const ttl = Number(process.env.HEALTH_CACHE_SECONDS || '30');
  const result = await withCache(`recaptcha:${siteKey}`, ttl, async () => {
    const r = await check(siteKey);
    let hint: string | undefined;
    if (!r.reachable) {
      hint = 'Possível bloqueio de rede/extensão. Verifique acesso a google.com e content blockers.';
    }
    return { ok: r.reachable, siteKeyPresent: true, status: r.status, error: r.error, hint };
  });
  return NextResponse.json({ ...result.data, cached: result.cached, ageMs: result.age, ms: Date.now() - start });
}
