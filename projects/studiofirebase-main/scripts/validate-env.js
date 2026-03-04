const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env');

if (!fs.existsSync(envPath)) {
  console.error('\n❌ Missing .env file at project root.');
  console.error('\n📝 To fix this:');
  console.error('   1. Copy .env.example to .env');
  console.error('   2. Fill in your actual credentials');
  console.error('   3. Run this validation again\n');
  console.error('   Command: cp .env.example .env\n');
  process.exitCode = 1;
  return;
}

const envContent = fs.readFileSync(envPath, 'utf8');

// Parse environment variables
const vars = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return;
  }
  const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (match) {
    vars[match[1]] = match[2].trim();
  }
});

// Check for critical SDK tokens
const criticalSDKs = [];

// Meta/Facebook SDK
if (!vars.NEXT_PUBLIC_FACEBOOK_APP_ID && !vars.FACEBOOK_APP_ID) {
  criticalSDKs.push({
    name: 'Meta/Facebook SDK',
    vars: ['NEXT_PUBLIC_FACEBOOK_APP_ID', 'FACEBOOK_APP_ID'],
    description: 'Required for Facebook/Instagram login and integrations'
  });
}

// PayPal SDK
if (!vars.NEXT_PUBLIC_PAYPAL_CLIENT_ID && !vars.PAYPAL_CLIENT_ID) {
  criticalSDKs.push({
    name: 'PayPal SDK',
    vars: ['NEXT_PUBLIC_PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_ID'],
    description: 'Required for PayPal payments'
  });
}

// Mercado Pago SDK
if (!vars.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY) {
  criticalSDKs.push({
    name: 'Mercado Pago SDK',
    vars: ['NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY'],
    description: 'Required for Mercado Pago/PIX payments'
  });
}

if (criticalSDKs.length > 0) {
  console.log('\n🚨 CRITICAL SDK TOKENS MISSING:\n');
  criticalSDKs.forEach(sdk => {
    console.log(`❌ ${sdk.name}`);
    console.log(`   ${sdk.description}`);
    console.log(`   Missing variables: ${sdk.vars.join(' or ')}\n`);
  });
}

const issues = [];
const warnings = [];
const info = [];

// Security checks
const dangerousPublicVars = [
  'NEXT_PUBLIC_ADMIN_PRIVATE_KEY',
  'NEXT_PUBLIC_ADMIN_CLIENT_EMAIL',
  'NEXT_PUBLIC_ADMIN_PRIVATE_KEY_ID',
  'NEXT_PUBLIC_WEB_PUSH_PRIVATE_KEY'
];

dangerousPublicVars.forEach(variable => {
  if (vars[variable]) {
    issues.push(`${variable} exposes sensitive admin credentials to the browser.`);
  }
});

// Check for private keys
Object.keys(vars).forEach(key => {
  if (!key.startsWith('NEXT_PUBLIC_')) {
    return;
  }
  if (key.includes('PRIVATE_KEY') || key.includes('SECRET') || key.includes('PASS')) {
    issues.push(`${key} exposes server-only data to client code.`);
  }
});

// Check environment consistency
if (vars.ENV_TYPE === 'producao' && vars.BRAINTREE_ENV === 'true') {
  warnings.push('BRAINTREE_ENV should be set to "production" when ENV_TYPE=producao.');
}

if (vars.APPLE_PAY_ENVIRONMENT === 'true' && vars.ENV_TYPE === 'producao') {
  warnings.push('APPLE_PAY_ENVIRONMENT appears to be test mode while ENV_TYPE=producao.');
}

// Info
info.push(`Total environment variables: ${Object.keys(vars).length}`);
info.push(`Public variables (NEXT_PUBLIC_*): ${Object.keys(vars).filter(k => k.startsWith('NEXT_PUBLIC_')).length}`);
info.push(`Environment: ${vars.ENV_TYPE || 'not set'}`);
info.push(`Project: ${vars.PROJECT_ID || 'not set'}`);

// Output results
console.log('\n=== ENVIRONMENT VALIDATION REPORT ===\n');

if (issues.length) {
  console.log('CRITICAL ISSUES:');
  issues.forEach(issue => console.log(`  - ${issue}`));
  console.log('');
}

if (warnings.length) {
  console.log('WARNINGS:');
  warnings.forEach(warning => console.log(`  - ${warning}`));
  console.log('');
}

console.log('INFORMATION:');
info.forEach(entry => console.log(`  - ${entry}`));

console.log('\n=== INTEGRATIONS CONFIGURED ===');
const integrations = {
  'Twitter/X': {
    configured: !!vars.TWITTER_API_KEY,
    required: ['TWITTER_API_KEY', 'TWITTER_API_SECRET']
  },
  'PayPal': {
    configured: !!(vars.PAYPAL_CLIENT_ID || vars.NEXT_PUBLIC_PAYPAL_CLIENT_ID),
    required: ['PAYPAL_CLIENT_ID or NEXT_PUBLIC_PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_ENV']
  },
  'Braintree': {
    configured: !!vars.BRAINTREE_MERCHANT_ID,
    required: ['BRAINTREE_MERCHANT_ID', 'BRAINTREE_PUBLIC_KEY', 'BRAINTREE_PRIVATE_KEY']
  },
  'Instagram': {
    configured: !!(vars.INSTAGRAM_APP_ID || vars.NEXT_PUBLIC_INSTAGRAM_APP_ID),
    required: ['INSTAGRAM_APP_ID or NEXT_PUBLIC_INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET']
  },
  'Facebook/Meta': {
    configured: !!(vars.FACEBOOK_APP_ID || vars.NEXT_PUBLIC_FACEBOOK_APP_ID),
    required: ['FACEBOOK_APP_ID or NEXT_PUBLIC_FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET']
  },
  'MercadoPago': {
    configured: !!(vars.MERCADOPAGO_PUBLIC_KEY || vars.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY),
    required: ['NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY', 'MERCADOPAGO_ACCESS_TOKEN or MERCADO_PAGO_ACCESS_TOKEN']
  },
  'Cloudflare': {
    configured: !!vars.CLOUDFLARE_ZONE_ID,
    required: ['CLOUDFLARE_ZONE_ID']
  },
  'Google Pay': {
    configured: !!vars.GOOGLE_PAY_MERCHANT_ID,
    required: ['NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID']
  },
  'Apple Pay': {
    configured: !!vars.NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID,
    required: ['NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID']
  },
  'SMTP': {
    configured: !!vars.SMTP_HOST,
    required: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS']
  },
  'Gemini AI': {
    configured: !!vars.GEMINI_API_KEY,
    required: ['GEMINI_API_KEY']
  }
};

Object.entries(integrations).forEach(([name, config]) => {
  const status = config.configured ? '✅ configured' : '❌ missing';
  console.log(`  - ${name}: ${status}`);
  if (!config.configured && config.required) {
    console.log(`    Required variables: ${config.required.join(', ')}`);
  }
});

console.log('\n=== SUMMARY ===');
console.log(`Critical Issues: ${issues.length}`);
console.log(`Warnings: ${warnings.length}`);
console.log('Recommendation: move sensitive keys to server-only variables and avoid exposing admin credentials to the client.');
