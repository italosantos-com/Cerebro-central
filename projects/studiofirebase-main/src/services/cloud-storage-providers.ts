/**
 * Cloud Storage Providers Service
 * Gerencia uploads para diferentes provedores de armazenamento em nuvem
 * 
 * SuperAdmin: Firebase Storage (nativo)
 * Novos Admins: Google One, Google Drive, YouTube, Apple iCloud Drive
 */

import { isSuperAdminUsername } from '@/lib/superadmin-config';

// ========================================
// TIPOS E INTERFACES
// ========================================

export type StorageProvider = 
  | 'firebase-storage'      // SuperAdmin
  | 'google-drive'          // Admins - arquivos gerais
  | 'google-one'            // Admins - backup e arquivos grandes
  | 'youtube'               // Admins - vídeos
  | 'icloud-drive';         // Admins - galeria de fotos

export interface StorageProviderConfig {
  provider: StorageProvider;
  apiEndpoint?: string;
  credentials?: Record<string, string>;
}

export interface UploadResult {
  success: boolean;
  provider: StorageProvider;
  url: string;
  fileId?: string;
  error?: string;
}

export interface MediaFile {
  name: string;
  size: number;
  type: string;
  data: ArrayBuffer | Blob | File;
}

// ========================================
// FUNÇÕES PRINCIPAIS
// ========================================

/**
 * Determina o provider de armazenamento baseado no tipo de usuário e mídia
 */
export function getStorageProvider(
  username: string | null | undefined,
  mediaType: 'image' | 'video' | 'file'
): StorageProvider {
  // SuperAdmin sempre usa Firebase Storage
  if (isSuperAdminUsername(username)) {
    return 'firebase-storage';
  }

  // Novos admins usam serviços específicos baseados no tipo de mídia
  switch (mediaType) {
    case 'video':
      return 'youtube';
    case 'image':
      return 'icloud-drive';
    case 'file':
    default:
      return 'google-drive';
  }
}

/**
 * Faz upload de arquivo para o provider apropriado
 */
