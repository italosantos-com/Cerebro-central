#!/usr/bin/env node

/**
 * Script para criar SuperAdmin no Firebase
 * 
 * Uso: node scripts/create-superadmin.js
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Cores para console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Dados do SuperAdmin
const SUPERADMIN_DATA = {
  name: 'Italo Santos',
  username: 'severepics',
  email: 'pix@italosantos.com',
  phone: '+5521980246195',
  password: '123456'
};

async function initFirebase() {
  try {
    // Verificar se já foi inicializado
    if (admin.apps.length > 0) {
      log('✅ Firebase Admin já inicializado!', 'green');
      return { auth: admin.auth(), db: admin.firestore() };
    }

    // Tentar carregar service_account.json
    const serviceAccountPath = path.join(process.cwd(), 'service_account.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
      log('❌ Arquivo service_account.json não encontrado!', 'red');
      log('Por favor, coloque o arquivo service_account.json na raiz do projeto.', 'yellow');
      process.exit(1);
    }

    log('📄 Lendo service_account.json...', 'blue');
    const fileContent = fs.readFileSync(serviceAccountPath, 'utf8');
    log(`📝 Tamanho do arquivo: ${fileContent.length} bytes`, 'blue');
    
    log('🔄 Fazendo parse do JSON...', 'blue');
    const serviceAccount = JSON.parse(fileContent);
    log('✅ JSON parseado com sucesso!', 'green');
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
    });

    log('✅ Firebase Admin inicializado com sucesso!', 'green');
    return { auth: admin.auth(), db: admin.firestore() };
  } catch (error) {
    log(`❌ Erro ao inicializar Firebase: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function createSuperAdmin() {
  log('\n🚀 Iniciando criação do SuperAdmin...', 'blue');
  log('═══════════════════════════════════════════════════', 'blue');

  const { auth, db } = await initFirebase();

  try {
    // 1. Verificar se usuário já existe
    log('\n📋 Verificando se usuário já existe...', 'yellow');
    let user;
    try {
      user = await auth.getUserByEmail(SUPERADMIN_DATA.email);
      log(`⚠️  Usuário já existe: ${user.uid}`, 'yellow');
      log('Atualizando dados...', 'yellow');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        log('✅ Usuário não existe, criando novo...', 'green');
        
        // Criar usuário no Firebase Auth
        user = await auth.createUser({
          email: SUPERADMIN_DATA.email,
          password: SUPERADMIN_DATA.password,
          displayName: SUPERADMIN_DATA.name,
          phoneNumber: SUPERADMIN_DATA.phone,
          emailVerified: true,
          disabled: false
        });
        
        log(`✅ Usuário criado no Firebase Auth: ${user.uid}`, 'green');
      } else {
        throw error;
      }
    }

    // 2. Definir custom claims de admin
    log('\n🔐 Definindo custom claims de admin...', 'yellow');
    await auth.setCustomUserClaims(user.uid, {
      admin: true,
      role: 'superadmin',
      isMainAdmin: true
    });
    log('✅ Custom claims definidas com sucesso!', 'green');

    // 3. Criar/Atualizar documento do admin no Firestore
    log('\n📝 Criando documento do admin no Firestore...', 'yellow');
    const adminDocRef = db.collection('admins').doc(user.uid);
    
    await adminDocRef.set({
      uid: user.uid,
      name: SUPERADMIN_DATA.name,
      username: SUPERADMIN_DATA.username,
      email: SUPERADMIN_DATA.email,
      phone: SUPERADMIN_DATA.phone,
      emailVerified: true,
      phoneVerified: true,
      isMainAdmin: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      role: 'superadmin'
    }, { merge: true });
    
    log('✅ Documento do admin criado com sucesso!', 'green');

    // 4. Criar ProfileSettings
    log('\n🎨 Criando ProfileSettings...', 'yellow');
    const profileSettingsRef = adminDocRef.collection('profile').doc('settings');
    
    await profileSettingsRef.set({
      // Informações básicas
      name: SUPERADMIN_DATA.name,
      username: SUPERADMIN_DATA.username,
      email: SUPERADMIN_DATA.email,
      phone: SUPERADMIN_DATA.phone,
      description: 'SuperAdmin Principal',
      
      // URLs de imagens (padrões)
      profilePictureUrl: '',
      coverPhotoUrl: '',
      galleryPhotos: [],
      
      // Redes sociais
      socialMedia: {
        instagram: '',
        twitter: '',
        youtube: '',
        whatsapp: SUPERADMIN_DATA.phone,
        telegram: '',
        facebook: '',
        tiktok: ''
      },
      
      // Configurações de pagamento
      paymentSettings: {
        acceptPayPal: false,
        acceptStripe: false,
        acceptMercadoPago: false,
        acceptGooglePay: false,
        acceptApplePay: false,
        subscriptionPrice: 0,
        currency: 'BRL'
      },
      
      // Configurações de reviews
      reviewSettings: {
        showReviews: true,
        moderateReviews: true,
        allowAnonymous: false,
        requirePurchase: false
      },
      
      // Configurações de footer
      footerSettings: {
        showFooter: true,
        showLoginButton: true,
        showSignUpButton: true,
        loginButtonText: 'Entrar',
        signUpButtonText: 'Cadastrar',
        loginButtonColor: '#000000',
        signUpButtonColor: '#4CAF50'
      },
      
      // Timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSync: new Date().toISOString()
    }, { merge: true });
    
    log('✅ ProfileSettings criado com sucesso!', 'green');

    // 5. Verificar se é o primeiro admin (Main Admin)
    log('\n👑 Verificando status de Main Admin...', 'yellow');
    const adminsSnapshot = await db.collection('admins').get();
    const isFirstAdmin = adminsSnapshot.size === 1;
    
    if (isFirstAdmin) {
      await adminDocRef.update({ isMainAdmin: true });
      log('✅ Definido como Main Admin (primeiro admin do sistema)!', 'green');
    }

    // 6. Resumo final
    log('\n═══════════════════════════════════════════════════', 'green');
    log('🎉 SuperAdmin criado com sucesso!', 'green');
    log('═══════════════════════════════════════════════════', 'green');
    log('\n📊 Informações do SuperAdmin:', 'blue');
    log(`   UID: ${user.uid}`, 'bright');
    log(`   Nome: ${SUPERADMIN_DATA.name}`, 'bright');
    log(`   Username: ${SUPERADMIN_DATA.username}`, 'bright');
    log(`   Email: ${SUPERADMIN_DATA.email} ✅`, 'bright');
    log(`   Telefone: ${SUPERADMIN_DATA.phone} ✅`, 'bright');
    log(`   Senha: ${SUPERADMIN_DATA.password}`, 'bright');
    log(`   URL: https://italosantos.com/${SUPERADMIN_DATA.username}`, 'bright');
    log(`   Admin Panel: https://italosantos.com/admin`, 'bright');
    log('\n✅ Email e telefone verificados!', 'green');
    log('✅ Custom claims configuradas!', 'green');
    log('✅ ProfileSettings criado!', 'green');
    
    process.exit(0);
  } catch (error) {
    log('\n❌ Erro ao criar SuperAdmin:', 'red');
    log(`   ${error.message}`, 'red');
    if (error.stack) {
      log('\nStack trace:', 'yellow');
      console.log(error.stack);
    }
    process.exit(1);
  }
}

// Executar
createSuperAdmin();
