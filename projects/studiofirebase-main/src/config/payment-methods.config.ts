// Configuração centralizada dos métodos de pagamento
export const PAYMENT_CONFIG = {
  // Apple Pay via PayPal
  applePay: {
    enabled: true,
    gateway: 'paypal',
    merchantId: process.env.NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID || '',
    merchantName: 'Studio VIP',
    countryCode: 'US',
    currencyCode: 'USD',
    supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
    merchantCapabilities: ['supports3DS', 'supportsCredit', 'supportsDebit'],
    paypalConfig: {
      clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
      mode: (process.env.NEXT_PUBLIC_PAYPAL_MODE || 'sandbox') as 'sandbox' | 'live',
    },
  },

  // Google Pay via PayPal
  googlePay: {
    enabled: true,
    gateway: 'paypal',
    environment: (process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'TEST') as 'TEST' | 'PRODUCTION',
    merchantInfo: {
      merchantId: process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID || '',
      merchantName: process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_NAME || 'Studio VIP',
    },
    paypalConfig: {
      clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
      mode: (process.env.NEXT_PUBLIC_PAYPAL_MODE || 'sandbox') as 'sandbox' | 'live',
    },
    allowedCardNetworks: ['AMEX', 'DISCOVER', 'MASTERCARD', 'VISA'],
    allowedCardAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
  },

  // PIX via Mercado Pago
  pix: {
    enabled: true,
    gateway: 'mercadopago',
    publicKey: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '',
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
    expirationMinutes: 30,
  },

  // PayPal Direto (cartão)
  paypal: {
    enabled: true,
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    mode: (process.env.NEXT_PUBLIC_PAYPAL_MODE || 'sandbox') as 'sandbox' | 'live',
    currency: 'USD',
  },

  // Mercado Pago Direto (cartão)
  mercadopago: {
    enabled: true,
    publicKey: process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '',
    locale: 'pt-BR',
  },
} as const;

// Validar configurações
export function validatePaymentConfig() {
  const errors: string[] = [];

  if (PAYMENT_CONFIG.applePay.enabled) {
    if (!PAYMENT_CONFIG.applePay.merchantId) {
      errors.push('Apple Pay: NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID não configurado');
    }
    if (!PAYMENT_CONFIG.applePay.paypalConfig.clientId) {
      errors.push('Apple Pay: NEXT_PUBLIC_PAYPAL_CLIENT_ID não configurado');
    }
  }

  if (PAYMENT_CONFIG.googlePay.enabled) {
    if (!PAYMENT_CONFIG.googlePay.merchantInfo.merchantId) {
      errors.push('Google Pay: NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID não configurado');
    }
    if (!PAYMENT_CONFIG.googlePay.paypalConfig.clientId) {
      errors.push('Google Pay: NEXT_PUBLIC_PAYPAL_CLIENT_ID não configurado');
    }
  }

  if (PAYMENT_CONFIG.pix.enabled) {
    if (!PAYMENT_CONFIG.pix.publicKey) {
      errors.push('PIX: NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY não configurado');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Helper para verificar disponibilidade de cada método
export async function checkPaymentMethodAvailability() {
  const available = {
    applePay: false,
    googlePay: false,
    pix: true, // PIX sempre disponível no Brasil
    paypal: true,
    mercadopago: true,
  };

  // Verificar Apple Pay
  if (typeof window !== 'undefined' && (window as any).ApplePaySession) {
    available.applePay = await (window as any).ApplePaySession.canMakePayments();
  }

  // Verificar Google Pay
  if (typeof window !== 'undefined' && window.PaymentRequest) {
    try {
      const paymentRequest = new PaymentRequest(
        [{ supportedMethods: 'https://google.com/pay' }],
        {
          total: { label: 'Test', amount: { currency: 'USD', value: '0.01' } },
        }
      );
      available.googlePay = await paymentRequest.canMakePayment();
    } catch {
      available.googlePay = false;
    }
  }

  return available;
}
