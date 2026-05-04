#!/usr/bin/env node
/**
 * scripts/recalculate-conversions.mjs
 *
 * Recalcula a taxa de conversão de cada estágio lendo as conversas salvas no
 * Firestore e atualiza os documentos em brain/conversion/entries.
 *
 * Uso:
 *   node scripts/recalculate-conversions.mjs [--dry-run] [--profile <profileId>]
 *
 * Variáveis de ambiente:
 *   GOOGLE_APPLICATION_CREDENTIALS  — path para serviceAccountKey.json
 *   FIRESTORE_EMULATOR_HOST         — endereço do emulador (ex: 127.0.0.1:8080)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const profileIdx = args.indexOf('--profile');
const profileId = profileIdx !== -1 ? args[profileIdx + 1] : null;

// ─── Firestore init ───────────────────────────────────────────────────────────

let db;

async function initFirestore() {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    const { initializeApp } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    try { initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-project' }); } catch {}
    db = getFirestore();
    return;
  }

  const credPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    resolve(ROOT, 'serviceAccountKey.json');

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));
  } catch {
    console.error(`[recalc] serviceAccountKey.json não encontrado em ${credPath}`);
    process.exit(1);
  }

  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  try { initializeApp({ credential: cert(serviceAccount) }); } catch {}
  db = getFirestore();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[recalc] Recalculando taxas de conversão…');
  if (dryRun) console.log('[recalc] Modo dry-run ativo.');

  await initFirestore();

  // Load all conversations
  const convSnap = await db.collection('conversations').get();
  const conversations = convSnap.docs.map((d) => d.data());

  if (conversations.length === 0) {
    console.log('[recalc] Nenhuma conversa encontrada.');
    return;
  }

  // Aggregate by stage
  const stageCounts = {};   // stage → { total, converted }
  for (const conv of conversations) {
    const stage = conv.stage;
    if (!stage) continue;
    if (!stageCounts[stage]) stageCounts[stage] = { total: 0, converted: 0 };
    stageCounts[stage].total++;
    if (conv.converted === true) stageCounts[stage].converted++;
  }

  console.log('[recalc] Estatísticas por estágio:');
  for (const [stage, counts] of Object.entries(stageCounts)) {
    const rate = counts.total > 0 ? counts.converted / counts.total : 0;
    console.log(`  ${stage}: ${counts.converted}/${counts.total} → ${(rate * 100).toFixed(1)}%`);
  }

  if (dryRun) {
    console.log('[recalc] (dry-run) Nenhuma atualização gravada.');
    return;
  }

  // Update conversion entries in Firestore
  const brainBase = profileId ? `profiles/${profileId}/brain` : 'brain';
  const convEntrySnap = await db.collection(`${brainBase}/conversion/entries`).get();

  const batch = db.batch();
  let updated = 0;
  for (const doc of convEntrySnap.docs) {
    const entry = doc.data();
    const stage = entry.stage;
    if (stage && stageCounts[stage]) {
      const { total, converted } = stageCounts[stage];
      const newRate = total > 0 ? Math.round((converted / total) * 10000) / 10000 : entry.conversion_rate;
      batch.update(doc.ref, { conversion_rate: newRate, _stats: { total, converted } });
      updated++;
    }
  }

  if (updated > 0) {
    await batch.commit();
    console.log(`[recalc] ✓ ${updated} entradas de conversão atualizadas.`);
  } else {
    console.log('[recalc] Nenhuma entrada de conversão correspondente encontrada.');
  }
}

main().catch((err) => {
  console.error('[recalc] Erro fatal:', err);
  process.exit(1);
});
