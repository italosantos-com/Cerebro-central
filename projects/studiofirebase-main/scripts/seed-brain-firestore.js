#!/usr/bin/env node
/**
 * seed-brain-firestore.js
 *
 * Importa os datasets de /datasets para as colecoes /brain/* no Firestore.
 *
 * Uso:
 *   node scripts/seed-brain-firestore.js
 *
 * Requer:
 *   - GOOGLE_APPLICATION_CREDENTIALS ou serviceAccountKey.json no projeto
 *   - Variavel FIREBASE_PROJECT_ID definida ou detectada automaticamente
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// ─── Inicializar Firebase Admin ───────────────────────────────────────────────

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

if (!admin.apps.length) {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } else {
    console.error(
      '[seed-brain] Nenhuma credencial encontrada.\n' +
        'Defina GOOGLE_APPLICATION_CREDENTIALS ou coloque serviceAccountKey.json na raiz do projeto.'
    );
    process.exit(1);
  }
}

const db = admin.firestore();

// ─── Mapeamento dataset → coleção Firestore ───────────────────────────────────

const DATASETS_DIR = path.join(__dirname, '..', 'datasets');

const SEED_MAP = [
  { file: 'brain_global.json',        collection: 'brain/global/items' },
  { file: 'brain_persona.json',        collection: 'brain/persona/items' },
  { file: 'brain_conversion.json',     collection: 'brain/conversion/items' },
  { file: 'brain_objections.json',     collection: 'brain/objections/items' },
  { file: 'brain_rules.json',          collection: 'brain/rules/items' },
  { file: 'embeddings_knowledge.json', collection: 'brain/knowledge/items' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FIRESTORE_BATCH_LIMIT = 499;

/**
 * Faz upsert de todos os documentos de um array em uma subcoleção Firestore.
 * Usa batch para eficiência (max 500 por batch).
 */
async function seedCollection(collectionPath, items) {
  const colRef = db.collection(collectionPath);
  const chunks = chunkArray(items, FIRESTORE_BATCH_LIMIT);

  for (const chunk of chunks) {
    const batch = db.batch();
    for (const item of chunk) {
      if (!item.id) {
        console.warn(`[seed-brain] Item sem 'id' ignorado em ${collectionPath}:`, item);
        continue;
      }
      const docRef = colRef.doc(item.id);
      batch.set(docRef, { ...item, _seededAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }
    await batch.commit();
  }
}

function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[seed-brain] Iniciando importação dos datasets para Firestore...\n');

  for (const { file, collection } of SEED_MAP) {
    const filePath = path.join(DATASETS_DIR, file);

    if (!fs.existsSync(filePath)) {
      console.warn(`[seed-brain] Arquivo não encontrado, pulando: ${filePath}`);
      continue;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const items = JSON.parse(raw);

    if (!Array.isArray(items)) {
      console.warn(`[seed-brain] ${file} não é um array JSON válido, pulando.`);
      continue;
    }

    console.log(`[seed-brain] ${file} → /${collection} (${items.length} itens)...`);
    await seedCollection(collection, items);
    console.log(`[seed-brain]   ✓ ${items.length} itens importados.`);
  }

  console.log('\n[seed-brain] Importação concluída com sucesso.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed-brain] Erro durante a importação:', err);
  process.exit(1);
});
