#!/usr/bin/env node

/**
 * Script de Verificação - Perfil Global do SuperAdmin
 * 
 * Este script verifica:
 * 1. ✅ Perfil global existe em admin/profileSettings
 * 2. ✅ Dados do SuperAdmin estão corretos
 * 3. ✅ isMainAdmin está definido
 * 4. ✅ Username está configurado
 * 5. ✅ Sistema está pronto para homepage
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

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

async function initFirebase() {
  if (admin.apps.length > 0) {
    return { auth: admin.auth(), db: admin.firestore() };
  }

  const serviceAccountPath = path.join(process.cwd(), 'service_account.json');
  const fileContent = fs.readFileSync(serviceAccountPath, 'utf8');
  const serviceAccount = JSON.parse(fileContent);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
  });

  return { auth: admin.auth(), db: admin.firestore() };
}

async function verify() {
  log('\n🔍 VERIFICAÇÃO DO PERFIL GLOBAL - ITALO SANTOS', 'cyan');
  log('═'.repeat(65), 'cyan');

  const { db } = await initFirebase();

  let allChecks = true;

  // 1. Verificar perfil global
  log('\n📋 1. Verificando perfil global (admin/profileSettings)...', 'blue');
  const globalRef = db.collection('admin').doc('profileSettings');
  const globalDoc = await globalRef.get();

  if (!globalDoc.exists) {
    log('❌ ERRO: Perfil global NÃO existe!', 'red');
    log('   Execute: node scripts/setup-global-superadmin.js', 'yellow');
    allChecks = false;
  } else {
    const data = globalDoc.data();
    log('✅ Perfil global existe', 'green');
    log(`   Nome: ${data.name}`, 'cyan');
    log(`   Email: ${data.email}`, 'cyan');
    log(`   Username: ${data.username}`, 'cyan');
    log(`   isMainAdmin: ${data.isMainAdmin}`, 'cyan');
    log(`   isGlobalProfile: ${data.isGlobalProfile}`, 'cyan');

    // Validar campos obrigatórios
    if (!data.name || data.name === '') {
      log('⚠️  Nome está vazio', 'yellow');
      allChecks = false;
    }
    if (!data.email || data.email === '') {
      log('⚠️  Email está vazio', 'yellow');
      allChecks = false;
    }
    if (!data.username || data.username !== 'severepics') {
      log('⚠️  Username não é "severepics"', 'yellow');
      allChecks = false;
    }
    if (!data.isMainAdmin) {
      log('⚠️  isMainAdmin não está true', 'yellow');
      allChecks = false;
    }
  }

  // 2. Verificar se tem UID no perfil global
  log('\n📋 2. Verificando UID no perfil global...', 'blue');
  if (globalDoc.exists) {
    const data = globalDoc.data();
    if (data.uid) {
      log(`✅ UID encontrado: ${data.uid}`, 'green');

      // 3. Verificar se admin existe em admins/{uid}
      log('\n📋 3. Verificando documento em admins/{uid}...', 'blue');
      const adminDoc = await db.collection('admins').doc(data.uid).get();
      if (adminDoc.exists) {
        const adminData = adminDoc.data();
        log('✅ Documento existe em admins/{uid}', 'green');
        log(`   Username: ${adminData.username}`, 'cyan');
        log(`   isMainAdmin: ${adminData.isMainAdmin}`, 'cyan');

        if (adminData.username !== 'severepics') {
          log('⚠️  Username em admins/{uid} não é "severepics"', 'yellow');
          allChecks = false;
        }
        if (!adminData.isMainAdmin) {
          log('⚠️  isMainAdmin em admins/{uid} não está true', 'yellow');
          allChecks = false;
        }
      } else {
        log('❌ Documento NÃO existe em admins/{uid}', 'red');
        allChecks = false;
      }
    } else {
      log('⚠️  UID não encontrado no perfil global', 'yellow');
      allChecks = false;
    }
  }

  // 4. Verificar custom claims
  log('\n📋 4. Verificando custom claims...', 'blue');
  if (globalDoc.exists && globalDoc.data().uid) {
    const uid = globalDoc.data().uid;
    const user = await admin.auth().getUser(uid);
    const claims = user.customClaims || {};

    if (claims.admin && claims.isMainAdmin) {
      log('✅ Custom claims configuradas corretamente', 'green');
      log(`   admin: ${claims.admin}`, 'cyan');
      log(`   role: ${claims.role}`, 'cyan');
      log(`   isMainAdmin: ${claims.isMainAdmin}`, 'cyan');
    } else {
      log('⚠️  Custom claims não estão completas', 'yellow');
      log(`   admin: ${claims.admin}`, 'cyan');
      log(`   isMainAdmin: ${claims.isMainAdmin}`, 'cyan');
      allChecks = false;
    }
  }

  // 5. Verificar configurações essenciais
  log('\n📋 5. Verificando configurações essenciais do perfil...', 'blue');
  if (globalDoc.exists) {
    const data = globalDoc.data();
    const requiredFields = [
      'name',
      'email',
      'username',
      'profilePictureUrl',
      'coverPhotoUrl',
      'paymentSettings'
    ];

    let missingFields = [];
    for (const field of requiredFields) {
      if (!data[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length === 0) {
      log('✅ Todos os campos essenciais estão preenchidos', 'green');
    } else {
      log(`⚠️  Campos faltando: ${missingFields.join(', ')}`, 'yellow');
      allChecks = false;
    }
  }

  // Resumo final
  log('\n' + '═'.repeat(65), 'cyan');
  if (allChecks) {
    log('🎉 VERIFICAÇÃO CONCLUÍDA - TUDO OK!', 'green');
    log('═'.repeat(65), 'cyan');
    log('\n✅ O perfil de Italo Santos está configurado corretamente!', 'green');
    log('✅ A homepage (/) irá usar: admin/profileSettings', 'green');
    log('✅ Não será necessário UID para acessar o perfil global', 'green');
    log('\n🌍 URLs Configuradas:', 'bright');
    log('   https://italosantos.com/ (perfil global)', 'cyan');
    log('   https://italosantos.com/severepics (perfil público)', 'cyan');
    log('   https://italosantos.com/admin (painel admin)', 'cyan');
  } else {
    log('⚠️  VERIFICAÇÃO CONCLUÍDA - COM AVISOS', 'yellow');
    log('═'.repeat(65), 'cyan');
    log('\n⚠️  Alguns problemas foram encontrados', 'yellow');
    log('   Execute: node scripts/setup-global-superadmin.js', 'yellow');
  }
  log('');
}

verify()
  .then(() => process.exit(0))
  .catch((error) => {
    log(`❌ Erro: ${error.message}`, 'red');
    process.exit(1);
  });
