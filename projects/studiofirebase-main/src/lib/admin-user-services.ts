import { getAdminAuth, getAdminDb, getAdminBucket } from '@/lib/firebase-admin';

export type UserLookupInput = {
  uid?: string;
  email?: string;
  phone?: string;
};

export type UserLookupResult = {
  uid: string;
  email?: string | null;
  phone?: string | null;
};

export type SearchResultItem = {
  path: string;
  collection: string;
  id: string;
  data: Record<string, any>;
};

const DEFAULT_FIELDS = [
  'uid',
  'userId',
  'userUid',
  'ownerUid',
  'createdBy',
  'email',
  'phone',
  'phoneNumber'
];

function ensureAdminServices() {
  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();

  if (!adminAuth || !adminDb) {
    throw new Error('Firebase Admin não inicializado');
  }

  return { adminAuth, adminDb };
}

export async function resolveUserIdentifiers(input: UserLookupInput): Promise<UserLookupResult> {
  const { adminAuth } = ensureAdminServices();

  if (input.uid) {
    const user = await adminAuth.getUser(input.uid);
    return { uid: user.uid, email: user.email, phone: user.phoneNumber };
  }

  if (input.email) {
    const user = await adminAuth.getUserByEmail(input.email);
    return { uid: user.uid, email: user.email, phone: user.phoneNumber };
  }

  if (input.phone) {
    const user = await adminAuth.getUserByPhoneNumber(input.phone);
    return { uid: user.uid, email: user.email, phone: user.phoneNumber };
  }

  throw new Error('Informe uid, email ou telefone');
}

export async function searchUserData(options: UserLookupInput & { limitPerCollection?: number }) {
  const { adminDb } = ensureAdminServices();
  const { uid, email, phone, limitPerCollection = 50 } = options;

  const identifiers = {
    uid: uid || '',
    email: email || '',
    phone: phone || ''
  };

  const collections = await adminDb.listCollections();
  const results: SearchResultItem[] = [];
  const seen = new Set<string>();

  for (const col of collections) {
    const collectionName = col.id;

    if (uid) {
      try {
        const docRef = adminDb.collection(collectionName).doc(uid);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          const path = docRef.path;
          if (!seen.has(path)) {
            seen.add(path);
            results.push({
              path,
              collection: collectionName,
              id: docSnap.id,
              data: docSnap.data() || {}
            });
          }
        }
      } catch {
        // ignora
      }
    }

    for (const field of DEFAULT_FIELDS) {
      const value = (identifiers as any)[field] || identifiers.uid || identifiers.email || identifiers.phone;
      if (!value) continue;

      try {
        const querySnap = await adminDb
          .collection(collectionName)
          .where(field, '==', value)
          .limit(limitPerCollection)
          .get();

        querySnap.docs.forEach((doc) => {
          const path = doc.ref.path;
          if (seen.has(path)) return;
          seen.add(path);
          results.push({
            path,
            collection: collectionName,
            id: doc.id,
            data: doc.data() || {}
          });
        });
      } catch {
        // ignora coleções sem índice/sem campo
      }
    }
  }

  return {
    results,
    collectionsScanned: collections.length
  };
}

export async function deleteUserData(options: UserLookupInput & { limitPerCollection?: number }) {
  const { adminDb } = ensureAdminServices();
  const { results, collectionsScanned } = await searchUserData(options);
  const recursiveDelete = (adminDb as any).recursiveDelete?.bind(adminDb);

  let deleted = 0;

  for (const item of results) {
    try {
      const docRef = adminDb.doc(item.path);
      if (recursiveDelete) {
        await recursiveDelete(docRef);
      } else {
        await docRef.delete();
      }
      deleted += 1;
    } catch {
      // ignora falhas individuais
    }
  }

  return {
    deleted,
    collectionsScanned,
    matched: results.length
  };
}

export async function clearExternalData(prefixes: string[]) {
  const bucket = getAdminBucket();
  if (!bucket) {
    throw new Error('Storage Admin não inicializado');
  }

  let removed = 0;

  for (const prefix of prefixes) {
    const [files] = await bucket.getFiles({ prefix });
    if (files.length === 0) continue;

    await Promise.all(
      files.map(async (file) => {
        try {
          await file.delete();
          removed += 1;
        } catch {
          // ignora
        }
      })
    );
  }

  return { removed };
}
