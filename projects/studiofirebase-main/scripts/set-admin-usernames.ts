import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccountPath = path.join(process.cwd(), 'service_account.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function setAdminUsername() {
  console.log('\n🔍 Buscando admins sem username...\n');
  
  try {
    const adminsSnapshot = await db.collection('admins').get();
    const adminsWithoutUsername = adminsSnapshot.docs.filter(doc => {
      const data = doc.data();
      return !data.username;
    });
    
    if (adminsWithoutUsername.length === 0) {
      console.log('✅ Todos os admins já têm username definido!');
      return;
    }
    
    console.log(`📋 Encontrados ${adminsWithoutUsername.length} admins sem username:\n`);
    
    adminsWithoutUsername.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. UID: ${doc.id}`);
      console.log(`   Nome: ${data.name || 'N/A'}`);
      console.log(`   Email: ${data.email || 'N/A'}`);
      console.log('');
    });
    
    const answer = await question('Deseja adicionar usernames automaticamente? (s/n): ');
    
    if (answer.toLowerCase() !== 's') {
      console.log('❌ Operação cancelada');
      return;
    }
    
    console.log('\n🔄 Adicionando usernames...\n');
    
    for (let i = 0; i < adminsWithoutUsername.length; i++) {
      const doc = adminsWithoutUsername[i];
      const data = doc.data();
      
      // Gerar username baseado no nome ou email, ou usar admin-{index}
      let username: string;
      
      if (data.name && data.name !== 'N/A') {
        // Usar o nome para gerar username
        username = data.name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-_]/g, '')
          .substring(0, 20);
      } else if (data.email) {
        // Usar o email para gerar username
        username = data.email
          .split('@')[0]
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, '')
          .substring(0, 20);
      } else {
        // Fallback: usar admin-{numero}
        username = `admin-${i + 2}`; // +2 porque já existe admin_teste
      }
      
      // Verificar se username já existe
      const existingQuery = await db.collection('admins')
        .where('username', '==', username)
        .get();
      
      if (!existingQuery.empty) {
        // Adicionar número ao final
        username = `${username}-${i + 2}`;
      }
      
      // Atualizar documento
      await db.collection('admins').doc(doc.id).update({
        username: username
      });
      
      console.log(`✅ Admin ${doc.id} → username: ${username}`);
    }
    
    console.log('\n✅ Todos os usernames foram adicionados!\n');
    console.log('📝 Lista final:\n');
    
    // Listar novamente todos os admins
    const finalSnapshot = await db.collection('admins').get();
    let index = 0;
    finalSnapshot.forEach((doc) => {
      index++;
      const data = doc.data();
      console.log(`${index}. ${data.username || '❌ SEM USERNAME'}`);
      console.log(`   Nome: ${data.name || 'N/A'}`);
      console.log(`   Email: ${data.email || 'N/A'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

setAdminUsername().then(() => {
  console.log('✅ Script finalizado');
  rl.close();
  process.exit(0);
}).catch((error) => {
  console.error('❌ Erro fatal:', error);
  rl.close();
  process.exit(1);
});
