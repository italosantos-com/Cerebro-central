// Load envs BEFORE any usage
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local (if present) then .env as fallback
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

// Safe logging (do not print secrets)
console.log('ADMIN_PROJECT_ID present:', Boolean(process.env.ADMIN_PROJECT_ID));
console.log('FIREBASE_CLIENT_EMAIL present:', Boolean(process.env.FIREBASE_CLIENT_EMAIL));

// Import admin after envs are loaded
import { adminDb } from '../lib/firebase-admin';

// Teste de conexão ao Firestore
async function testFirestoreConnection() {
  try {
    const testDoc = await adminDb.collection('testConnection').doc('test').set({ ok: true, timestamp: Date.now() });
    console.log('Conexão com Firestore OK!');
  } catch (err) {
    console.error('Erro ao conectar no Firestore:', err);
    process.exit(1);
  }
}

const cacheDir = path.resolve(__dirname, '../../cache/twitter');

async function uploadAllCaches() {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized. Check firebase-admin.ts and env variables.');
  }

  const files = fs.readdirSync(cacheDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(cacheDir, file);
    const cacheData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const docId = (cacheData.username && cacheData.mediaType && cacheData.maxResults)
      ? `${cacheData.username}-${cacheData.mediaType}-${cacheData.maxResults}`
      : file.replace('.json', '');
    // Using Admin SDK collection/doc API
    await adminDb.collection('twitterCache').doc(docId).set(cacheData);
    console.log(`Migrado: ${file} -> ${docId}`);
  }
  console.log('Todos os caches migrados para o Firestore!');
}

// Main
(async () => {
  await testFirestoreConnection();
  await uploadAllCaches();
})().catch((err) => {
  console.error('Falha ao migrar caches:', err);
  process.exit(1);
});
