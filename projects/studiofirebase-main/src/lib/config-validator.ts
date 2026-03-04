/**
 * Configuration Validator
 * Validates environment variables for SDKs and integrations
 * Provides helpful error messages when tokens are missing or invalid
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SDKConfig {
  name: string;
  enabled: boolean;
  tokens: {
    name: string;
    value: string | undefined;
    required: boolean;
    clientSide?: boolean;
  }[];
}

/**
 * Validate Meta/Facebook SDK Configuration
 */
export function validateMetaSDK(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId) {
    errors.push(
      'Meta/Facebook SDK: NEXT_PUBLIC_FACEBOOK_APP_ID is not configured. ' +
      'This is required for Facebook and Instagram integrations. ' +
      'Get your App ID from https://developers.facebook.com/'
    );
  } else if (appId === 'your-facebook-app-id') {
    errors.push(
      'Meta/Facebook SDK: NEXT_PUBLIC_FACEBOOK_APP_ID contains placeholder value. ' +
      'Replace it with your actual Facebook App ID from https://developers.facebook.com/'
    );
  }

  if (!appSecret) {
    warnings.push(
      'Meta/Facebook SDK: FACEBOOK_APP_SECRET is not configured. ' +
      'This is required for server-side Facebook API calls. ' +
      'Keep this secret and never expose it to the client.'
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate PayPal SDK Configuration
 */
export function validatePayPalSDK(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const env = process.env.PAYPAL_ENV || process.env.NEXT_PUBLIC_PAYPAL_MODE;

  if (!clientId) {
    errors.push(
      'PayPal SDK: NEXT_PUBLIC_PAYPAL_CLIENT_ID is not configured. ' +
      'This is required for PayPal payments. ' +
      'Get your Client ID from https://developer.paypal.com/dashboard/'
    );
  } else if (clientId.includes('your-') || clientId.includes('client-id')) {
    errors.push(
      'PayPal SDK: NEXT_PUBLIC_PAYPAL_CLIENT_ID contains placeholder value. ' +
      'Replace it with your actual PayPal Client ID.'
    );
  }

  if (!clientSecret) {
    warnings.push(
      'PayPal SDK: PAYPAL_CLIENT_SECRET is not configured. ' +
      'This is required for server-side PayPal operations. ' +
      'Keep this secret and never expose it to the client.'
    );
  }

  if (!env) {
    warnings.push(
      'PayPal SDK: PAYPAL_ENV is not set. Defaulting to sandbox. ' +
      'Set to "live" or "production" for production environment.'
    );
  } else {
    const envStr = String(env).toLowerCase();
    if (envStr === 'true' || envStr === 'false') {
      errors.push(
        'PayPal SDK: PAYPAL_ENV should be "sandbox" or "live"/"production", not a boolean.'
      );
    }
  }

  // Validate sandbox vs live credentials
  if (env === 'sandbox') {
    const sandboxClientId = process.env.PAYPAL_SANDBOX_CLIENT_ID;
    if (!sandboxClientId && clientId) {
      warnings.push(
        'PayPal SDK: Using PAYPAL_ENV=sandbox but PAYPAL_SANDBOX_CLIENT_ID is not set. ' +
        'Make sure NEXT_PUBLIC_PAYPAL_CLIENT_ID contains your sandbox credentials.'
      );
    }
  } else if (env === 'live' || env === 'production') {
    const liveClientId = process.env.PAYPAL_LIVE_CLIENT_ID;
    if (!liveClientId && clientId) {
      warnings.push(
        'PayPal SDK: Using PAYPAL_ENV=live but PAYPAL_LIVE_CLIENT_ID is not set. ' +
        'Make sure NEXT_PUBLIC_PAYPAL_CLIENT_ID contains your live credentials.'
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate Mercado Pago SDK Configuration
 */
export function validateMercadoPagoSDK(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!publicKey) {
    errors.push(
      'Mercado Pago SDK: NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY is not configured. ' +
      'This is required for Mercado Pago and PIX payments. ' +
      'Get your Public Key from https://www.mercadopago.com/developers/panel/app'
    );
  } else if (publicKey.includes('your-') || publicKey.includes('public-key')) {
    errors.push(
      'Mercado Pago SDK: NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY contains placeholder value. ' +
      'Replace it with your actual Mercado Pago Public Key.'
    );
  }

  if (!accessToken) {
    warnings.push(
      'Mercado Pago SDK: MERCADOPAGO_ACCESS_TOKEN is not configured. ' +
      'This is required for server-side Mercado Pago operations. ' +
      'Keep this secret and never expose it to the client. ' +
      'Alternatively, connect your account via Admin > Integrações.'
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate Instagram SDK Configuration
 */
export function validateInstagramSDK(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const appId = process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;

  if (!appId) {
    warnings.push(
      'Instagram SDK: INSTAGRAM_APP_ID is not configured. ' +
      'This is optional but required for Instagram Business integrations. ' +
      'Get your App ID from https://developers.facebook.com/'
    );
  }

  if (!appSecret && appId) {
    warnings.push(
      'Instagram SDK: INSTAGRAM_APP_SECRET is not configured but APP_ID is set. ' +
      'The secret is required for OAuth flows.'
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate all SDK configurations
 */
export function validateAllSDKs(): {
  valid: boolean;
  results: Record<string, ValidationResult>;
} {
  const results = {
    meta: validateMetaSDK(),
    paypal: validatePayPalSDK(),
    mercadopago: validateMercadoPagoSDK(),
    instagram: validateInstagramSDK(),
  };

  const valid = Object.values(results).every(r => r.valid);

  return { valid, results };
}

/**
 * Get SDK configuration status
 */
export function getSDKStatus(): SDKConfig[] {
  return [
    {
      name: 'Meta/Facebook SDK',
      enabled: !!(process.env.NEXT_PUBLIC_FACEBOOK_APP_ID),
      tokens: [
        {
          name: 'NEXT_PUBLIC_FACEBOOK_APP_ID',
          value: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
          required: true,
          clientSide: true,
        },
        {
          name: 'FACEBOOK_APP_SECRET',
          value: process.env.FACEBOOK_APP_SECRET,
          required: true,
          clientSide: false,
        },
      ],
    },
    {
      name: 'PayPal SDK',
      enabled: !!(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID),
      tokens: [
        {
          name: 'NEXT_PUBLIC_PAYPAL_CLIENT_ID',
          value: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
          required: true,
          clientSide: true,
        },
        {
          name: 'PAYPAL_CLIENT_SECRET',
          value: process.env.PAYPAL_CLIENT_SECRET,
          required: true,
          clientSide: false,
        },
        {
          name: 'PAYPAL_ENV',
          value: process.env.PAYPAL_ENV,
          required: false,
          clientSide: false,
        },
      ],
    },
    {
      name: 'Mercado Pago SDK',
      enabled: !!(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY),
      tokens: [
        {
          name: 'NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY',
          value: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY,
          required: true,
          clientSide: true,
        },
        {
          name: 'MERCADOPAGO_ACCESS_TOKEN',
          value: process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN,
          required: true,
          clientSide: false,
        },
      ],
    },
    {
      name: 'Instagram SDK',
      enabled: !!(process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID),
      tokens: [
        {
          name: 'INSTAGRAM_APP_ID',
          value: process.env.INSTAGRAM_APP_ID,
          required: false,
          clientSide: false,
        },
        {
          name: 'INSTAGRAM_APP_SECRET',
          value: process.env.INSTAGRAM_APP_SECRET,
          required: false,
          clientSide: false,
        },
      ],
    },
  ];
}

/**
 * Log SDK validation results to console
 */
export function logSDKValidation(): void {
  const { valid, results } = validateAllSDKs();

  console.log('\n=== SDK CONFIGURATION VALIDATION ===\n');

  Object.entries(results).forEach(([sdk, result]) => {
    const icon = result.valid ? '✅' : result.errors.length > 0 ? '❌' : '⚠️';
    console.log(`${icon} ${sdk.toUpperCase()}`);
    
    if (result.errors.length > 0) {
      console.log('  Errors:');
      result.errors.forEach(error => console.log(`    - ${error}`));
    }
    
    if (result.warnings.length > 0) {
      console.log('  Warnings:');
      result.warnings.forEach(warning => console.log(`    - ${warning}`));
    }
    
    if (result.valid && result.warnings.length === 0) {
      console.log('  ✓ Configured correctly');
    }
    
    console.log('');
  });

  if (!valid) {
    console.log('⚠️  Some SDKs have configuration errors. Please fix them before deploying.\n');
  } else {
    console.log('✅ All critical SDKs are configured correctly!\n');
  }
}
