import fs from 'fs';
import path from 'path';

const DEFAULT_DOMAIN = 'italosantos.com';
const DEFAULT_DISPLAY_NAME = 'Italo Santos';
const DEFAULT_CERT_CANDIDATES = ['certs/merchant_id.pem', 'certs/apple-pay-cert.pem'];
const DEFAULT_KEY_CANDIDATES = ['certs/payment_processing.key', 'certs/apple-pay-key.pem'];

const APPLE_ALLOWED_HOSTS = new Set([
  'apple-pay-gateway.apple.com',
  'apple-pay-gateway-nc.apple.com',
  'apple-pay-gateway-cert.apple.com',
  'apple-pay-gateway-cert-nc.apple.com',
  'cn-apple-pay-gateway.apple.com',
  'cn-apple-pay-gateway-cert.apple.com'
]);

export interface ApplePayCredentials {
  merchantIdentifier: string;
  domainName: string;
  displayName: string;
  certificate: Buffer;
  privateKey: Buffer;
}

function resolvePath(candidate: string) {
  return path.isAbsolute(candidate) ? candidate : path.join(process.cwd(), candidate);
}

function resolveFilePath(explicitPath: string | undefined, fallbacks: string[]) {
  const candidates = explicitPath ? [explicitPath, ...fallbacks] : fallbacks;
  for (const candidate of candidates) {
    const resolved = resolvePath(candidate);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }
  throw new Error(`Arquivo Apple Pay não encontrado. Verifique caminhos: ${candidates.join(', ')}`);
}

export function getApplePayCredentials(merchantIdOverride?: string): ApplePayCredentials {
  const merchantIdentifier = merchantIdOverride || process.env.APPLE_PAY_MERCHANT_ID || process.env.NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID;
  if (!merchantIdentifier) {
    throw new Error('Merchant ID Apple Pay não configurado. Defina APPLE_PAY_MERCHANT_ID ou forneça no body.');
  }

  const domainName =
    process.env.APPLE_PAY_MERCHANT_DOMAIN || process.env.APPLE_PAY_DOMAIN_NAME || DEFAULT_DOMAIN;
  const displayName = process.env.APPLE_PAY_DISPLAY_NAME || DEFAULT_DISPLAY_NAME;

  const certificatePath = resolveFilePath(process.env.APPLE_PAY_CERTIFICATE_PATH, DEFAULT_CERT_CANDIDATES);
  const keyPath = resolveFilePath(process.env.APPLE_PAY_KEY_PATH, DEFAULT_KEY_CANDIDATES);

  return {
    merchantIdentifier,
    domainName,
    displayName,
    certificate: fs.readFileSync(certificatePath),
    privateKey: fs.readFileSync(keyPath)
  };
}

export function sanitizeAppleValidationURL(validationURL: string) {
  if (!validationURL) {
    throw new Error('validationURL é obrigatório');
  }

  const url = new URL(validationURL);
  if (url.protocol !== 'https:') {
    throw new Error('Apple Pay validationURL deve usar HTTPS');
  }

  const host = url.hostname.toLowerCase();
  if (!APPLE_ALLOWED_HOSTS.has(host)) {
    throw new Error(`Host não autorizado para validação Apple Pay: ${host}`);
  }

  return url;
}
