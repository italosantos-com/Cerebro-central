#!/usr/bin/env node

/**
 * Quick SDK Configuration Check
 * Run this to verify your SDK tokens are configured correctly
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Check if .env file exists
const envPath = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  log('\n❌ .env file not found!', 'red');
  log('\n📝 To fix this:', 'yellow');
  log('   1. Copy .env.example to .env', 'cyan');
  log('   2. Fill in your actual credentials', 'cyan');
  log('   3. Run this check again\n', 'cyan');
  log('   Command: cp .env.example .env\n', 'green');
  process.exit(1);
}

// Parse .env file
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (match) {
    env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

// Helper to check if value is a placeholder
function isPlaceholder(value) {
  if (!value || !value.trim()) return true;
  return /^(your[-_]|SEU_|INSIRA|COLOQUE|seu[-_]|placeholder|example|test[-_]|sample)/i.test(value);
}

// SDK Configuration Checks
const sdks = [
  {
    name: 'Meta/Facebook SDK',
    icon: '📘',
    checks: [
      {
        name: 'Facebook App ID',
        vars: ['NEXT_PUBLIC_FACEBOOK_APP_ID', 'FACEBOOK_APP_ID'],
        required: true,
      },
      {
        name: 'Facebook App Secret',
        vars: ['FACEBOOK_APP_SECRET'],
        required: true,
        secret: true,
      },
    ],
  },
  {
    name: 'PayPal SDK',
    icon: '💳',
    checks: [
      {
        name: 'PayPal Client ID',
        vars: ['NEXT_PUBLIC_PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_ID', 'PAYPAL_SANDBOX_CLIENT_ID'],
        required: true,
      },
      {
        name: 'PayPal Client Secret',
        vars: ['PAYPAL_CLIENT_SECRET', 'PAYPAL_SANDBOX_CLIENT_SECRET'],
        required: true,
        secret: true,
      },
      {
        name: 'PayPal Environment',
        vars: ['PAYPAL_ENV', 'NEXT_PUBLIC_PAYPAL_MODE'],
        required: false,
        validValues: ['sandbox', 'live', 'production'],
      },
    ],
  },
  {
    name: 'Mercado Pago SDK',
    icon: '💰',
    checks: [
      {
        name: 'Mercado Pago Public Key',
        vars: ['NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY'],
        required: true,
      },
      {
        name: 'Mercado Pago Access Token',
        vars: ['MERCADOPAGO_ACCESS_TOKEN', 'MERCADO_PAGO_ACCESS_TOKEN'],
        required: true,
        secret: true,
      },
    ],
  },
  {
    name: 'Instagram SDK',
    icon: '📸',
    checks: [
      {
        name: 'Instagram App ID',
        vars: ['INSTAGRAM_APP_ID', 'NEXT_PUBLIC_INSTAGRAM_APP_ID'],
        required: false,
      },
      {
        name: 'Instagram App Secret',
        vars: ['INSTAGRAM_APP_SECRET'],
        required: false,
        secret: true,
      },
    ],
  },
];

// Run checks
log('\n' + '='.repeat(60), 'cyan');
log('SDK CONFIGURATION CHECK', 'cyan');
log('='.repeat(60) + '\n', 'cyan');

let hasErrors = false;
let hasWarnings = false;

sdks.forEach(sdk => {
  log(`${sdk.icon} ${sdk.name}`, 'blue');
  
  let sdkConfigured = false;
  let sdkHasErrors = false;
  
  sdk.checks.forEach(check => {
    // Find first configured variable
    const configuredVar = check.vars.find(v => env[v] && !isPlaceholder(env[v]));
    const value = configuredVar ? env[configuredVar] : null;
    
    if (!value) {
      if (check.required) {
        log(`  ❌ ${check.name}: NOT CONFIGURED`, 'red');
        log(`     Missing: ${check.vars.join(' or ')}`, 'red');
        hasErrors = true;
        sdkHasErrors = true;
      } else {
        log(`  ⚠️  ${check.name}: not configured (optional)`, 'yellow');
        hasWarnings = true;
      }
    } else {
      // Check if value is valid
      if (check.validValues && !check.validValues.includes(value.toLowerCase())) {
        log(`  ⚠️  ${check.name}: "${value}"`, 'yellow');
        log(`     Should be one of: ${check.validValues.join(', ')}`, 'yellow');
        hasWarnings = true;
      } else {
        const displayValue = check.secret ? '***' + value.slice(-4) : value.substring(0, 20) + (value.length > 20 ? '...' : '');
        log(`  ✅ ${check.name}: ${displayValue}`, 'green');
        sdkConfigured = true;
      }
    }
  });
  
  if (!sdkHasErrors) {
    if (sdkConfigured) {
      log(`  Status: ✅ Configured\n`, 'green');
    } else {
      log(`  Status: ⚠️  Optional - Not configured\n`, 'yellow');
    }
  } else {
    log(`  Status: ❌ Configuration incomplete\n`, 'red');
  }
});

// Summary
log('='.repeat(60), 'cyan');
log('SUMMARY', 'cyan');
log('='.repeat(60), 'cyan');

if (hasErrors) {
  log('\n❌ Configuration has ERRORS that must be fixed', 'red');
  log('\n📖 See docs/SDK_CONFIGURATION_GUIDE.md for help', 'yellow');
  process.exit(1);
} else if (hasWarnings) {
  log('\n⚠️  Configuration has warnings but is functional', 'yellow');
  log('✅ Core SDKs are configured correctly\n', 'green');
  process.exit(0);
} else {
  log('\n✅ All SDKs are configured correctly!\n', 'green');
  process.exit(0);
}
