import { cookies } from 'next/headers';
import { verifySessionToken, type SessionJwtPayload } from './jwt';

export async function getCurrentUser(): Promise<SessionJwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (!token) {
    return null;
  }

  try {
    return verifySessionToken(token);
  } catch {
    return null;
  }
}
