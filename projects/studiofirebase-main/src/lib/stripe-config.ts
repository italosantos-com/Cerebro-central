// Configuração centralizada do Stripe para Google Pay e Apple Pay
export const STRIPE_CONFIG = {
  // Chaves públicas e secretas
  publicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '',
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_5386bdc067ec5facb66a0bf154d21d8e05e0002a0ceaaf16f028a4e22ac0255f',

  // Configuração de Google Pay
  googlePay: {
    merchantId: process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID || '01234567890123456789',
    merchantName: process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_NAME || 'Italo Santos Studio',
    environment: process.env.NEXT_PUBLIC_GOOGLE_PAY_ENVIRONMENT || 'TEST',
    paymentMethods: {
      type: 'CARD',
      parameters: {
        allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
        allowedCardNetworks: ['MASTERCARD', 'VISA', 'AMEX'],
      },
      tokenizationSpecification: {
        type: 'PAYMENT_GATEWAY',
        parameters: {
          gateway: 'stripe',
          'stripe:publishableKey': process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '',
        },
      },
    },
  },

  // Configuração de Apple Pay
  applePay: {
    merchantIdentifier: process.env.NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID || 'merchant.italosantos.com',
    merchantName: process.env.NEXT_PUBLIC_APPLE_PAY_MERCHANT_NAME || 'Italo Santos',
    countryCode: 'BR',
    currencyCode: 'BRL',
    supportedNetworks: ['visa', 'masterCard', 'amex'],
    // Stripe não exige configuração de certificado no frontend
  },
};
