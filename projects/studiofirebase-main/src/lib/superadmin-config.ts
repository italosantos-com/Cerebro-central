/**
 * SuperAdmin Configuration Service
 * 
 * =========================================================
 * ⚠️ IMPORTANTE: ESTRUTURA DE DADOS DO SUPERADMIN
 * =========================================================
 * 
 * SUPERADMIN EMAIL: pix@italosantos.com
 * SUPERADMIN USERNAME: severepics
 * 
 * ROTAS DE ACESSO:
 * - SuperAdmin (severepics): italosantos.com/admin/... (rota direta)
 * - Outros admins: italosantos.com/{username}/admin/... (rota com slug)
 * 
 * O SuperAdmin é o administrador PRINCIPAL do sistema e gerencia:
 * - Documento GLOBAL: admin/profileSettings
 * - Configurações padrão do sistema
 * - Homepage principal (italosantos.com/)
 * 
 * REGRAS DE ACESSO (Firestore):
 * - Leitura: PÚBLICA (para páginas públicas)
 * - Escrita: APENAS SuperAdmin (isSuperAdmin: true)
 * 
 * Os outros admins usam: admins/{adminUid}/profile/settings
 * Com FALLBACK para admin/profileSettings se perfil não existir
 * =========================================================
 */

import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Constantes do SuperAdmin (usado para referência)
export const SUPERADMIN_EMAIL = 'pix@italosantos.com';
export const SUPERADMIN_USERNAME = 'severepics';

// Path do documento global gerenciado pelo SuperAdmin
export const SUPERADMIN_PROFILE_PATH = 'admin/profileSettings';

// Função para verificar se um username é do SuperAdmin
export function isSuperAdminUsername(username: string | null | undefined): boolean {
  if (!username) return false;
  return username.toLowerCase().trim() === SUPERADMIN_USERNAME;
}

// Função para verificar se um email é do SuperAdmin
export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === SUPERADMIN_EMAIL;
}

export function isSuperAdminUser(input: { username?: string | null; email?: string | null } = {}): boolean {
  return isSuperAdminUsername(input.username) || isSuperAdminEmail(input.email);
}

export interface SuperAdminConfig {
  // Informações básicas
  name: string;
  email: string;
  phone?: string;
  username?: string;

  // Perfil público
  profilePictureUrl?: string;
  coverPhotoUrl?: string;
  description?: string;

  // Redes sociais
  socialMedia?: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    whatsapp?: string;
    telegram?: string;
    linkedin?: string;
  };

  // Configurações de pagamento
  paymentSettings?: {
    pixKey?: string;
    pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
    stripeAccountId?: string;
    paypalEmail?: string;
    mercadopagoAccountId?: string;
  };

  // Configurações de avaliações
  reviewSettings?: {
    acceptReviews: boolean;
    autoApproveReviews: boolean;
    maxReviewsPerUser: number;
  };

  // Configurações do rodapé
  footerSettings?: {
    showAbout: boolean;
    aboutText?: string;
    showContact: boolean;
    showLinks: boolean;
    links?: Array<{ label: string; url: string }>;
  };

  // Galeria de fotos
  galleryPhotos?: Array<{
    url: string;
    title?: string;
    order?: number;
  }>;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Carrega configuração do SuperAdmin
 * ⚠️ Sempre carrega de: admin/profileSettings (sem UID)
 */
export async function getSuperAdminConfig(): Promise<SuperAdminConfig | null> {
  try {
    const docRef = doc(db, 'admin', 'profileSettings');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log('[SuperAdmin] ✅ Config carregada de admin/profileSettings');
      return docSnap.data() as SuperAdminConfig;
    }

    console.log('[SuperAdmin] ⚠️ Config não encontrada em admin/profileSettings');
    return null;
  } catch (error) {
    console.error('[SuperAdmin] ❌ Erro ao carregar config:', error);
    throw error;
  }
}

/**
 * Atualiza configuração do SuperAdmin
 * ⚠️ Sempre salva em: admin/profileSettings (sem UID)
 */
export async function updateSuperAdminConfig(
  updates: Partial<SuperAdminConfig>
): Promise<void> {
  try {
    const docRef = doc(db, 'admin', 'profileSettings');

    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      await updateDoc(docRef, updateData);
      console.log('[SuperAdmin] ✅ Config atualizada em admin/profileSettings');
    } else {
      await setDoc(docRef, {
        ...updateData,
        createdAt: new Date().toISOString(),
      });
      console.log('[SuperAdmin] ✅ Config criada em admin/profileSettings');
    }
  } catch (error) {
    console.error('[SuperAdmin] ❌ Erro ao atualizar config:', error);
    throw error;
  }
}

/**
 * Verifica se SuperAdmin config existe
 */
export async function superAdminConfigExists(): Promise<boolean> {
  try {
    const docRef = doc(db, 'admin', 'profileSettings');
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    console.error('[SuperAdmin] ❌ Erro ao verificar existência:', error);
    return false;
  }
}

/**
 * Inicializa SuperAdmin config com dados padrão
 */
export async function initializeSuperAdminConfig(
  defaults?: Partial<SuperAdminConfig>
): Promise<void> {
  try {
    const exists = await superAdminConfigExists();

    if (exists) {
      console.log('[SuperAdmin] ℹ️ Config já existe, pulando inicialização');
      return;
    }

    console.log('[SuperAdmin] 🚀 Inicializando config padrão');

    const defaultConfig: SuperAdminConfig = {
      name: 'Italo Santos',
      email: 'italo@italosantos.com',
      username: 'italosantos',
      description: '',
      profilePictureUrl: '',
      coverPhotoUrl: '',
      socialMedia: {},
      paymentSettings: {},
      reviewSettings: {
        acceptReviews: true,
        autoApproveReviews: false,
        maxReviewsPerUser: 1,
      },
      footerSettings: {
        showAbout: true,
        showContact: true,
        showLinks: true,
      },
      galleryPhotos: [],
      ...defaults,
    };

    await updateSuperAdminConfig(defaultConfig);

    console.log('[SuperAdmin] ✅ Config inicializada com sucesso');
  } catch (error) {
    console.error('[SuperAdmin] ❌ Erro ao inicializar config:', error);
    throw error;
  }
}
