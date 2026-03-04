
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  User,
  getAuth
} from 'firebase/auth';
import { doc, setDoc, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { getBaseUrl } from '@/lib/utils';
import { isSuperAdminUsername } from '@/lib/superadmin-config';

const USERNAME_REGEX = /^[a-z0-9-_]{3,20}$/;

type AdminData = {
  uid?: string;
  name?: string;
  email?: string;
  username?: string;
  isMainAdmin?: boolean;
  [key: string]: unknown;
};

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeUsername(value: string) {
  return safeDecodeURIComponent(value).toLowerCase().trim();
}

function slugifyToUsername(value: string) {
  const normalized = value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replaceAll(/[^a-z0-9-_]+/g, '-')
    .replaceAll(/-+/g, '-')
    .replaceAll(/(^-)|(-$)/g, '');

  if (!normalized) return '';
  if (normalized.length < 3) return normalized;
  if (normalized.length > 20) return normalized.slice(0, 20).replaceAll(/-+$/g, '');
  return normalized;
}

function usernameFromEmail(email: unknown) {
  if (typeof email !== 'string') return '';
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return '';
  return slugifyToUsername(email.slice(0, atIndex));
}

// Helper to set up RecaptchaVerifier
const setupRecaptcha = (containerId: string) => {
  const authInstance = getAuth();
  if (globalThis.window && globalThis.document) {
    // Ensure the container is empty before rendering a new one
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
    }

    const RecaptchaVerifierCtor = RecaptchaVerifier as unknown as new (
      auth: ReturnType<typeof getAuth>,
      container: string | HTMLElement,
      parameters: Record<string, unknown>
    ) => RecaptchaVerifier;

    return new RecaptchaVerifierCtor(authInstance, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
      }
    });
  }
  return null;
};


// Admin Registration
export const registerAdmin = async (email: string, password: string, name: string, phone: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Send email verification
  // Redireciona para o painel do admin pelo username
  const adminDocSnap = await getDoc(doc(db, "admins", user.uid));
  let usernameValue = "";
  if (adminDocSnap.exists()) {
    const adminData = adminDocSnap.data();
    usernameValue = adminData.username ? String(adminData.username).toLowerCase().trim() : "";
  }
  // fallback para uid se não houver username
  if (!usernameValue) usernameValue = user.uid;
  const actionUrl = `${getBaseUrl()}/auth/action?context=admin&redirect=/${usernameValue}/admin`;
  await sendEmailVerification(user, {
    url: actionUrl,
    handleCodeInApp: true,
  });

  // Store additional admin details in Firestore
  await setDoc(doc(db, "admins", user.uid), {
    uid: user.uid,
    name: name,
    email: email,
    phone: phone,
    createdAt: new Date(),
    role: 'admin'
  });

  return user;
};

// Send Phone Verification Code
export const sendPhoneVerificationCode = async (phoneNumber: string, recaptchaContainerId: string): Promise<ConfirmationResult> => {
  const recaptchaVerifier = setupRecaptcha(recaptchaContainerId);
  if (!recaptchaVerifier) {
    throw new Error("Recaptcha verifier not available.");
  }
  return await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
};

// Verify Phone Code
export const verifyPhoneCode = async (confirmationResult: ConfirmationResult, code: string) => {
  return await confirmationResult.confirm(code);
};
// Forgot Password
export const sendAdminPasswordResetEmail = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string; customData?: unknown };

    // Tratamento específico de erros do Firebase
    if (firebaseError.code === 'auth/user-not-found') {
      throw new Error('Nenhuma conta encontrada com este email.');
    } else if (firebaseError.code === 'auth/invalid-email') {
      throw new Error('Formato de email inválido.');
    } else if (firebaseError.code === 'auth/missing-email') {
      throw new Error('Email é obrigatório.');
    } else if (firebaseError.code === 'auth/unauthorized-domain') {
      throw new Error('Domínio não autorizado. Adicione este domínio no Firebase Console.');
    } else if (firebaseError.code === 'auth/invalid-api-key') {
      throw new Error('API Key inválida. Verifique a configuração do Firebase.');
    } else if (firebaseError.code === 'auth/network-request-failed') {
      throw new Error('Erro de rede. Verifique sua conexão com a internet.');
    } else if (firebaseError.code === 'auth/too-many-requests') {
      throw new Error('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
    } else if (firebaseError.message?.includes('400')) {
      throw new Error('Requisição inválida. Verifique se o email está correto e cadastrado no sistema.');
    }

    throw error;
  }
};

