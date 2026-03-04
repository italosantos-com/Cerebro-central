'use client';

import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const LOCAL_CACHE_PREFIX = 'adminUidByUsername:';

export async function resolveAdminUidByUsername(username: string): Promise<string | null> {
  const normalized = username.trim().toLowerCase();
  if (!normalized) return null;

  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(`${LOCAL_CACHE_PREFIX}${normalized}`);
      if (cached) return cached;
    } catch {
      // ignore
    }
  }

  try {
    const adminsRef = collection(db, 'admins');
    const q = query(adminsRef, where('username', '==', normalized), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const uid = snap.docs[0].id;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${LOCAL_CACHE_PREFIX}${normalized}`, uid);
      } catch {
        // ignore
      }
    }

    return uid;
  } catch {
    return null;
  }
}