export async function uploadToProvider(
  file: MediaFile,
  provider: StorageProvider,
  config?: StorageProviderConfig
): Promise<UploadResult> {
  try {
    console.log(`[Cloud Storage] Iniciando upload para ${provider}...`);

    switch (provider) {
      case 'firebase-storage':
        return await uploadToFirebaseStorage(file);
      
      case 'google-drive':
        return await uploadToGoogleDrive(file, config);
      
      case 'google-one':
        return await uploadToGoogleOne(file, config);
      
      case 'youtube':
        return await uploadToYouTube(file, config);
      
      case 'icloud-drive':
        return await uploadToICloudDrive(file, config);
      
      default:
        throw new Error(`Provider não suportado: ${provider}`);
    }
  } catch (error) {
    console.error(`[Cloud Storage] Erro no upload para ${provider}:`, error);
    return {
      success: false,
      provider,
      url: '',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

// ========================================
// FIREBASE STORAGE (SUPERADMIN)
// ========================================

async function uploadToFirebaseStorage(file: MediaFile): Promise<UploadResult> {
  // Este método será chamado pela API route existente
  // Mantém a implementação atual do Firebase Storage
  return {
    success: true,
    provider: 'firebase-storage',
    url: '', // A URL será retornada pela API route
    fileId: ''
  };
}

// ========================================
// GOOGLE DRIVE
// ========================================

async function uploadToGoogleDrive(
  file: MediaFile,
  config?: StorageProviderConfig
): Promise<UploadResult> {
  try {
    const adminAuthHeader = config?.credentials?.adminAuthHeader;

    // Preparar dados para upload
    const formData = new FormData();
    formData.append('file', new Blob([file.data], { type: file.type }), file.name);
    formData.append('provider', 'google-drive');

    // Chamar API endpoint para Google Drive
    const response = await fetch('/api/storage/google-drive', {
      method: 'POST',
      body: formData,
      headers: adminAuthHeader ? {
        'Authorization': adminAuthHeader
      } : {}
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Falha no upload para Google Drive');
    }

    return {
      success: true,
      provider: 'google-drive',
      url: data.url,
      fileId: data.fileId
    };
  } catch (error) {
    throw new Error(`Google Drive upload falhou: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

// ========================================
// GOOGLE ONE
// ========================================

async function uploadToGoogleOne(
  file: MediaFile,
  config?: StorageProviderConfig
): Promise<UploadResult> {
  try {
    const adminAuthHeader = config?.credentials?.adminAuthHeader;

    // Google One usa a mesma API do Google Drive com maior quota
    const formData = new FormData();
    formData.append('file', new Blob([file.data], { type: file.type }), file.name);
    formData.append('provider', 'google-one');

    const response = await fetch('/api/storage/google-one', {
      method: 'POST',
      body: formData,
      headers: adminAuthHeader ? {
        'Authorization': adminAuthHeader
      } : {}
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Falha no upload para Google One');
    }

    return {
      success: true,
      provider: 'google-one',
      url: data.url,
      fileId: data.fileId
    };
  } catch (error) {
    throw new Error(`Google One upload falhou: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

// ========================================
// YOUTUBE
// ========================================

async function uploadToYouTube(
  file: MediaFile,
  config?: StorageProviderConfig
): Promise<UploadResult> {
  try {
    const adminAuthHeader = config?.credentials?.adminAuthHeader;

    // Validar que é um vídeo
    if (!file.type.startsWith('video/')) {
      throw new Error('YouTube aceita apenas arquivos de vídeo');
    }

    const formData = new FormData();
    formData.append('file', new Blob([file.data], { type: file.type }), file.name);
    formData.append('provider', 'youtube');
    formData.append('title', file.name);
    formData.append('privacy', 'unlisted'); // Não listado por padrão

    const response = await fetch('/api/storage/youtube', {
      method: 'POST',
      body: formData,
      headers: adminAuthHeader ? {
        'Authorization': adminAuthHeader
      } : {}
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Falha no upload para YouTube');
    }

    return {
      success: true,
      provider: 'youtube',
      url: data.url,
      fileId: data.videoId
    };
  } catch (error) {
    throw new Error(`YouTube upload falhou: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

// ========================================
// APPLE ICLOUD DRIVE
// ========================================

async function uploadToICloudDrive(
  file: MediaFile,
  config?: StorageProviderConfig
): Promise<UploadResult> {
  try {
    const adminAuthHeader = config?.credentials?.adminAuthHeader;

    // Validar que é uma imagem
    if (!file.type.startsWith('image/')) {
      throw new Error('iCloud Drive (fotos) aceita apenas arquivos de imagem');
    }

    const formData = new FormData();
    formData.append('file', new Blob([file.data], { type: file.type }), file.name);
    formData.append('provider', 'icloud-drive');

    const response = await fetch('/api/storage/icloud-drive', {
      method: 'POST',
      body: formData,
      headers: adminAuthHeader ? {
        'Authorization': adminAuthHeader
      } : {}
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Falha no upload para iCloud Drive');
    }

    return {
      success: true,
      provider: 'icloud-drive',
      url: data.url,
      fileId: data.fileId
    };
  } catch (error) {
    throw new Error(`iCloud Drive upload falhou: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

// ========================================
// FUNÇÕES UTILITÁRIAS
// ========================================

/**
 * Retorna o nome amigável do provider
 */
export function getProviderDisplayName(provider: StorageProvider): string {
  const names: Record<StorageProvider, string> = {
    'firebase-storage': 'Firebase Storage',
    'google-drive': 'Google Drive',
    'google-one': 'Google One',
    'youtube': 'YouTube',
    'icloud-drive': 'iCloud Drive'
  };
  return names[provider];
}

/**
 * Valida se o provider aceita o tipo de arquivo
 */
export function isFileTypeSupported(provider: StorageProvider, fileType: string): boolean {
  switch (provider) {
    case 'youtube':
      return fileType.startsWith('video/');
    case 'icloud-drive':
      return fileType.startsWith('image/');
    case 'firebase-storage':
    case 'google-drive':
    case 'google-one':
      return true; // Aceitam todos os tipos
    default:
      return false;
  }
}

/**
 * Retorna o limite de tamanho do provider (em bytes)
 */
export function getProviderSizeLimit(provider: StorageProvider): number {
  const limits: Record<StorageProvider, number> = {
    'firebase-storage': 5 * 1024 * 1024 * 1024, // 5GB
    'google-drive': 15 * 1024 * 1024 * 1024, // 15GB (gratuito)
    'google-one': 2 * 1024 * 1024 * 1024 * 1024, // 2TB (plano pago)
    'youtube': 256 * 1024 * 1024 * 1024, // 256GB ou 12h de vídeo
    'icloud-drive': 5 * 1024 * 1024 * 1024 // 5GB (gratuito)
  };
  return limits[provider];
}
