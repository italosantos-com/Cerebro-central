/**
 * Admin Storage Manager
 * Gerencia a estrutura de pastas do Firebase Storage para cada admin
 * 
 * Estrutura:
 * admins/{adminUid}/
 *   ├── photos/           - Fotos do perfil e galeria
 *   ├── videos/           - Vídeos publicados
 *   ├── uploads/          - Uploads gerais e temporários
 *   ├── cache/            - Cache de conteúdo
 *   └── config/           - Configurações e metadados
 */

import { ref, uploadBytes, getBytes, deleteObject, listAll } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export const ADMIN_STORAGE_STRUCTURE = {
  photos: 'photos',           // Fotos do perfil, capa, galeria
  videos: 'videos',           // Vídeos publicados
  uploads: 'uploads',         // Uploads gerais e temporários
  cache: 'cache',             // Cache de dados (Twitter, Instagram, etc)
  config: 'config',           // Configurações e metadados do admin
} as const;

export type StorageFolder = keyof typeof ADMIN_STORAGE_STRUCTURE;

/**
 * Gera o caminho base para um admin no Storage
 * @param adminUid - ID do admin
 * @returns Caminho base: admins/{adminUid}
 */
export function getAdminBasePath(adminUid: string): string {
  return `admins/${adminUid}`;
}

/**
 * Gera o caminho completo para uma pasta específica do admin
 * @param adminUid - ID do admin
 * @param folder - Tipo de pasta
 * @returns Caminho: admins/{adminUid}/{folder}
 */
export function getAdminFolderPath(adminUid: string, folder: StorageFolder): string {
  return `${getAdminBasePath(adminUid)}/${ADMIN_STORAGE_STRUCTURE[folder]}`;
}

/**
 * Gera o caminho completo para um arquivo do admin
 * @param adminUid - ID do admin
 * @param folder - Tipo de pasta
 * @param filename - Nome do arquivo
 * @returns Caminho: admins/{adminUid}/{folder}/{filename}
 */
export function getAdminFilePath(
  adminUid: string,
  folder: StorageFolder,
  filename: string
): string {
  return `${getAdminFolderPath(adminUid, folder)}/${filename}`;
}

/**
 * Faz upload de um arquivo para a pasta do admin
 * @param adminUid - ID do admin
 * @param folder - Tipo de pasta
 * @param filename - Nome do arquivo
 * @param file - Arquivo (Blob, File ou ArrayBuffer)
 * @param metadata - Metadados opcionais
 * @returns Promise com referência do arquivo
 */
export async function uploadToAdminStorage(
  adminUid: string,
  folder: StorageFolder,
  filename: string,
  file: Blob | File | ArrayBuffer,
  metadata?: { contentType?: string; customMetadata?: Record<string, string> }
) {
  try {
    const filePath = getAdminFilePath(adminUid, folder, filename);
    const fileRef = ref(storage, filePath);

    console.log(`[Admin Storage] Fazendo upload para: ${filePath}`);

    const result = await uploadBytes(fileRef, file, {
      contentType: metadata?.contentType,
      customMetadata: {
        adminUid,
        folder,
        uploadedAt: new Date().toISOString(),
        ...metadata?.customMetadata,
      },
    });

    console.log(`[Admin Storage] ✅ Upload bem-sucedido: ${filePath}`);
    return result;
  } catch (error) {
    console.error(`[Admin Storage] ❌ Erro ao fazer upload:`, error);
    throw error;
  }
}

/**
 * Download de um arquivo do admin
 * @param adminUid - ID do admin
 * @param folder - Tipo de pasta
 * @param filename - Nome do arquivo
 * @returns Promise com conteúdo do arquivo (Uint8Array)
 */
