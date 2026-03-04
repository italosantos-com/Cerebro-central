// Apple Pay config migrada para Stripe. Use src/lib/stripe-config.ts

/**
 * Validação de configuração
 */


/**
 * Configuração de pagamento para Apple Pay via Braintree
 */
export interface ApplePayPaymentRequest {
  total: {
    label: string;
    amount: string;
  };
  countryCode: string;
  currencyCode: string;
  merchantCapabilities: string[];
  supportedNetworks: string[];
}

/**
 * Cria um payment request para Apple Pay
 */

