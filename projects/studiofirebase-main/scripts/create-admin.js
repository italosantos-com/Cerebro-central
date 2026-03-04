#!/usr/bin/env node

/**
 * Create Admin Account Script
 * 
 * Usage: node scripts/create-admin.js <email> [username] [name]
 * Example: node scripts/create-admin.js italo16rj@gmail.com italo "Italo Santos"
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Buscar service account
const serviceAccountPath = path.join(__dirname, '../service_account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ service_account.json não encontrado em:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://projeto-italo-bc5ef-default-rtdb.firebaseio.com'
});

const db = admin.firestore();
const auth = admin.auth();

async function createAdminAccount() {
  const email = process.argv[2];
  const username = process.argv[3] || email.split('@')[0];
  const name = process.argv[4] || email.split('@')[0];

  if (!email) {
    console.error('❌ Email é obrigatório');
    console.error('Uso: node scripts/create-admin.js <email> [username] [name]');
    process.exit(1);
  }

  try {
    console.log('🔍 Procurando usuário:', email);
    
    // Buscar usuário no Firebase Auth
    let user;
    try {
      user = await auth.getUserByEmail(email);
      console.log('✅ Usuário encontrado:', {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified
      });
    } catch (error) {
      console.error('❌ Usuário não encontrado no Firebase Auth');
      console.error('   Crie a conta primeiro usando a página de registro ou:');
      console.error('   firebase auth:import users.json --project projeto-italo-bc5ef');
      process.exit(1);
    }

    // Verificar se já existe documento admin
    const adminRef = db.collection('admins').doc(user.uid);
    const adminDoc = await adminRef.get();

    if (adminDoc.exists) {
      console.warn('⚠️  Documento admin já existe para este usuário');
      console.log('Dados atuais:', adminDoc.data());
      process.exit(0);
    }

    // Criar documento admin
    console.log('📝 Criando documento admin...');
    
    const adminData = {
      uid: user.uid,
      email: user.email,
      name: name,
      username: username.toLowerCase().trim(),
      phone: '',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      role: 'admin',
      permissions: ['view_dashboard', 'manage_content', 'manage_users'],
      emailVerified: user.emailVerified
    };

    await adminRef.set(adminData);

    console.log('✅ Documento admin criado com sucesso!');
    console.log('👤 Admin:', {
      uid: user.uid,
      email: user.email,
      username: username,
      name: name,
      emailVerified: user.emailVerified,
      status: 'active'
    });

    console.log('\n🎉 Agora você pode fazer login em: http://localhost:3000/admin');
    console.log('   Email:', email);
    
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Executar
createAdminAccount();
