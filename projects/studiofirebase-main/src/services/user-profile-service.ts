import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, UserInfo } from 'firebase/auth';

export interface UserProfileData {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
    phoneNumber: string | null;
    provider: string;
    nickname?: string;
    createdAt?: Date;
    updatedAt: Date;
    metadata?: {
        provider: string;
        providerData?: UserInfo;
    };
}

/**
 * Extrai informações do perfil do usuário baseado no provedor OAuth
 */
export function extractProfileFromProvider(user: User): UserProfileData {
    const providerData = user.providerData[0];
    const providerId = providerData?.providerId || 'password';

    const email = user.email || '';

    let nickname: string;
    let photoURL: string;

    // Extrair dados específicos por provedor
    switch (providerId) {
        case 'google.com':
            // Google já fornece displayName e photoURL
            nickname = user.displayName || email.split('@')[0];
            photoURL = user.photoURL || '';
            break;

        case 'apple.com':
            // Apple fornece nome limitado na primeira autenticação
            nickname = user.displayName || 'Usuário Apple';
            // Apple não fornece foto, usar fallback
            photoURL = '';
            break;

        case 'facebook.com':
            // Facebook fornece nome e foto
            nickname = user.displayName || email.split('@')[0];
            photoURL = user.photoURL || '';
            // Melhorar qualidade da foto do Facebook
            if (photoURL && photoURL.includes('facebook')) {
                photoURL = photoURL.replace('?type=normal', '?type=large');
            }
            break;

        case 'twitter.com':
            // Twitter fornece nome de usuário (@handle) e foto
            nickname = user.displayName || email.split('@')[0];
            photoURL = user.photoURL || '';
            // Twitter oferece diferentes tamanhos de imagem
            if (photoURL && photoURL.includes('twitter')) {
                photoURL = photoURL.replace('_normal', '_400x400');
            }
            break;

        case 'instagram.com':
            // Instagram (se integrado via OAuth)
            nickname = user.displayName || email.split('@')[0];
            photoURL = user.photoURL || '';
            break;

        case 'paypal.com':
            // PayPal geralmente só fornece email
            nickname = user.displayName || email.split('@')[0];
            photoURL = '';
            break;

        case 'mercadopago.com':
            // Mercado Pago
            nickname = user.displayName || email.split('@')[0];
            photoURL = user.photoURL || '';
            break;

        default:
            nickname = user.displayName || email.split('@')[0] || 'Usuário';
            photoURL = user.photoURL || '';
    }

    return {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: photoURL || null,
        phoneNumber: user.phoneNumber,
        provider: providerId,
        nickname: nickname,
        updatedAt: new Date(),
        metadata: {
            provider: providerId,
            providerData: providerData
        }
    };
}

/**
 * Salva ou atualiza o perfil do usuário no Firestore
 */
export async function saveUserProfile(user: User): Promise<void> {
    try {
        const profileData = extractProfileFromProvider(user);
        const userRef = doc(db, 'users', user.uid);

        // Verificar se o usuário já existe
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            // Atualizar apenas campos que não estão vazios
            const updateData: Record<string, unknown> = {
                updatedAt: new Date(),
            };

            if (profileData.displayName) updateData.displayName = profileData.displayName;
            if (profileData.email) updateData.email = profileData.email;
            if (profileData.photoURL) updateData.photoURL = profileData.photoURL;
            if (profileData.phoneNumber) updateData.phoneNumber = profileData.phoneNumber;
            if (profileData.nickname) updateData.nickname = profileData.nickname;

            await updateDoc(userRef, updateData);
            console.log('[UserProfile] Perfil atualizado:', user.uid);
        } else {
            // Criar novo documento
            await setDoc(userRef, {
                ...profileData,
                createdAt: new Date()
            });
            console.log('[UserProfile] Novo perfil criado:', user.uid);
        }
    } catch (error) {
        console.error('[UserProfile] Erro ao salvar perfil:', error);
        throw error;
    }
}

/**
 * Busca o perfil completo do usuário
 */
export async function getUserProfile(uid: string): Promise<UserProfileData | null> {
    try {
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            return userDoc.data() as UserProfileData;
        }

        return null;
    } catch (error) {
        console.error('[UserProfile] Erro ao buscar perfil:', error);
        return null;
    }
}

/**
 * Atualiza foto do perfil
 */
export async function updateUserPhoto(uid: string, photoURL: string): Promise<void> {
    try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
            photoURL: photoURL,
            updatedAt: new Date()
        });
        console.log('[UserProfile] Foto atualizada:', uid);
    } catch (error) {
        console.error('[UserProfile] Erro ao atualizar foto:', error);
        throw error;
    }
}

/**
 * Atualiza nickname do usuário
 */
export async function updateUserNickname(uid: string, nickname: string): Promise<void> {
    try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
            nickname: nickname,
            updatedAt: new Date()
        });
        console.log('[UserProfile] Nickname atualizado:', uid);
    } catch (error) {
        console.error('[UserProfile] Erro ao atualizar nickname:', error);
        throw error;
    }
}
