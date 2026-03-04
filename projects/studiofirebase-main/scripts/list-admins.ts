import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccountPath = path.join(process.cwd(), 'service_account.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

async function listAdmins() {
  console.log('\n🔍 Listando todos os admins...\n');
  
  try {
    const adminsSnapshot = await db.collection('admins').get();
    
    if (adminsSnapshot.empty) {
      console.log('❌ Nenhum admin encontrado!');
      return;
    }
    
    console.log(`✅ Total de admins: ${adminsSnapshot.size}\n`);
    
    let index = 0;
    adminsSnapshot.forEach((doc) => {
      index++;
      const data = doc.data();
      console.log(`${index}. Admin:`);
      console.log(`   UID: ${doc.id}`);
      console.log(`   Nome: ${data.name || 'N/A'}`);
      console.log(`   Email: ${data.email || 'N/A'}`);
      console.log(`   Username: ${data.username || '❌ NÃO DEFINIDO'}`);
      console.log(`   Phone: ${data.phone || 'N/A'}`);
      console.log(`   isMainAdmin: ${data.isMainAdmin || false}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar admins:', error);
  }
}

listAdmins().then(() => {
  console.log('✅ Script finalizado');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
