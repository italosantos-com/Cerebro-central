#!/usr/bin/env npx ts-node
/**
 * Script para atualizar credenciais de um admin
 * Uso: npx ts-node scripts/update-admin-credentials.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
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
const auth = getAuth();

interface AdminCredentials {
  username: string;
  email: string;
  phone: string;
  name?: string;
  isMainAdmin?: boolean;
}

// Credenciais do admin severepics (SuperAdmin)
const SEVEREPICS_CREDENTIALS: AdminCredentials = {
  username: 'severepics',
  email: 'pix@italosantos.com',
  phone: '+5521980246195',
  name: 'Italo Santos',
  isMainAdmin: true
};

async function updateAdminByUsername(credentials: AdminCredentials) {
  console.log(`\n🔍 Buscando admin com username: ${credentials.username}...`);
  
  const snapshot = await db.collection('admins')
    .where('username', '==', credentials.username)
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    console.log(`⚠️ Admin com username "${credentials.username}" não encontrado.`);
    console.log('📋 Listando todos os admins existentes:\n');
    
    const allAdmins = await db.collection('admins').get();
    allAdmins.forEach(doc => {
      const data = doc.data();
      console.log(`   UID: ${doc.id}`);
      console.log(`   Username: ${data.username || 'N/A'}`);
      console.log(`   Email: ${data.email || 'N/A'}`);
      console.log(`   Phone: ${data.phone || 'N/A'}`);
      console.log('   ---');
    });
    
    return null;
  }
  
  const adminDoc = snapshot.docs[0];
  const adminData = adminDoc.data();
  const uid = adminDoc.id;
  
  console.log(`✅ Admin encontrado:`);
  console.log(`   UID: ${uid}`);
  console.log(`   Username atual: ${adminData.username}`);
  console.log(`   Email atual: ${adminData.email}`);
  console.log(`   Phone atual: ${adminData.phone}`);
  
  // Atualizar Firestore
  console.log(`\n🔄 Atualizando Firestore...`);
  
  const updateData: any = {
    email: credentials.email,
    phone: credentials.phone,
    updatedAt: new Date(),
  };
  
  if (credentials.name) {
    updateData.name = credentials.name;
  }
  
  if (credentials.isMainAdmin !== undefined) {
    updateData.isMainAdmin = credentials.isMainAdmin;
  }
  
  await db.collection('admins').doc(uid).update(updateData);
  console.log(`✅ Firestore atualizado!`);
  
  // Atualizar Firebase Auth (email e telefone)
  console.log(`\n🔄 Atualizando Firebase Auth...`);
  
  try {
    await auth.updateUser(uid, {
      email: credentials.email,
      phoneNumber: credentials.phone,
      displayName: credentials.name || adminData.name,
    });
    console.log(`✅ Firebase Auth atualizado!`);
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      console.log(`⚠️ Email já existe em outra conta. Verificando se é a mesma...`);
      
      try {
        const userByEmail = await auth.getUserByEmail(credentials.email);
        if (userByEmail.uid === uid) {
          console.log(`✅ Email já pertence a este admin.`);
        } else {
          console.log(`❌ Email pertence a outro usuário (UID: ${userByEmail.uid})`);
        }
      } catch {
        console.log(`❌ Erro ao verificar email.`);
      }
    } else if (error.code === 'auth/phone-number-already-exists') {
      console.log(`⚠️ Telefone já existe em outra conta.`);
    } else {
      console.error(`❌ Erro ao atualizar Auth:`, error.message);
    }
  }
  
  // Verificar/criar perfil settings
  console.log(`\n🔄 Verificando profile settings...`);
  
  const profileRef = db.collection('admins').doc(uid).collection('profile').doc('settings');
  const profileDoc = await profileRef.get();
  
  if (!profileDoc.exists) {
    console.log(`📝 Criando profile settings padrão...`);
    await profileRef.set({
      name: credentials.name || adminData.name || 'Admin',
      email: credentials.email,
      phone: credentials.phone,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`✅ Profile settings criado!`);
  } else {
    console.log(`🔄 Atualizando profile settings...`);
    await profileRef.update({
      email: credentials.email,
      phone: credentials.phone,
      updatedAt: new Date(),
    });
    console.log(`✅ Profile settings atualizado!`);
  }
  
  console.log(`\n✅ Admin "${credentials.username}" atualizado com sucesso!`);
  console.log(`\n📋 Credenciais de acesso:`);
  console.log(`   Username: @${credentials.username}`);
  console.log(`   Email: ${credentials.email}`);
  console.log(`   Telefone: ${credentials.phone}`);
  
  return { uid, ...credentials };
}

async function listAllAdmins() {
  console.log(`\n📋 Listando todos os admins:\n`);
  
  const allAdmins = await db.collection('admins').get();
  
  if (allAdmins.empty) {
    console.log('   Nenhum admin encontrado.');
    return;
  }
  
  let index = 0;
  for (const doc of allAdmins.docs) {
    index++;
    const data = doc.data();
    console.log(`${index}. UID: ${doc.id}`);
    console.log(`   Username: ${data.username || 'N/A'}`);
    console.log(`   Email: ${data.email || 'N/A'}`);
    console.log(`   Phone: ${data.phone || 'N/A'}`);
    console.log(`   Name: ${data.name || 'N/A'}`);
    console.log(`   isMainAdmin: ${data.isMainAdmin || false}`);
    console.log(`   Status: ${data.status || 'N/A'}`);
    console.log('');
  }
}

async function main() {
  console.log('🚀 Script de Atualização de Credenciais de Admin\n');
  console.log('================================================\n');
  
  // Listar admins existentes
  await listAllAdmins();
  
  // Atualizar severepics
  console.log('\n🔧 Atualizando admin severepics...');
  await updateAdminByUsername(SEVEREPICS_CREDENTIALS);
  
  console.log('\n================================================');
  console.log('✅ Processo concluído!');
  console.log('\n📝 Notas:');
  console.log('   - Cada admin pode fazer login com @username, email ou telefone');
  console.log('   - Cada admin tem suas próprias credenciais particulares');
  console.log('   - As credenciais são armazenadas em admins/{uid}');
  console.log('   - Profile settings em admins/{uid}/profile/settings');
  
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
