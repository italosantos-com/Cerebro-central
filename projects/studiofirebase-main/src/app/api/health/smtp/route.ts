import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { withCache } from '@/lib/healthCache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isICloudHost(host?: string | null) {
  const h = String(host || '').toLowerCase();
  return h.includes('smtp.mail.me.com') || h.includes('smtp.mail.icloud.com') || h.includes('smtp.me.com');
}

function buildConfig() {
  const smtpUrl =
    process.env.SMTP_URL ||
    process.env.SMTP_CONNECTION_URL ||
    process.env.SMTP_CONNECTION_URI ||
    process.env.MAILER_URL;

  // Se SMTP_URL está definido, use-o diretamente.
  // (Mantém as flags TLS para diagnóstico via verify())
  if (smtpUrl) {
    let minVersion = process.env.SMTP_MIN_TLS || 'TLSv1.2';
    const allowed = ['TLSv1', 'TLSv1.1', 'TLSv1.2', 'TLSv1.3'];
    if (!allowed.includes(minVersion)) minVersion = 'TLSv1.2';
    const rejectUnauthorized = process.env.SMTP_TLS_REJECT_UNAUTH !== 'false';
    return {
      url: smtpUrl,
      tls: { minVersion, rejectUnauthorized },
    };
  }

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user =
    process.env.SMTP_USER ||
    process.env.SMTP_USERNAME ||
    process.env.EMAIL_SMTP_USER ||
    process.env.EMAIL_SMTP_USERNAME;
  let pass =
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.EMAIL_SMTP_PASS ||
    process.env.EMAIL_SMTP_PASSWORD;

  // iCloud App Password pode vir com espaços (exibição padrão da Apple)
  // Remover separadores (espaços/hífens) evita auth 535.
  if (isICloudHost(host) && pass) {
    const normalized = pass.replace(/[^A-Za-z0-9]/g, '');
    if (normalized && normalized !== pass) pass = normalized;
  }
  const secure = process.env.SMTP_SECURE === 'true';
  const requireTLS = process.env.SMTP_REQUIRE_TLS === 'true';
  const ignoreTLS = process.env.SMTP_IGNORE_TLS === 'true';
  let minVersion = process.env.SMTP_MIN_TLS || 'TLSv1.2';
  const allowed = ['TLSv1', 'TLSv1.1', 'TLSv1.2', 'TLSv1.3'];
  if (!allowed.includes(minVersion)) minVersion = 'TLSv1.2';
  const rejectUnauthorized = process.env.SMTP_TLS_REJECT_UNAUTH !== 'false';
  return {
    host,
    port,
    auth: user && pass ? { user, pass } : undefined,
    authMethod: isICloudHost(host) ? 'LOGIN' : undefined,
    secure,
    requireTLS,
    ignoreTLS,
    tls: { minVersion, rejectUnauthorized }
  };
}

