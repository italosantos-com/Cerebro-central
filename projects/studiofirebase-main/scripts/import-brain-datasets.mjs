#!/usr/bin/env node
/**
 * scripts/import-brain-datasets.mjs
 *
 * Importa os datasets JSON da pasta /datasets para o Firestore.
 *
 * Uso:
 *   node scripts/import-brain-datasets.mjs [--profile <profileId>] [--dry-run]
 *
 * Variáveis de ambiente necessárias (uma das opções):
 *   GOOGLE_APPLICATION_CREDENTIALS  — path para serviceAccountKey.json
 *   FIRESTORE_EMULATOR_HOST         — endereço do emulador (ex: 127.0.0.1:8080)
 */

import { readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATASETS_DIR = resolve(ROOT, '..', '..', 'datasets');

// Parse args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const profileIdx = args.indexOf('--profile');
const profileId = profileIdx !== -1 ? args[profileIdx + 1] : null;

// ─── Firestore init ───────────────────────────────────────────────────────────

let db;

async function initFirestore() {
  // Try to use emulator if configured
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    const { initializeApp } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    try { initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-project' }); } catch {}
    db = getFirestore();
    return;
  }

  // Use service account credentials
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    || resolve(ROOT, 'serviceAccountKey.json');

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));
  } catch {
    console.error(`[import-brain] serviceAccountKey.json não encontrado em ${credPath}`);
    console.error('  Configure GOOGLE_APPLICATION_CREDENTIALS ou use FIRESTORE_EMULATOR_HOST');
    process.exit(1);
  }

  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  try { initializeApp({ credential: cert(serviceAccount) }); } catch {}
  db = getFirestore();
}

// ─── Mapping: file → Firestore path ──────────────────────────────────────────

const FILE_TO_PATH = {
  'brain_global.json':        'global',
  'brain_persona.json':       'persona',
  'brain_conversion.json':    'conversion',
  'brain_objections.json':    'objections',
  'brain_rules.json':         'rules',
  'embeddings_knowledge.json': 'knowledge',
};

// ─── Import logic ─────────────────────────────────────────────────────────────

async function importDataset(filename, layer) {
  const filePath = join(DATASETS_DIR, filename);
  let entries;
  try {
    entries = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.warn(`[import-brain] Arquivo não encontrado ou inválido: ${filePath} — ${err.message}`);
    return;
  }

  if (!Array.isArray(entries)) {
    console.warn(`[import-brain] ${filename} não é um array JSON, pulando.`);
    return;
  }

  const brainBase = profileId ? `profiles/${profileId}/brain` : 'brain';
  const collPath = `${brainBase}/${layer}/entries`;

  console.log(`[import-brain] Importando ${entries.length} entradas → ${collPath}`);

  if (dryRun) {
    console.log(`[import-brain] (dry-run) ${JSON.stringify(entries.slice(0, 2), null, 2)}…`);
    return;
  }

  const batch = db.batch();
  for (const entry of entries) {
    if (!entry.id) {
      console.warn(`[import-brain] Entrada sem id em ${filename}, pulando:`, entry);
      continue;
    }
    const ref = db.collection(collPath).doc(entry.id);
    batch.set(ref, entry, { merge: true });
  }
  await batch.commit();
  console.log(`[import-brain] ✓ ${layer} importado com sucesso.`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[import-brain] Iniciando importação de datasets…');
  if (dryRun) console.log('[import-brain] Modo dry-run ativo — nenhum dado será gravado.');
  if (profileId) console.log(`[import-brain] Perfil alvo: ${profileId}`);

  await initFirestore();

  for (const [filename, layer] of Object.entries(FILE_TO_PATH)) {
    await importDataset(filename, layer);
  }

  console.log('[import-brain] Importação concluída.');
}

main().catch((err) => {
  console.error('[import-brain] Erro fatal:', err);
  process.exit(1);
});
