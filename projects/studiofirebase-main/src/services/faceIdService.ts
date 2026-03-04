// src/services/faceIdService.ts
const FACE_AUTH_API_URL = '/api/face-auth'; // URL da nova API local usando Firebase

export async function registerUser(data: {
  nome: string;
  email: string;
  telefone: string;
  image: string;
  video: string;
}) {
  const res = await fetch(FACE_AUTH_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'register', ...data }),
  });
  return await res.json();
}

export async function checkExistingUser(data: {
  email: string;
  telefone: string;
  image: string;
}) {
  const res = await fetch(FACE_AUTH_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'checkUser', ...data }),
  });
  return await res.json();
}

export async function loginWithFace(image: string) {
  const res = await fetch(FACE_AUTH_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', image }),
  });
  return await res.json();
}

export async function checkPayment(email: string) {
  const res = await fetch(FACE_AUTH_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'checkPayment', customerEmail: email }),
  });
  return await res.json();
}

export async function updateSubscription(data: {
  customerEmail: string;
  paymentId: string;
  subscriptionType?: string;
  subscriptionDuration?: number;
}) {
  const res = await fetch(FACE_AUTH_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'updateSubscription', ...data }),
  });
  return await res.json();
}
