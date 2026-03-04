import { cookies } from 'next/headers';

const CHALLENGE_COOKIE = 'passkey_challenge';
const PASSKEY_EMAIL_COOKIE = 'passkey_email';

function isSecureCookie(): boolean {
  return process.env.NODE_ENV === 'production';
}

export async function setPasskeyChallengeCookie(challenge: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CHALLENGE_COOKIE, challenge, {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 5,
  });
}

export async function setPasskeyEmailCookie(email: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PASSKEY_EMAIL_COOKIE, email, {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 10,
  });
}

export async function getPasskeyChallengeCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CHALLENGE_COOKIE)?.value || null;
}

export async function getPasskeyEmailCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(PASSKEY_EMAIL_COOKIE)?.value || null;
}

export async function clearPasskeyCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CHALLENGE_COOKIE);
  cookieStore.delete(PASSKEY_EMAIL_COOKIE);
}
