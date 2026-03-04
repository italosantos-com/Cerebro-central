const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envFile = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envFile)) {
  console.warn('⚠️ Arquivo .env.local não encontrado. Crie-o a partir de .env.template ou copie o .env.local.example.');
  process.exitCode = 1;
  return;
}

const envContent = fs.readFileSync(envFile, 'utf-8');
const env = dotenv.parse(envContent);
const PAYPAL_ENV = (env.PAYPAL_ENV || '').toLowerCase();
const isLive = PAYPAL_ENV === 'live' || PAYPAL_ENV === 'production' || PAYPAL_ENV === 'prod';

const requiredLive = ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'];
const requiredSandbox = ['PAYPAL_SANDBOX_CLIENT_ID', 'PAYPAL_SANDBOX_CLIENT_SECRET'];
// For PayPal Web SDK v6, a client-side key is not required
const always = [];

console.log('📁 Verificando variáveis PayPal em .env.local...');
console.log(`🔧 PAYPAL_ENV=${PAYPAL_ENV || '(não definido)'} | ambiente=${isLive ? 'live' : 'sandbox'}`);

let missing = [];
for (const k of always) if (!env[k]) missing.push(k);
for (const k of (isLive ? requiredLive : requiredSandbox)) if (!env[k]) missing.push(k);

if (missing.length) {
  console.warn('⚠️ As seguintes chaves estão ausentes ou vazias:');
  for (const k of missing) console.warn(`   - ${k}`);
  console.info('Ajuste as variáveis conforme o ambiente selecionado (PAYPAL_ENV).');
  process.exitCode = 1;
} else {
  console.log('✅ Variáveis obrigatórias presentes para o ambiente selecionado.');
}

// Sinalizar possíveis conflitos
const bothSetsPresent = requiredLive.every(k => env[k]) && requiredSandbox.every(k => env[k]);
if (bothSetsPresent) {
  console.warn('⚠️ Atenção: variáveis live e sandbox estão definidas. PAYPAL_ENV controla qual conjunto será usado.');
}

// Detect placeholders (e.g., SEU_CLIENT_ID_...)
const placeholderLike = (v) => /^(SEU_|YOUR\b|INSIRA|COLOQUE)/i.test(String(v || ''));
const placeholderKeys = [];
for (const k of [...requiredLive, ...requiredSandbox]) {
  if (env[k] && placeholderLike(env[k])) placeholderKeys.push(k);
}
if (placeholderKeys.length) {
  console.warn('⚠️ Valores de placeholder detectados nessas chaves (substitua por valores reais):');
  for (const k of placeholderKeys) console.warn(`   - ${k}`);
  process.exitCode = 1;
}