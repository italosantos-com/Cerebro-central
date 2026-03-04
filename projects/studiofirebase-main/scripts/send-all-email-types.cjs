#!/usr/bin/env node
/**
 * Script: send-all-email-types.cjs
 * Envia todos os tipos de emails de autenticação para facilitar testes.
 * Requisitos:
 *  - Servidor Next rodando (npm run dev)
 *  - Endpoint /api/emails/send disponível
 *  - Variáveis SMTP configuradas para envio real (senão será simulado)
 *
 * Uso:
 *  node scripts/send-all-email-types.cjs [baseURL]
 *  npm run emails:all
 *  Variáveis de ambiente opcionais:
 *    TEST_EMAIL=usuario@dominio.com
 *    TEST_NEW_EMAIL=novo@dominio.com
 *    TEST_SECOND_FACTOR=SMS / App / Email
 */

const baseURL = process.argv[2] || process.env.TEST_BASE_URL || 'http://localhost:3000';
const email = process.env.TEST_EMAIL || 'teste+auth@exemplo.com';
const newEmail = process.env.TEST_NEW_EMAIL || 'teste+novo@exemplo.com';
const secondFactor = process.env.TEST_SECOND_FACTOR || 'App Authenticator';

async function send(body) {
  const res = await fetch(`${baseURL}/api/emails/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  let json;
  try { json = await res.json(); } catch { json = { parseError: true }; }
  return { status: res.status, body: json };
}

(async () => {
  console.log('[bulk-email] Iniciando envios para:', email);
  const tasks = [
    { type: 'verify-email', email, displayName: 'Teste Verificação' },
    { type: 'reset-password', email, displayName: 'Teste Reset' },
    { type: 'email-changed', email, newEmail, displayName: 'Teste Mudança Email' },
    { type: 'mfa-enabled', email, secondFactor, displayName: 'Teste MFA' }
  ];

  const results = [];
  for (const t of tasks) {
    process.stdout.write(`\n[bulk-email] -> Enviando ${t.type} ... `);
    try {
      const r = await send(t);
      console.log(`status=${r.status} simulated=${r.body.simulated} messageId=${r.body.messageId || '-'} error=${r.body.error || ''}`);
      results.push({ type: t.type, ...r.body, status: r.status });
    } catch (e) {
      console.error(`[bulk-email] Falha ${t.type}:`, e.message);
      results.push({ type: t.type, error: e.message });
    }
  }

  console.log('\n[bulk-email] Resumo:');
  results.forEach(r => {
    console.log(JSON.stringify(r));
  });

  const simulatedCount = results.filter(r => r.simulated).length;
  if (simulatedCount === results.length) {
    console.warn('\n[bulk-email] Todos os envios foram simulados. Verifique SMTP_HOST/USER/PASS e reinicie o dev.');
  }
})();
