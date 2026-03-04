import { auth, firebaseConfig } from '@/lib/firebase';
import { GoogleAuthProvider, OAuthProvider, signInWithPopup } from 'firebase/auth';

type SocialProvider = 'google' | 'apple';

function generateEmailFromUserId(userId: string): string {
  return `${userId}@italosantos.com`;
}

async function saveUserProfile(userId: string, userData: {
  displayName: string;
  email: string;
  photoURL: string | null;
  provider: string;
}) {
  const { getFirestore, doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const { app } = await import('@/lib/firebase');
  const db = getFirestore(app);

  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, {
    displayName: userData.displayName,
    email: userData.email,
    photoURL: userData.photoURL || '',
    provider: userData.provider,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export function getSocialLoginErrorMessage(error: any, provider: SocialProvider) {
  const code = String(error?.code || '');
  const rawMessage = String(error?.message || '').toLowerCase();
  const authDomain = firebaseConfig.authDomain || 'projeto-italo-bc5ef.firebaseapp.com';
  const firebaseRedirectUri = `https://${authDomain}/__/auth/handler`;

  if (code === 'auth/popup-closed-by-user') {
    return 'Você fechou a janela de login.';
  }

  if (code === 'auth/popup-blocked') {
    return `Permita pop-ups no navegador para entrar com ${provider === 'google' ? 'Google' : 'Apple'}.`;
  }

  if (code === 'auth/cancelled-popup-request') {
    return 'Outro login já está em andamento. Aguarde e tente novamente.';
  }

  if (code === 'auth/unauthorized-domain') {
    return 'Domínio não autorizado no Firebase Authentication. Adicione o domínio atual em Authentication > Settings > Authorized domains.';
  }

  if (provider === 'google' && (code === 'auth/invalid-credential' || rawMessage.includes('invalid_client'))) {
    return `Configuração OAuth do Google inválida (invalid_client). Verifique no Google Cloud/Firebase se o redirect URI autorizado inclui: ${firebaseRedirectUri}`;
  }

  if (provider === 'apple' && (rawMessage.includes('invalid web redirect url') || rawMessage.includes('invalid_request'))) {
    return `Configuração OAuth da Apple inválida (Invalid web redirect url). No Apple Developer (Services ID), configure Return URL para: ${firebaseRedirectUri}`;
  }

  if (code === 'auth/operation-not-allowed') {
    return `${provider === 'google' ? 'Google' : 'Apple'} não está habilitado no Firebase Authentication (Sign-in method).`;
  }

  return error?.message || 'Erro desconhecido ao autenticar.';
}

export async function signInWithSocialProvider(providerName: SocialProvider) {
  const provider = providerName === 'google'
    ? new GoogleAuthProvider()
    : new OAuthProvider('apple.com');

  if (providerName === 'google') {
    provider.addScope('email');
    provider.addScope('profile');
    provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
    provider.addScope('https://www.googleapis.com/auth/userinfo.email');
    provider.setCustomParameters({
      prompt: 'consent',
      access_type: 'offline',
      include_granted_scopes: 'true'
    });
  } else {
    provider.addScope('email');
    provider.addScope('name');
  }

  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  const displayName = user.displayName || user.email?.split('@')[0] || `Usuário ${providerName === 'google' ? 'Google' : 'Apple'}`;
  const email = user.email && user.email.trim() !== '' ? user.email : generateEmailFromUserId(user.uid);
  const photoURL = user.photoURL;

  await saveUserProfile(user.uid, {
    displayName,
    email,
    photoURL,
    provider: providerName
  });

  try { localStorage.setItem('isAuthenticated', 'true'); } catch (error) { console.warn('[social-auth] Falha ao salvar isAuthenticated no localStorage:', error); }
  try { localStorage.setItem('customerEmail', email); } catch (error) { console.warn('[social-auth] Falha ao salvar customerEmail no localStorage:', error); }
  try { localStorage.setItem('customerName', displayName); } catch (error) { console.warn('[social-auth] Falha ao salvar customerName no localStorage:', error); }

  return { user, displayName, email, photoURL };
}
