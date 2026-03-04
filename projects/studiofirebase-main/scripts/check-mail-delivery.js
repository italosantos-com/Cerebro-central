#!/usr/bin/env node
/*
 * Verifica docs recentes na collection `mail` do Firestore (Firebase Email Extension)
 * e imprime delivery.state (SUCCESS/ERROR/PROCESSING) quando disponível.
 *
 * Uso:
 *   node scripts/check-mail-delivery.js --email italo16rj@gmail.com --limit 5
 */

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  const getValue = (key, fallback) => {
    const idx = argv.indexOf(key);
    if (idx !== -1 && argv[idx + 1] && !argv[idx + 1].startsWith('--')) return argv[idx + 1];
    return fallback;
  };

  return {
    help: args.has('--help') || args.has('-h'),
    email: getValue('--email', process.env.TEST_EMAIL || 'italo16rj@gmail.com'),
    limit: Number(getValue('--limit', '5')),
  };
}

function printHelp() {
  console.log(`\nUso:\n  node scripts/check-mail-delivery.js --email <email> [--limit <n>]\n\nOpções:\n  --email <email>   Destinatário (campo mail.to)\n  --limit <n>       Quantos docs listar (padrão: 5)\n`);
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    printHelp();
    return;
  }

  const { initializeApp, cert, getApps } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');

  const serviceAccountPath = path.join(process.cwd(), 'service_account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ service_account.json não encontrado em:', serviceAccountPath);
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  if (getApps().length === 0) {
    initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
  }

  const db = getFirestore();

  // Importante: evitar índice composto (to + createdAt). O Firestore exige índice para where+order.
  // Estratégia: buscar N docs mais recentes por createdAt e filtrar em memória pelo destinatário.
  const scanLimit = Math.max(50, (Number.isFinite(opts.limit) ? opts.limit : 5) * 10);
  const snap = await db
    .collection('mail')
    .orderBy('createdAt', 'desc')
    .limit(scanLimit)
    .get();

  const rows = [];
  for (const doc of snap.docs) {
    const d = doc.data() || {};
    if (d.to !== opts.email) continue;

    let createdAt = d.createdAt || null;
    if (createdAt && createdAt.toDate) createdAt = createdAt.toDate().toISOString();

    rows.push({
      id: doc.id,
      createdAt,
      subject: d?.message?.subject || null,
      deliveryState: d?.delivery?.state || null,
      deliveryError: d?.delivery?.error ? String(d.delivery.error).slice(0, 200) : null,
    });

    if (rows.length >= (Number.isFinite(opts.limit) ? opts.limit : 5)) break;
  }

  console.log('mail docs found:', rows.length, `(scanned ${snap.size})`);

  console.log(JSON.stringify(rows, null, 2));
}

main().catch((e) => {
  console.error('❌ Erro ao consultar `mail`:', e?.message || e);
  process.exit(1);
});
