import { adminDb } from '../lib/firebase-admin';
import { fileURLToPath } from 'url';
import path from 'path';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkFirestoreData() {
  try {
    console.log('🔍 Verificando dados no Firestore...');

    // Verificar coleção twitterCache
    const cacheSnapshot = await adminDb.collection('twitterCache').get();
    console.log(`📊 Documentos na coleção 'twitterCache': ${cacheSnapshot.size}`);

    if (cacheSnapshot.size > 0) {
      console.log('📄 Documentos encontrados:');
      cacheSnapshot.forEach((doc: any) => {
        console.log(`  - ${doc.id}`);
      });
    }

    // Listar todas as coleções
    console.log('\n📂 Listando todas as coleções:');
    const collections = await adminDb.listCollections();
    collections.forEach((collection: any) => {
      console.log(`  - ${collection.id}`);
    });

    // Verificar se existe a coleção test
    const testSnapshot = await adminDb.collection('test').get();
    console.log(`🧪 Documentos na coleção 'test': ${testSnapshot.size}`);

  } catch (error) {
    console.error('❌ Erro ao verificar Firestore:', error);
  }
}

checkFirestoreData();
