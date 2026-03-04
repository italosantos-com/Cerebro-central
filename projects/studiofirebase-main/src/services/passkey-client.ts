import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

export async function registerWithPasskey(email: string): Promise<{ verified: boolean }> {
  const registerResp = await fetch('/api/passkey/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!registerResp.ok) {
    throw new Error('Falha ao iniciar registro de passkey');
  }

  const options = await registerResp.json();
  const attestation = await startRegistration({ optionsJSON: options });

  const verifyResp = await fetch('/api/passkey/register/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(attestation),
  });

  if (!verifyResp.ok) {
    const errorBody = await verifyResp.json().catch(() => ({}));
    throw new Error(errorBody?.error || 'Falha ao verificar registro da passkey');
  }

  return verifyResp.json();
}

export async function loginWithPasskey(email: string): Promise<{ verified: boolean; user?: { uid: string; email: string; role: string } }> {
  const loginResp = await fetch('/api/passkey/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!loginResp.ok) {
    const errorBody = await loginResp.json().catch(() => ({}));
    throw new Error(errorBody?.error || 'Falha ao iniciar login com passkey');
  }

  const options = await loginResp.json();
  const assertion = await startAuthentication({ optionsJSON: options });

  const verifyResp = await fetch('/api/passkey/login/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assertion),
  });

  if (!verifyResp.ok) {
    const errorBody = await verifyResp.json().catch(() => ({}));
    throw new Error(errorBody?.error || 'Falha ao verificar login com passkey');
  }

  return verifyResp.json();
}

export async function logoutPasskeySession(): Promise<void> {
  await fetch('/api/logout', { method: 'POST' });
}

export async function removePasskeyByEmail(email: string): Promise<void> {
  const resp = await fetch('/api/passkey/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!resp.ok) {
    const errorBody = await resp.json().catch(() => ({}));
    throw new Error(errorBody?.error || 'Falha ao remover passkey');
  }
}

export async function getPasskeyStatusByEmail(email: string): Promise<{ hasPasskey: boolean }> {
  const resp = await fetch('/api/passkey/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!resp.ok) {
    const errorBody = await resp.json().catch(() => ({}));
    throw new Error(errorBody?.error || 'Falha ao consultar status da passkey');
  }

  return resp.json();
}