// Ensure Admin document exists for the current user (used when account is created via FirebaseUI)
export const ensureAdminDoc = async (user: User, name: string, phone?: string, username?: string) => {
  const adminData: Record<string, unknown> = {
    uid: user.uid,
    name: name,
    email: user.email || null,
    phone: phone ?? user.phoneNumber ?? null,
    createdAt: new Date(),
    role: 'admin',
    status: 'active',
    adminClaimSet: true
  };

  // Adicionar username se fornecido
  const desiredUsername = username ? normalizeUsername(username) : '';
  if (desiredUsername && USERNAME_REGEX.test(desiredUsername)) {
    adminData.username = desiredUsername;
  } else {
    // Fallback: inferir username a partir do e-mail (ex.: pedro@... -> pedro)
    const inferred = usernameFromEmail(user.email);
    if (inferred && USERNAME_REGEX.test(inferred)) {
      try {
        const validation = await validateUsername(inferred);
        if (validation.valid) {
          adminData.username = inferred;
        }
      } catch {
        // Não bloquear o fluxo se a validação falhar
      }
    }
  }

  // Não inferir isMainAdmin no client (regras podem impedir listagem e causar false positives).
  // Apenas marcar automaticamente como MainAdmin quando for explicitamente o SuperAdmin.
  if (adminData.username && isSuperAdminUsername(String(adminData.username))) {
    adminData.isMainAdmin = true;
  }

  await setDoc(doc(db, "admins", user.uid), adminData, { merge: true });

  // Criar ProfileSettings individual com dados do modal (sem usar perfil global)
  const profileSettingsRef = doc(db, 'admins', user.uid, 'profile', 'settings');
  await setDoc(profileSettingsRef, {
    name: name || '',
    email: user.email || '',
    phone: phone ?? user.phoneNumber ?? '',
    username: adminData.username || '',
    address: '',
    description: '',
    profilePictureUrl: '/placeholder-photo.svg',
    coverPhotoUrl: '/placeholder-cover.svg',
    galleryPhotos: [],
    galleryNames: [
      'ACOMPANHANTE MASCULINO',
      'SENSUALIDADE',
      'PRAZER',
      'BDSM',
      'FETISH',
      'FANTASIA',
      'IS'
    ],
    adultWorkLabel: '+18 ADULT WORK',
    socialMedia: {
      instagram: '',
      twitter: '',
      youtube: '',
      whatsapp: '',
      telegram: ''
    },
    reviewSettings: {
      showReviews: true,
      moderateReviews: true,
      defaultReviewMessage: '',
      sendReviewToSecretChat: false
    },
    paymentSettings: {
      pixValue: 99.0,
      pixKey: '',
      pixKeyType: 'email'
    },
    footerSettings: {
      showTwitter: false,
      twitterUrl: '',
      showInstagram: false,
      instagramUrl: '',
      showYoutube: false,
      youtubeUrl: '',
      showWhatsapp: false,
      whatsappUrl: '',
      showTelegram: false,
      telegramUrl: '',
      showFacebook: false,
      facebookUrl: ''
    },
    appearanceSettings: {
      textColor: '#ffffff',
      numberColor: '#ffffff',
      buttonColor: '#ffffff',
      buttonTextColor: '#000000',
      lineColor: '#4b5563',
      neonGlowColor: '#ffffff',
      containerColor: '#111111',
      backgroundColor: '#000000',
      fontFamily: '"Times New Roman", Times, serif',
      fontSizePx: 16,
      iconColor: '#ffffff',
      userSidebarIconColor: '#ffffff',
      adminSidebarIconColor: '#ffffff',
      secretChatColor: '#ffffff',
      whatsappBubbleColor: '#000000'
    }
  }, { merge: true });
};

// Validar se username está disponível
export const validateUsername = async (username: string): Promise<{ valid: boolean; message: string }> => {
  const cleanUsername = normalizeUsername(username);

  // Validar formato
  const usernameRegex = /^[a-z0-9-_]{3,20}$/;
  if (!usernameRegex.test(cleanUsername)) {
    return {
      valid: false,
      message: 'Username deve ter 3-20 caracteres (apenas letras minúsculas, números, - e _)'
    };
  }

  // Lista de usernames reservados
  const reservedUsernames = [
    'admin', 'api', 'auth', 'dashboard', 'login', 'register',
    'logout', 'perfil', 'assinante', 'galeria', 'fotos', 'videos',
    'chat', 'loja', 'stripe', 'paypal', 'pix', 'app', 'www', 'superadmin'
  ];

  if (reservedUsernames.includes(cleanUsername)) {
    return {
      valid: false,
      message: 'Este username está reservado pelo sistema'
    };
  }

  // Verificar se já existe
  const adminsRef = collection(db, "admins");
  const q = query(adminsRef, where("username", "==", cleanUsername));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    return {
      valid: false,
      message: 'Este username já está em uso'
    };
  }

  return { valid: true, message: 'Username disponível' };
};

// Buscar admin por username
export const getAdminByUsername = async (username: string) => {
  const cleanUsername = normalizeUsername(username);

  const adminsRef = collection(db, "admins");
  const q = query(adminsRef, where("username", "==", cleanUsername), limit(1));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {

    // Fallback 1: mapear username a partir do local-part do e-mail (pedro@... => pedro)
    // Fallback 2: slug do nome ("Pedro Silva" => pedro-silva) — só retorna se for único.
    const allAdminsSnapshot = await getDocs(adminsRef);

    let nameMatch: AdminData | null = null;
    let nameMatchCount = 0;

    for (const adminDoc of allAdminsSnapshot.docs) {
      const adminData = adminDoc.data() as AdminData;

      const emailCandidate = usernameFromEmail(adminData.email);
      if (emailCandidate && emailCandidate === cleanUsername) {
        return adminData;
      }

      const nameCandidate = slugifyToUsername(adminData.name || '');
      if (nameCandidate && nameCandidate === cleanUsername) {
        nameMatch = adminData;
        nameMatchCount += 1;
      }
    }

    if (nameMatch && nameMatchCount === 1) {
      return nameMatch;
    }

    return null;
  }

  const adminData = querySnapshot.docs[0].data();
  return adminData;
};
