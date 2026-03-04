/**
 * scripts/import-brain-to-firestore.ts
 *
 * Imports the local brain dataset JSON files into Firestore under the
 * /brain/{section}/entries subcollection structure.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/import-brain-to-firestore.ts
 *
 * Environment variables required (or firebase-admin auto-auth via ADC):
 *   FIREBASE_SERVICE_ACCOUNT  - JSON string of service account credentials
 *   FIREBASE_PROJECT_ID       - Firebase project ID
 */

import path from 'path';
import fs from 'fs';
import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// ─── Dataset files to import ─────────────────────────────────────────────────

const IMPORT_MAP: Record<string, string> = {
  global: 'brain_global.json',
  persona: 'brain_persona.json',
  conversion: 'brain_conversion.json',
  objections: 'brain_objections.json',
  rules: 'brain_rules.json',
  knowledge: 'embeddings_knowledge.json',
};

const DATASETS_DIR = path.join(__dirname, '..', 'datasets');

// ─── Firebase Admin init ─────────────────────────────────────────────────────

function initAdmin(): Firestore {
  if (!getApps().length) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      initializeApp({ credential: cert(serviceAccount) });
    } else {
      initializeApp({ credential: applicationDefault() });
    }
  }
  return getFirestore();
}

// ─── Importer ─────────────────────────────────────────────────────────────────

async function importSection(
  db: Firestore,
  section: string,
  filename: string
): Promise<number> {
  const filePath = path.join(DATASETS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`[import-brain] Arquivo não encontrado: ${filePath} — pulando.`);
    return 0;
  }

  const entries: Array<Record<string, unknown>> = JSON.parse(
    fs.readFileSync(filePath, 'utf-8')
  );

  const collectionRef = db.collection(`brain/${section}/entries`);
  const batch = db.batch();

  for (const entry of entries) {
    const id = String(entry.id || '');
    const docRef = id ? collectionRef.doc(id) : collectionRef.doc();
    batch.set(docRef, entry, { merge: true });
  }

  await batch.commit();
  console.log(`[import-brain] ✅ ${section}: ${entries.length} entradas importadas.`);
  return entries.length;
}

async function main() {
  console.log('[import-brain] Iniciando importação dos datasets para o Firestore...');
  const db = initAdmin();

  let total = 0;
  for (const [section, filename] of Object.entries(IMPORT_MAP)) {
    total += await importSection(db, section, filename);
  }

  console.log(`[import-brain] ✅ Importação concluída. Total: ${total} entradas.`);
}

main().catch((err) => {
  console.error('[import-brain] ❌ Erro:', err);
  process.exit(1);
});
