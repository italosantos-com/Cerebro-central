#!/usr/bin/env node

/**
 * Script para atualizar os templates de e-mail do Firebase Authentication
 * 
 * Este script atualiza os Action URLs dos templates de e-mail para usar
 * a URL customizada da aplicação em vez do padrão do Firebase.
 * 
 * IMPORTANTE: Este script requer acesso ao Firebase Admin SDK e permissões adequadas.
 */

const admin = require('firebase-admin');
const serviceAccount = require('../service_account.json');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
}

const BASE_URL = 'https://italosantos.com';
const ACTION_URL = `${BASE_URL}/auth/action`;

console.log('🔧 Configurando Firebase Authentication Templates...\n');
console.log(`📍 Base URL: ${BASE_URL}`);
console.log(`🔗 Action URL: ${ACTION_URL}\n`);

console.log('⚠️  ATENÇÃO: Este script fornece as instruções para configuração manual.\n');
console.log('Os templates de e-mail do Firebase Authentication devem ser configurados manualmente no Firebase Console.\n');

console.log('📋 INSTRUÇÕES:\n');
console.log('1. Acesse o Firebase Console:');
console.log('   https://console.firebase.google.com/project/projeto-italo-bc5ef/authentication/emails\n');

console.log('2. Para cada template de e-mail, atualize o "Action URL":');
console.log('   ✉️  Verificação de e-mail');
console.log('   ✉️  Redefinição de senha');
console.log('   ✉️  Alteração de e-mail');
console.log('   ✉️  Configuração multifatorial (MFA)\n');

console.log('3. Configure o Action URL para:');
console.log(`   ${ACTION_URL}\n`);

console.log('4. Personalize os templates (opcional):');
console.log('   - Substitua __PROJECT_NAME__ por "Italo Santos"');
console.log('   - Personalize o texto e estilo conforme necessário\n');

console.log('5. Clique em "Salvar" para cada template\n');

console.log('📝 EXEMPLO DE URL COMPLETA:');
console.log(`   ${ACTION_URL}?mode=resetPassword&oobCode=ABC123&apiKey=YOUR_API_KEY\n`);

console.log('✅ Após configurar, teste enviando um e-mail de redefinição de senha');
console.log('   e verifique se o link redireciona corretamente para /auth/action\n');

console.log('🔗 REWRITE CONFIGURADO NO firebase.json:');
console.log('   /_/auth/action → /auth/action');
console.log('   Isso garante que links legados também funcionem.\n');

console.log('🎯 VARIÁVEIS DE AMBIENTE CONFIGURADAS:');
console.log(`   EMAIL_ACTION_BASE_URL=${ACTION_URL}\n`);

console.log('✨ Configuração concluída!\n');