export async function GET() {
  const deliveryMode = (process.env.EMAIL_DELIVERY_MODE || 'firebase-auth').toLowerCase();
  if (deliveryMode !== 'smtp') {
    return NextResponse.json(
      {
        ok: true,
        disabled: true,
        deliveryMode,
        message:
          'SMTP desativado. Este projeto usa emails nativos do Firebase Auth no client (sem SMTP e sem extensão).',
      },
      { status: 200 }
    );
  }

  const start = Date.now();
  const cfg = buildConfig();

  // Caso SMTP_URL esteja presente, rodar verify() via URL.
  if ((cfg as any).url) {
    const ttl = Number(process.env.HEALTH_CACHE_SECONDS || '30');
    const result = await withCache('smtpHealth', ttl, async () => {
      let connectionOk = false;
      let verifyOk = false;
      let error: string | undefined;
      let hint: string | undefined;
      try {
        const transport = nodemailer.createTransport((cfg as any).url, {
          tls: (cfg as any).tls,
        } as any);
        await transport.verify();
        connectionOk = true;
        verifyOk = true;
      } catch (e: any) {
        error = e?.message || 'Erro desconhecido';
        const lower = error?.toLowerCase() || '';
        if (lower.includes('wrong version number')) hint = 'Porta ou STARTTLS incorretos (use 587 secure=false).';
        else if (lower.includes('invalid login') || lower.includes('535')) hint = 'Credenciais inválidas.';
        else if (lower.includes('missing credentials')) hint = 'Credenciais ausentes/secret não carregado. Verifique SMTP_URL (user:pass) ou variáveis/secret manager.';
        else if (lower.includes('self signed') || lower.includes('unable to verify')) hint = 'Certificado não confiável (SMTP_TLS_REJECT_UNAUTH=false para teste).';
        else if (lower.includes('timeout')) hint = 'Timeout de conexão: verificar rede/firewall.';
        else if (lower.includes('handshake')) hint = 'Problema handshake TLS: testar ignoreTLS=true para diagnosticar.';
        else hint = 'Verificar variáveis e rede.';
      }
      return {
        ok: connectionOk && verifyOk,
        connectionOk,
        verifyOk,
        error,
        hint,
        config: { mode: 'url', hasUrl: true },
      };
    });

    const payload = { ...result.data, cached: result.cached, ageMs: result.age, ms: Date.now() - start };
    return NextResponse.json(payload, {
      status: payload.ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const missing = [] as string[];
  if (!cfg.host) missing.push('SMTP_HOST');
  if (!cfg.auth?.user) missing.push('SMTP_USER');
  if (!cfg.auth?.pass) missing.push('SMTP_PASS');
  if (missing.length) {
    return NextResponse.json({
      ok: false,
      stage: 'precheck',
      missing,
      authMeta: {
        userPresent: !!cfg.auth?.user,
        passLength: cfg.auth?.pass ? String(cfg.auth.pass).length : 0,
      },
      config: { ...cfg, auth: { user: cfg.auth?.user ? '***' : undefined } },
      ms: Date.now() - start,
    }, {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
  const ttl = Number(process.env.HEALTH_CACHE_SECONDS || '30');
  const result = await withCache('smtpHealth', ttl, async () => {
    let connectionOk = false;
    let verifyOk = false;
    let error: string | undefined;
    let hint: string | undefined;
    try {
      const transport = nodemailer.createTransport(cfg as any);
      await transport.verify();
      connectionOk = true;
      verifyOk = true;
    } catch (e: any) {
      error = e?.message || 'Erro desconhecido';
      const lower = error?.toLowerCase() || '';
      if (lower.includes('wrong version number')) hint = 'Porta ou STARTTLS incorretos (use 587 secure=false).';
      else if (lower.includes('invalid login') || lower.includes('535')) {
        hint = 'Credenciais inválidas.';
        if (isICloudHost(cfg.host)) {
          hint += ' iCloud Mail exige senha app-specific (Apple ID com 2FA) e SMTP_USER deve ser o email completo.';
        } else {
          hint += ' Verifique usuário/senha e se o provedor exige senha de app (2FA).';
        }
      }
      else if (lower.includes('self signed') || lower.includes('unable to verify')) hint = 'Certificado não confiável (SMTP_TLS_REJECT_UNAUTH=false para teste).';
      else if (lower.includes('timeout')) hint = 'Timeout de conexão: verificar rede/firewall.';
      else if (lower.includes('handshake')) hint = 'Problema handshake TLS: testar ignoreTLS=true para diagnosticar.';
      else hint = 'Verificar variáveis e rede.';
    }
    return {
      ok: connectionOk && verifyOk,
      connectionOk,
      verifyOk,
      error,
      hint,
      authMeta: {
        userPresent: !!cfg.auth?.user,
        passLength: cfg.auth?.pass ? String(cfg.auth.pass).length : 0,
      },
      config: { host: cfg.host, port: cfg.port, secure: cfg.secure, requireTLS: cfg.requireTLS, ignoreTLS: cfg.ignoreTLS, minVersion: cfg.tls.minVersion }
    };
  });
  const payload = { ...result.data, cached: result.cached, ageMs: result.age, ms: Date.now() - start };
  return NextResponse.json(payload, {
    status: payload.ok ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
