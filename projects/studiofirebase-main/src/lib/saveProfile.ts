import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ProfileData {
  gender?: string;
  birthDate?: string;
  country?: string;
  state?: string;
  city?: string;
}

export async function saveProfile(uid: string, data: ProfileData) {
  await setDoc(
    doc(db, 'users', uid),
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getProfile(uid: string): Promise<ProfileData> {
  const profileDoc = await getDoc(doc(db, 'users', uid));
  if (!profileDoc.exists()) {
    return {};
  }

  const data = profileDoc.data();
  return {
    gender: data.gender ?? '',
    birthDate: data.birthDate ?? '',
    country: data.country ?? '',
    state: data.state ?? '',
    city: data.city ?? '',
  };
}
