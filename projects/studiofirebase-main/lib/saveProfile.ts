import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface ProfileData {
  gender?: string;
  birthDate?: string;
  country?: string;
  language?: string;
  updatedAt?: Date;
}

export async function saveProfile(uid: string, data: ProfileData) {
  try {
    await setDoc(
      doc(db, 'users', uid),
      {
        ...data,
        updatedAt: new Date()
      },
      { merge: true }
    );
    return { success: true };
  } catch (error) {
    console.error('Erro ao salvar perfil:', error);
    throw error;
  }
}

export async function getProfile(uid: string) {
  try {
    const { getDoc } = await import('firebase/firestore');
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.data() || {};
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return {};
  }
}
