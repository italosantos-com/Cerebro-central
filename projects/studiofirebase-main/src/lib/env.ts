export const RP_NAME = process.env.PASSKEY_RP_NAME || 'StudioFirebase';

const defaultOrigin = process.env.NODE_ENV === 'production'
  ? 'https://seusite.com'
  : 'http://localhost:3000';

export const ORIGIN = process.env.PASSKEY_ORIGIN || process.env.NEXTAUTH_URL || defaultOrigin;

function resolveRpIdFromOrigin(origin: string): string {
  try {
    return new URL(origin).hostname;
  } catch {
    return process.env.NODE_ENV === 'production' ? 'seusite.com' : 'localhost';
  }
}

export const RP_ID = process.env.PASSKEY_RP_ID || resolveRpIdFromOrigin(ORIGIN);
