const fs = require('fs');
const content = fs.readFileSync('.env', 'utf8');

const vars = {};
content.split('\n').forEach(line => {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (match) vars[match[1]] = match[2];
});

console.log('\n=== ENVIRONMENT VALIDATION REPORT ===\n');

// Critical issues
const critical = [];
if (vars.NEXT_PUBLIC_ADMIN_PRIVATE_KEY) critical.push('NEXT_PUBLIC_ADMIN_PRIVATE_KEY exposes Firebase Admin private key to browser');
if (vars.NEXT_PUBLIC_ADMIN_CLIENT_EMAIL) critical.push('NEXT_PUBLIC_ADMIN_CLIENT_EMAIL exposes admin email to browser');
if (vars.NEXT_PUBLIC_WEB_PUSH_PRIVATE_KEY && vars.NEXT_PUBLIC_WEB_PUSH_PRIVATE_KEY.length > 0) critical.push('NEXT_PUBLIC_WEB_PUSH_PRIVATE_KEY exposes private key');

if (critical.length > 0) {
  console.log('CRITICAL SECURITY ISSUES:');
  critical.forEach(i => console.log('  - ' + i));
  console.log('');
}

// Warnings
const warnings = [];
if (vars.ENV_TYPE === 'producao' && vars.BRAINTREE_ENV === 'true') {
  warnings.push('BRAINTREE_ENV should be "production" or "live" not "true"');
}
if (vars.APPLE_PAY_ENVIRONMENT === 'true') {
  warnings.push('APPLE_PAY_ENVIRONMENT uses boolean "true" instead of "production"/"sandbox"');
}

if (warnings.length > 0) {
  console.log('WARNINGS:');
  warnings.forEach(w => console.log('  - ' + w));
  console.log('');
}

// Summary
console.log('SUMMARY:');
console.log('  Total variables: ' + Object.keys(vars).length);
console.log('  Public variables: ' + Object.keys(vars).filter(k => k.startsWith('NEXT_PUBLIC_')).length);
console.log('  Environment: ' + (vars.ENV_TYPE || 'not set'));
console.log('  Project: ' + (vars.PROJECT_ID || 'not set'));
console.log('');

// Integrations
console.log('INTEGRATIONS CONFIGURED:');
const integrations = {
  'Twitter/X': !!vars.TWITTER_API_KEY,
  'PayPal': !!vars.PAYPAL_CLIENT_ID,
  'Braintree': !!vars.BRAINTREE_MERCHANT_ID,
  'Instagram': !!vars.INSTAGRAM_APP_ID,
  'Facebook': !!vars.FACEBOOK_APP_ID,
  'MercadoPago': !!vars.MERCADOPAGO_PUBLIC_KEY,
  'Cloudflare': !!vars.CLOUDFLARE_ZONE_ID,
  'Google Pay': !!vars.GOOGLE_PAY_MERCHANT_ID,
  'Apple Pay': !!vars.NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID,
  'SMTP Email': !!vars.SMTP_HOST,
  'Gemini AI': !!vars.GEMINI_API_KEY
};

Object.keys(integrations).forEach(key => {
  console.log('  ' + key + ': ' + (integrations[key] ? 'YES' : 'NO'));
});

console.log('\nCritical Issues: ' + critical.length);
console.log('Warnings: ' + warnings.length);
