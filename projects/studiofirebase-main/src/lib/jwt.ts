import jwt, { type JwtPayload } from 'jsonwebtoken';

export interface SessionJwtPayload extends JwtPayload {
  uid: string;
  email: string;
  role: 'admin' | 'user' | string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (secret && secret.length >= 32) {
    return secret;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'dev-only-jwt-secret-change-me-1234567890';
  }

  throw new Error('JWT_SECRET ausente ou fraco. Configure um segredo com ao menos 32 caracteres.');
}

export function createSessionToken(payload: Pick<SessionJwtPayload, 'uid' | 'email' | 'role'>): string {
  return jwt.sign(payload, getJwtSecret(), {
    algorithm: 'HS256',
    expiresIn: '7d',
  });
}

export function verifySessionToken(token: string): SessionJwtPayload {
  return jwt.verify(token, getJwtSecret()) as SessionJwtPayload;
}