export async function downloadFromAdminStorage(
  adminUid: string,
  folder: StorageFolder,
  filename: string
): Promise<Uint8Array | ArrayBuffer> {
  try {
    const filePath = getAdminFilePath(adminUid, folder, filename);
    const fileRef = ref(storage, filePath);

    console.log(`[Admin Storage] Fazendo download de: ${filePath}`);

    const bytes = await getBytes(fileRef);

    console.log(`[Admin Storage] ✅ Download bem-sucedido: ${filePath}`);
    return bytes;
  } catch (error) {
    console.error(`[Admin Storage] ❌ Erro ao fazer download:`, error);
    throw error;
  }
}

/**
 * Deleta um arquivo do admin
 * @param adminUid - ID do admin
 * @param folder - Tipo de pasta
 * @param filename - Nome do arquivo
 * @returns Promise<void>
 */
export async function deleteFromAdminStorage(
  adminUid: string,
  folder: StorageFolder,
  filename: string
): Promise<void> {
  try {
    const filePath = getAdminFilePath(adminUid, folder, filename);
    const fileRef = ref(storage, filePath);

    console.log(`[Admin Storage] Deletando: ${filePath}`);

    await deleteObject(fileRef);

    console.log(`[Admin Storage] ✅ Arquivo deletado: ${filePath}`);
  } catch (error) {
    console.error(`[Admin Storage] ❌ Erro ao deletar:`, error);
    throw error;
  }
}

/**
 * Lista todos os arquivos em uma pasta do admin
 * @param adminUid - ID do admin
 * @param folder - Tipo de pasta
 * @returns Promise com lista de arquivos
 */
export async function listAdminStorageFiles(
  adminUid: string,
  folder: StorageFolder
) {
  try {
    const folderPath = getAdminFolderPath(adminUid, folder);
    const folderRef = ref(storage, folderPath);

    console.log(`[Admin Storage] Listando arquivos de: ${folderPath}`);

    const result = await listAll(folderRef);

    console.log(`[Admin Storage] ✅ ${result.items.length} arquivo(s) encontrado(s)`);
    return result;
  } catch (error) {
    console.error(`[Admin Storage] ❌ Erro ao listar:`, error);
    throw error;
  }
}

/**
 * Deleta uma pasta inteira do admin (recursivamente)
 * @param adminUid - ID do admin
 * @param folder - Tipo de pasta
 * @returns Promise<void>
 */
export async function deleteAdminStorageFolder(
  adminUid: string,
  folder: StorageFolder
): Promise<void> {
  try {
    const folderPath = getAdminFolderPath(adminUid, folder);
    const folderRef = ref(storage, folderPath);

    console.log(`[Admin Storage] Deletando pasta: ${folderPath}`);

    const result = await listAll(folderRef);

    // Deletar todos os arquivos
    const deletePromises = result.items.map(item => deleteObject(item));
    await Promise.all(deletePromises);

    // Deletar subpastas (recursivamente)
    const deleteFolderPromises = result.prefixes.map(prefix =>
      deleteAdminStorageFolder(adminUid, folder)
    );
    await Promise.all(deleteFolderPromises);

    console.log(`[Admin Storage] ✅ Pasta deletada: ${folderPath}`);
  } catch (error) {
    console.error(`[Admin Storage] ❌ Erro ao deletar pasta:`, error);
    throw error;
  }
}

/**
 * Gera um nome de arquivo único com timestamp
 * @param originalFilename - Nome original do arquivo
 * @returns Nome único: {timestamp}_{originalFilename}
 */
export function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const ext = originalFilename.split('.').pop();
  const name = originalFilename.replace(`.${ext}`, '');
  return `${timestamp}_${name}.${ext}`;
}

/**
 * Gera um nome de arquivo para cache com expiração
 * @param key - Chave do cache
 * @param expirationHours - Horas até expiração (padrão: 24)
 * @returns Nome do arquivo: {key}_{timestamp}.cache
 */
export function generateCacheFilename(
  key: string,
  expirationHours: number = 24
): string {
  const timestamp = Date.now();
  const expiresAt = new Date(timestamp + expirationHours * 60 * 60 * 1000).toISOString();
  return `${key}_${timestamp}.cache`;
}

