#!/usr/bin/env node
/**
 * Script para marcar email de admin como verificado no Firebase
 * 
 * Útil para testes quando o email de verificação não chega
 * 
 * Uso:
 *   node scripts/verify-admin-email.js <uid>
 *   node scripts/verify-admin-email.js <email>
 */

const admin = require('firebase-admin');
const path = require('path');

async function verifyAdminEmail() {
  const input = process.argv[2];
  
  if (!input) {
    console.log('\n❌ Uso: node scripts/verify-admin-email.js <uid|email>\n');
    console.log('Exemplos:');
    console.log('  node scripts/verify-admin-email.js abc123def456');
    console.log('  node scripts/verify-admin-email.js admin@example.com\n');
    process.exit(1);
  }
  
  console.log('\n🔧 VERIFICAR EMAIL DE ADMIN\n');
  console.log('='.repeat(60));
  
  // Inicializar Firebase Admin
  console.log('\n📋 Inicializando Firebase Admin SDK...');
  
  let serviceAccount;
  try {
    serviceAccount = require(path.join(__dirname, '..', 'service_account.json'));
  } catch (err) {
    console.log('❌ Não foi possível carregar service_account.json');
    console.log('   Verifique se o arquivo existe no diretório raiz do projeto');
    process.exit(1);
  }
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  }
  
  const auth = admin.auth();
  console.log('✅ Firebase Admin SDK inicializado\n');
  
  // Identificar se é UID ou email
  let uid;
  let user;
  
  console.log(`🔍 Procurando usuário: ${input}\n`);
  
  try {
    if (input.includes('@')) {
      // É um email
      user = await auth.getUserByEmail(input);
      uid = user.uid;
      console.log(`✅ Encontrado usuário por email:`);
    } else {
      // É um UID
      user = await auth.getUser(input);
      uid = user.uid;
      console.log(`✅ Encontrado usuário por UID:`);
    }
  } catch (err) {
    console.log(`❌ Erro ao procurar usuário: ${err.message}`);
    process.exit(1);
  }
  
  // Mostrar informações do usuário
  console.log(`   UID: ${user.uid}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Email Verificado: ${user.emailVerified ? '✅ SIM' : '❌ NÃO'}`);
  console.log(`   DisplayName: ${user.displayName || '(sem nome)'}`);
  console.log(`   Conta Criada: ${user.metadata?.creationTime || '(desconhecido)'}\n`);
  
  // Se já está verificado, informar
  if (user.emailVerified) {
    console.log('⚠️  Email já está marcado como verificado!\n');
    process.exit(0);
  }
  
  // Marcar como verificado
  console.log(`📧 Marcando ${user.email} como verificado...\n`);
  
  try {
    await auth.updateUser(uid, { emailVerified: true });
    console.log('✅ EMAIL MARCADO COMO VERIFICADO COM SUCESSO!\n');
    console.log('🎉 Agora o admin pode fazer login sem problema\n');
    
    // Próximos passos
    console.log('=' .repeat(60));
    console.log('\n📋 Próximos passos:\n');
    console.log('1. Acesse: https://italosantos.com/admin');
    console.log(`2. Faça login com: ${user.email}`);
    console.log('3. A verificação de email já não será exigida\n');
    console.log('⚠️  IMPORTANTE: Isso é apenas para teste!');
    console.log('   Em produção, implemente o fluxo correto de verificação.\n');
    
  } catch (err) {
    console.log(`❌ Erro ao atualizar usuário: ${err.message}\n`);
    process.exit(1);
  }
  
  process.exit(0);
}

verifyAdminEmail().catch(err => {
  console.error('\n❌ Erro crítico:', err);
  process.exit(1);
});
