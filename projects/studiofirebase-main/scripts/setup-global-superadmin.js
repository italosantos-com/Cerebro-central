#!/usr/bin/env node

/**
 * Script para configurar Italo Santos como perfil global principal
 * 
 * Este script:
 * 1. Verifica se o superadmin existe em admins/{uid}
 * 2. Copia/migra dados para admin/profileSettings (perfil global)
 * 3. Marca como isMainAdmin: true
 * 4. Configura para aparecer na página inicial sem UID
 * 
 * Uso: node scripts/setup-global-superadmin.js
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
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Email do SuperAdmin
const SUPERADMIN_EMAIL = 'pix@italosantos.com';

async function initFirebase() {
  try {
    if (admin.apps.length > 0) {
      log('✅ Firebase Admin já inicializado!', 'green');
      return { auth: admin.auth(), db: admin.firestore() };
    }

    const serviceAccountPath = path.join(process.cwd(), 'service_account.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
      log('❌ Arquivo service_account.json não encontrado!', 'red');
      process.exit(1);
    }

    const fileContent = fs.readFileSync(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(fileContent);
    
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

async function setupGlobalSuperAdmin() {
  log('\n🌟 Configurando Italo Santos como Perfil Global Principal...', 'cyan');
  log('═══════════════════════════════════════════════════════════════', 'cyan');

  const { auth, db } = await initFirebase();

  try {
    // 1. Buscar usuário no Firebase Auth
    log('\n📋 Etapa 1: Buscando SuperAdmin no Firebase Auth...', 'blue');
    let user;
    try {
      user = await auth.getUserByEmail(SUPERADMIN_EMAIL);
      log(`✅ SuperAdmin encontrado: ${user.uid}`, 'green');
      log(`   Nome: ${user.displayName}`, 'cyan');
      log(`   Email: ${user.email}`, 'cyan');
      log(`   Telefone: ${user.phoneNumber}`, 'cyan');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        log(`❌ SuperAdmin não encontrado com email: ${SUPERADMIN_EMAIL}`, 'red');
        log('   Execute primeiro: node scripts/create-superadmin.js', 'yellow');
        process.exit(1);
      }
      throw error;
    }

    // 2. Buscar documento em admins/{uid}
    log('\n📋 Etapa 2: Verificando documento em admins/{uid}...', 'blue');
    const adminDocRef = db.collection('admins').doc(user.uid);
    const adminDoc = await adminDocRef.get();

    if (!adminDoc.exists) {
      log('⚠️  Documento em admins/{uid} não existe', 'yellow');
      log('   Criando documento...', 'yellow');
      
      await adminDocRef.set({
        uid: user.uid,
        name: user.displayName || 'Italo Santos',
        email: user.email,
        phone: user.phoneNumber || '+5521980246195',
        username: 'severepics',
        isMainAdmin: true,
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        role: 'superadmin'
      });
      
      log('✅ Documento criado em admins/{uid}', 'green');
    } else {
      log('✅ Documento existe em admins/{uid}', 'green');
      const adminData = adminDoc.data();
      log(`   Username: ${adminData.username}`, 'cyan');
      log(`   isMainAdmin: ${adminData.isMainAdmin}`, 'cyan');
      
      // Garantir que isMainAdmin está true
      if (!adminData.isMainAdmin) {
        log('⚠️  isMainAdmin não está definido, atualizando...', 'yellow');
        await adminDocRef.update({ isMainAdmin: true });
        log('✅ isMainAdmin atualizado para true', 'green');
      }
    }

    // 3. Buscar configurações em admins/{uid}/profile/settings
    log('\n📋 Etapa 3: Verificando ProfileSettings individual...', 'blue');
    const profileSettingsRef = adminDocRef.collection('profile').doc('settings');
    const profileSettingsDoc = await profileSettingsRef.get();

    let individualSettings = null;
    if (profileSettingsDoc.exists) {
      individualSettings = profileSettingsDoc.data();
      log('✅ ProfileSettings individual existe', 'green');
      log(`   Nome: ${individualSettings.name}`, 'cyan');
      log(`   Email: ${individualSettings.email}`, 'cyan');
    } else {
      log('⚠️  ProfileSettings individual não existe', 'yellow');
    }

    // 4. Verificar perfil global em admin/profileSettings
    log('\n📋 Etapa 4: Verificando perfil global em admin/profileSettings...', 'blue');
    const globalProfileRef = db.collection('admin').doc('profileSettings');
    const globalProfileDoc = await globalProfileRef.get();

    if (globalProfileDoc.exists) {
      const globalData = globalProfileDoc.data();
      log('✅ Perfil global já existe', 'green');
      log(`   Nome: ${globalData.name}`, 'cyan');
      log(`   Email: ${globalData.email}`, 'cyan');
      log(`   Username: ${globalData.username}`, 'cyan');
    } else {
      log('⚠️  Perfil global não existe, criando...', 'yellow');
    }

    // 5. Migrar/criar perfil global
    log('\n📋 Etapa 5: Configurando perfil global...', 'blue');
    
    const globalSettings = {
      // Dados básicos do Auth
      uid: user.uid, // ⭐ Importante: incluir UID para referência
      name: user.displayName || 'Italo Santos',
      email: user.email,
      username: 'severepics',
      isMainAdmin: true,
      
      // Dados do perfil
      description: individualSettings?.description || 'Criador de conteúdo exclusivo',
      profilePictureUrl: individualSettings?.profilePictureUrl || '/images/default-profile.jpg',
      coverPhotoUrl: individualSettings?.coverPhotoUrl || '/images/default-cover.jpg',
      
      // Redes sociais
      socialMedia: individualSettings?.socialMedia || {
        instagram: 'https://instagram.com/severepics',
        twitter: '',
        youtube: '',
        whatsapp: '+5521980246195',
        telegram: '',
        facebook: ''
      },
      
      // Configurações de pagamento
      paymentSettings: individualSettings?.paymentSettings || {
        acceptPayPal: true,
        acceptStripe: true,
        acceptMercadoPago: true,
        acceptApplePay: true,
        acceptGooglePay: true,
        pixKey: 'pix@italosantos.com',
        pixKeyType: 'email'
      },
      
      // Galerias
      galleryPhotos: individualSettings?.galleryPhotos || [],
      
      // Reviews
      reviewSettings: individualSettings?.reviewSettings || {
        enabled: true,
        requireApproval: true,
        allowAnonymous: false
      },
      
      // Footer
      footerSettings: individualSettings?.footerSettings || {
        showSocialLinks: true,
        copyrightText: '© 2026 Italo Santos. Todos os direitos reservados.'
      },
      
      // Metadata
      lastSync: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      
      // Flag especial
      isGlobalProfile: true // ⭐ Marca como perfil global
    };

    await globalProfileRef.set(globalSettings, { merge: true });
    log('✅ Perfil global configurado com sucesso!', 'green');

    // 6. Atualizar custom claims
    log('\n📋 Etapa 6: Verificando custom claims...', 'blue');
    const currentClaims = (await auth.getUser(user.uid)).customClaims || {};
    
    if (!currentClaims.admin || !currentClaims.isMainAdmin) {
      log('⚠️  Custom claims precisam ser atualizadas', 'yellow');
      await auth.setCustomUserClaims(user.uid, {
        admin: true,
        role: 'superadmin',
        isMainAdmin: true
      });
      log('✅ Custom claims atualizadas', 'green');
    } else {
      log('✅ Custom claims já configuradas', 'green');
    }

    // 7. Criar log de auditoria
    log('\n📋 Etapa 7: Criando log de auditoria...', 'blue');
    await db.collection('admin_audit_log').add({
      action: 'global_profile_setup',
      adminId: user.uid,
      email: user.email,
      username: 'severepics',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        isMainAdmin: true,
        profilePath: 'admin/profileSettings'
      }
    });
    log('✅ Log de auditoria criado', 'green');

    // Resumo final
    log('\n' + '═'.repeat(65), 'cyan');
    log('🎉 PERFIL GLOBAL CONFIGURADO COM SUCESSO!', 'green');
    log('═'.repeat(65), 'cyan');
    log('\n📊 Resumo da Configuração:', 'bright');
    log(`   UID: ${user.uid}`, 'cyan');
    log(`   Nome: ${globalSettings.name}`, 'cyan');
    log(`   Email: ${globalSettings.email}`, 'cyan');
    log(`   Username: ${globalSettings.username}`, 'cyan');
    log(`   isMainAdmin: true`, 'green');
    log('\n🌍 URLs:', 'bright');
    log(`   Página inicial: https://italosantos.com/`, 'cyan');
    log(`   Perfil público: https://italosantos.com/severepics`, 'cyan');
    log(`   Painel admin: https://italosantos.com/admin`, 'cyan');
    log('\n📂 Localização dos Dados:', 'bright');
    log(`   Perfil Global: admin/profileSettings`, 'green');
    log(`   Admin Doc: admins/${user.uid}`, 'cyan');
    log(`   Profile Settings: admins/${user.uid}/profile/settings`, 'cyan');
    log('\n✅ O perfil de Italo Santos agora controla a página inicial!', 'green');
    log('');

  } catch (error) {
    log(`\n❌ Erro ao configurar perfil global: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Executar
setupGlobalSuperAdmin()
  .then(() => {
    log('✅ Script concluído com sucesso!', 'green');
    process.exit(0);
  })
  .catch((error) => {
    log(`❌ Erro fatal: ${error.message}`, 'red');
    process.exit(1);
  });