/**
 * Verifica se um arquivo de cache expirou (baseado no timestamp do nome)
 * @param cacheFilename - Nome do arquivo de cache
 * @param expirationHours - Horas até expiração (padrão: 24)
 * @returns boolean - true se expirou
 */
export function isCacheExpired(
  cacheFilename: string,
  expirationHours: number = 24
): boolean {
  try {
    const timestamp = parseInt(cacheFilename.split('_')[1]);
    const now = Date.now();
    const expirationMs = expirationHours * 60 * 60 * 1000;
    return now - timestamp > expirationMs;
  } catch {
    return true; // Considerar expirado se não conseguir parsear
  }
}

/**
 * Classe para gerenciar todo o armazenamento de um admin
 */
export class AdminStorageManager {
  constructor(private adminUid: string) {}

  /**
   * Upload de foto
   */
  async uploadPhoto(
    filename: string,
    file: Blob | File | ArrayBuffer,
    metadata?: Record<string, string>
  ) {
    return uploadToAdminStorage(this.adminUid, 'photos', filename, file, {
      contentType: 'image/*',
      customMetadata: metadata,
    });
  }

  /**
   * Upload de vídeo
   */
  async uploadVideo(
    filename: string,
    file: Blob | File | ArrayBuffer,
    metadata?: Record<string, string>
  ) {
    return uploadToAdminStorage(this.adminUid, 'videos', filename, file, {
      contentType: 'video/*',
      customMetadata: metadata,
    });
  }

  /**
   * Upload genérico
   */
  async uploadFile(
    filename: string,
    file: Blob | File | ArrayBuffer,
    contentType?: string,
    metadata?: Record<string, string>
  ) {
    return uploadToAdminStorage(this.adminUid, 'uploads', filename, file, {
      contentType,
      customMetadata: metadata,
    });
  }

  /**
   * Salvar cache
   */
  async saveCache(key: string, data: string) {
    const filename = generateCacheFilename(key);
    return uploadToAdminStorage(this.adminUid, 'cache', filename, new Blob([data], { type: 'application/json' }), {
      contentType: 'application/json',
      customMetadata: { cacheKey: key },
    });
  }

  /**
   * Carregar cache
   */
  async loadCache(key: string): Promise<string | null> {
    try {
      const files = await listAdminStorageFiles(this.adminUid, 'cache');
      const cacheFile = files.items.find(item => item.name.startsWith(key));

      if (!cacheFile || isCacheExpired(cacheFile.name)) {
        return null;
      }

      const data = await downloadFromAdminStorage(this.adminUid, 'cache', cacheFile.name);
      return new TextDecoder().decode(data);
    } catch {
      return null;
    }
  }

  /**
   * Listar fotos
   */
  async listPhotos() {
    return listAdminStorageFiles(this.adminUid, 'photos');
  }

  /**
   * Listar vídeos
   */
  async listVideos() {
    return listAdminStorageFiles(this.adminUid, 'videos');
  }

  /**
   * Listar uploads
   */
  async listUploads() {
    return listAdminStorageFiles(this.adminUid, 'uploads');
  }

  /**
   * Deletar foto
   */
  async deletePhoto(filename: string) {
    return deleteFromAdminStorage(this.adminUid, 'photos', filename);
  }

  /**
   * Deletar vídeo
   */
  async deleteVideo(filename: string) {
    return deleteFromAdminStorage(this.adminUid, 'videos', filename);
  }

  /**
   * Deletar arquivo
   */
  async deleteFile(filename: string) {
    return deleteFromAdminStorage(this.adminUid, 'uploads', filename);
  }

  /**
   * Limpar pasta inteira
   */
  async clearFolder(folder: StorageFolder) {
    return deleteAdminStorageFolder(this.adminUid, folder);
  }

  /**
   * Caminho base do admin
   */
  get basePath(): string {
    return getAdminBasePath(this.adminUid);
  }

  /**
   * Caminho de uma pasta
   */
  getFolder(folder: StorageFolder): string {
    return getAdminFolderPath(this.adminUid, folder);
  }
}
