#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔄 Alternando ambiente PayPal...');

const envPath = path.join(__dirname, '../.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
} else {
  console.log('❌ Arquivo .env não encontrado');
  process.exit(1);
}

const readEnvValue = (content, keys) => {
  for (const key of keys) {
    const regex = new RegExp(`^${key}=([^\n]+)`, 'm');
    const match = content.match(regex);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
};

const currentValue = (readEnvValue(envContent, ['PAYPAL_ENVIRONMENT', 'PAYPAL_ENV']) || '').toLowerCase();
const isProd = ['production', 'prod', 'live'].includes(currentValue);
const currentEnv = isProd ? 'production' : 'sandbox';
const newEnv = currentEnv === 'production' ? 'sandbox' : 'production';

console.log(`📋 Ambiente atual: ${currentEnv}`);
console.log(`🔄 Mudando para: ${newEnv}`);

const upsertEnvVar = (content, key, value) => {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`);
  }
  const needsNewline = content.endsWith('\n') ? '' : '\n';
  return `${content}${needsNewline}${key}=${value}\n`;
};

envContent = upsertEnvVar(envContent, 'PAYPAL_ENVIRONMENT', newEnv);
envContent = upsertEnvVar(envContent, 'PAYPAL_ENV', newEnv);

// Salvar arquivo
fs.writeFileSync(envPath, envContent);

console.log(`✅ Ambiente alterado para: ${newEnv}`);

if (newEnv === 'production') {
  console.log('\n⚠️  ATENÇÃO: Agora você está em PRODUÇÃO!');
  console.log('💡 Certifique-se de que suas credenciais são de PRODUÇÃO');
  console.log('🔗 Acesse: https://developer.paypal.com para obter credenciais de produção');
} else {
  console.log('\n✅ Agora você está em SANDBOX (desenvolvimento)');
  console.log('💡 Use credenciais de sandbox para testes');
}

console.log('\n🚀 Para aplicar as mudanças:');
console.log('   npm run firebase-env');
console.log('   npm run firebase-deploy');
