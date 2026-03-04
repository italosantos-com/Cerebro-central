// Configuração do Braintree Gateway
import braintree from 'braintree';

// Singleton para o gateway Braintree
let gateway: any | null = null;

/**
 * Credenciais Braintree Sandbox
 * 
 * Server-side:
 * - Merchant ID: 75tzy2qyrkv9hfwj
 * - Public Key: vkvp26rxfb4wd4qx
 * - Private Key: 7eefa5f69c77f009e83281a9491a6c4d
 * 
 * Client-side (Tokenization):
 * - Tokenization Key: sandbox_44sj35kb_75tzy2qyrkv9hfwj
 * - CSE Key: MIIBCgKCAQEAyQLDjvPtHUouNHwJMohcKjHykHhNOqKY5G4tgZGoNnA4GYsD5AE5zKYApURmKXQqkh8FcExlMyXr0/hD9OHwANf5d9XE/62zSb/hwAlpWjztGlF95bNsewDOTmL7VCungqgHZYvf9yDHuzIV7JBIxjRiBugxfiE8AA8yIgjIWohYER8PdiMCz6d2RDk1qSN8vHanmFESXRnp8djoj4YaoVArgd59VkIwfu8Wo9ZDdgCWAFwL7NW25xu+QEOGuy3/vEVN46xE13ZMrw1/tsaaOO8zz1+fsqyjrkJm6Kt5ukmWbzCdUqHgqQEwC2CvsqvMx2AlRtlvPwILk0/Li/0NLQIDAQAB
 */

/**
 * Obtém instância singleton do Braintree Gateway
 * Configurado com credenciais de sandbox por padrão
 */
export function getBraintreeGateway(): any {
  if (gateway) {
    return gateway;
  }

  const merchantId = process.env.BRAINTREE_MERCHANT_ID || '75tzy2qyrkv9hfwj';
  const publicKey = process.env.BRAINTREE_PUBLIC_KEY || 'vkvp26rxfb4wd4qx';
  const privateKey = process.env.BRAINTREE_PRIVATE_KEY || '7eefa5f69c77f009e83281a9491a6c4d';
  const environment = (process.env.BRAINTREE_ENV || 'sandbox').toLowerCase();

  if (!merchantId || !publicKey || !privateKey) {
    throw new Error(
      'Braintree credentials not configured. Please set BRAINTREE_MERCHANT_ID, BRAINTREE_PUBLIC_KEY, and BRAINTREE_PRIVATE_KEY in your environment variables.'
    );
  }

  // Determinar ambiente
  let env: any;
  if (environment === 'production') {
    env = braintree.Environment.Production;
    console.log('[Braintree] 🌍 Usando ambiente PRODUÇÃO');
  } else {
    env = braintree.Environment.Sandbox;
    console.log('[Braintree] 🧪 Usando ambiente SANDBOX');
  }

  console.log('[Braintree] 🔧 Configurando gateway...');
  console.log('[Braintree] 📋 Merchant ID:', merchantId);
  console.log('[Braintree] 🔑 Public Key:', publicKey);

  gateway = new braintree.BraintreeGateway({
    environment: env,
    merchantId,
    publicKey,
    privateKey,
  });

  console.log('[Braintree] ✅ Gateway configurado com sucesso');
  return gateway;
}

// Tipos para transações
export interface BraintreeTransactionResult {
  success: boolean;
  transaction?: any;
  message?: string;
  errors?: any;
}

export interface BraintreeCustomer {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
}
