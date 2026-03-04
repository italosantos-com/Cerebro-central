'use server';

import { getAdminDb } from '@/lib/firebase-admin';

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export async function resolveAdminUidByUsernameServer(username: string | null | undefined): Promise<string | null> {
  const normalized = username ? normalizeUsername(username) : '';
  if (!normalized) return null;

  const adminDb = getAdminDb();
  if (!adminDb) return null;

  try {
    const snap = await adminDb
      .collection('admins')
      .where('username', '==', normalized)
      .limit(1)
      .get();

    if (snap.empty) return null;
    return snap.docs[0].id;
  } catch {
    return null;
  }
}
