#!/usr/bin/env node
/**
 * Captura automaticamente um Firebase ID token (Bearer) do painel admin.
 *
 * Como funciona:
 * - Abre um Chromium via Playwright (contexto persistente para manter login)
 * - Você faz login manualmente
 * - O script escuta requests para /api/admin/* e captura o header Authorization
 * - Grava ADMIN_ID_TOKEN e ADMIN_REFRESH_TOKEN em .env.local (ou .env)
 */

import fs from 'node:fs';
import path from 'node:path';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const envLocalPath = path.join(process.cwd(), '.env.local');
const envPath = path.join(process.cwd(), '.env');

function pickEnvFile() {
  if (fs.existsSync(envLocalPath)) return envLocalPath;
  if (fs.existsSync(envPath)) return envPath;
  // Prefer Next.js convention
  fs.writeFileSync(envLocalPath, '', { encoding: 'utf8' });
  return envLocalPath;
}

function upsertEnvVar(filePath, key, value) {
  const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const lines = content.split(/\r?\n/);

  const newLine = `${key}=${value}`;
  let found = false;

  const out = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      found = true;
      return newLine;
    }
    return line;
  });

  if (!found) {
    if (!out[out.length - 1]) out.pop();
    out.push('');
    out.push('# Token de Admin (Firebase ID token)');
    out.push(newLine);
  }

  fs.writeFileSync(filePath, out.join('\n') + '\n', 'utf8');
}

function normalizeToken(input) {
  if (!input) return null;
  let t = String(input).trim();
  t = t.replace(/^Bearer\s+/i, '');
  t = t.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  return t;
}

function looksLikeJwt(token) {
  return typeof token === 'string' && token.split('.').length === 3;
}

async function main() {
  const envFile = pickEnvFile();

  let playwright;
  try {
    playwright = await import('playwright');
  } catch (e) {
    console.error('❌ Playwright não instalado. Rode: npm i -D playwright && npx playwright install chromium');
    process.exit(1);
  }

  const userDataDir = path.join(process.cwd(), '.playwright-admin-session');

  console.log('=== Captura automática do Admin ID token ===');
  console.log('baseUrl:', baseUrl);
  console.log('envFile:', envFile);
  console.log('userDataDir:', userDataDir);
  console.log('\nAbra o admin, faça login, e clique em qualquer página do painel (ex: Settings).');
  console.log('O script captura a primeira request /api/admin/* com Authorization Bearer e salva no env.');

  const timeoutMs = Number(process.env.CAPTURE_TOKEN_TIMEOUT_MS || 5 * 60 * 1000);
  const deadline = Date.now() + timeoutMs;

  const context = await playwright.chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  let captured = false;

  const maybeCaptureFromHeaders = (headers) => {
    const auth = headers?.authorization || headers?.Authorization;
    const token = normalizeToken(auth);
    if (!token) return false;
    if (!looksLikeJwt(token)) return false;

    upsertEnvVar(envFile, 'ADMIN_ID_TOKEN', token);
    upsertEnvVar(envFile, 'ADMIN_REFRESH_TOKEN', token);

    console.log('\n✅ Token capturado e salvo!');
    console.log(`- ${path.basename(envFile)}: ADMIN_ID_TOKEN / ADMIN_REFRESH_TOKEN`);
    console.log('Obs: tokens expiram; recapture se der 401.');

    return true;
  };

  context.on('request', (req) => {
    if (captured) return;
    const url = req.url();
    if (!url.includes('/api/admin/')) return;

    const headers = req.headers();
    if (maybeCaptureFromHeaders(headers)) {
      captured = true;
      void context.close();
    }
  });

  // Navegar para o admin
  await page.goto(`${baseUrl}/admin`, { waitUntil: 'domcontentloaded' });

  // Loop de espera simples
  while (!captured && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!captured) {
    console.error(`\n❌ Timeout (${Math.round(timeoutMs / 1000)}s) sem capturar token.`);
    console.error('Dica: após login, abra /admin/settings para forçar chamadas /api/admin/*.');
    await context.close();
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('❌ Erro:', e?.message || e);
  process.exit(1);
});
