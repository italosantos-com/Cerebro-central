/**
 * Hook useAdminStorage
 * Gerencia uploads e downloads de arquivos do admin
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import {
  AdminStorageManager,
  StorageFolder,
  generateUniqueFilename,
  getAdminFilePath,
} from '@/lib/admin-storage';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export function useAdminStorage() {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return {
      isUploading: false,
      uploadProgress: null,
      error: 'Usuário não autenticado',
      uploadPhoto: async () => { throw new Error('Não autenticado'); },
      uploadVideo: async () => { throw new Error('Não autenticado'); },
      uploadFile: async () => { throw new Error('Não autenticado'); },
      getDownloadURL: async () => { throw new Error('Não autenticado'); },
      listFiles: async () => [],
      deleteFile: async () => { throw new Error('Não autenticado'); },
      manager: null,
    };
  }

  const manager = new AdminStorageManager(user.uid);

  /**
   * Upload de foto
   */
  const uploadPhoto = async (
    file: File,
    customFilename?: string
  ): Promise<string> => {
    setIsUploading(true);
    setError(null);

    try {
      const filename = customFilename || generateUniqueFilename(file.name);

      console.log(`[useAdminStorage] Fazendo upload de foto: ${filename}`);

      await manager.uploadPhoto(filename, file, {
        originalName: file.name,
        size: file.size.toString(),
      });

      const downloadURL = await getDownloadURLForFile('photos', filename);

      console.log(`[useAdminStorage] ✅ Foto enviada com sucesso`);

      return downloadURL;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer upload de foto';
      setError(errorMessage);
      console.error(`[useAdminStorage] ❌ Erro ao fazer upload de foto:`, err);
      throw err;
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  /**
   * Upload de vídeo
   */
  const uploadVideo = async (
    file: File,
    customFilename?: string
  ): Promise<string> => {
    setIsUploading(true);
    setError(null);

    try {
      const filename = customFilename || generateUniqueFilename(file.name);

      console.log(`[useAdminStorage] Fazendo upload de vídeo: ${filename}`);

      await manager.uploadVideo(filename, file, {
        originalName: file.name,
        size: file.size.toString(),
      });

      const downloadURL = await getDownloadURLForFile('videos', filename);

      console.log(`[useAdminStorage] ✅ Vídeo enviado com sucesso`);

      return downloadURL;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer upload de vídeo';
      setError(errorMessage);
      console.error(`[useAdminStorage] ❌ Erro ao fazer upload de vídeo:`, err);
      throw err;
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  /**
   * Upload genérico
   */
  const uploadFile = async (
    file: File,
    folder: StorageFolder = 'uploads',
    customFilename?: string
  ): Promise<string> => {
    setIsUploading(true);
    setError(null);

    try {
      const filename = customFilename || generateUniqueFilename(file.name);

      console.log(`[useAdminStorage] Fazendo upload de arquivo para ${folder}: ${filename}`);

      await manager.uploadFile(filename, file, file.type, {
        originalName: file.name,
        size: file.size.toString(),
      });

      const downloadURL = await getDownloadURLForFile(folder, filename);

      console.log(`[useAdminStorage] ✅ Arquivo enviado com sucesso`);

      return downloadURL;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer upload';
      setError(errorMessage);
      console.error(`[useAdminStorage] ❌ Erro ao fazer upload:`, err);
      throw err;
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  /**
   * Obtém URL de download de um arquivo
   */
  const getDownloadURLForFile = async (
    folder: StorageFolder,
    filename: string
  ): Promise<string> => {
    try {
      const filePath = getAdminFilePath(user.uid, folder, filename);
      const fileRef = ref(storage, filePath);
      const url = await getDownloadURL(fileRef);
      return url;
    } catch (err) {
      console.error(`[useAdminStorage] Erro ao obter URL de download:`, err);
      throw err;
    }
  };

  /**
   * Lista arquivos de uma pasta
   */
  const listFiles = async (folder: StorageFolder) => {
    try {
      const result = await manager.listPhotos();
      return result.items.map(item => ({
        name: item.name,
        fullPath: item.fullPath,
      }));
    } catch (err) {
      console.error(`[useAdminStorage] Erro ao listar arquivos:`, err);
      throw err;
    }
  };

  /**
   * Deleta um arquivo
   */
  const deleteFile = async (folder: StorageFolder, filename: string) => {
    setError(null);

    try {
      console.log(`[useAdminStorage] Deletando arquivo: ${filename}`);

      if (folder === 'photos') {
        await manager.deletePhoto(filename);
      } else if (folder === 'videos') {
        await manager.deleteVideo(filename);
      } else {
        await manager.deleteFile(filename);
      }

      console.log(`[useAdminStorage] ✅ Arquivo deletado com sucesso`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao deletar arquivo';
      setError(errorMessage);
      console.error(`[useAdminStorage] ❌ Erro ao deletar arquivo:`, err);
      throw err;
    }
  };

  return {
    isUploading,
    uploadProgress,
    error,
    uploadPhoto,
    uploadVideo,
    uploadFile,
    getDownloadURL: getDownloadURLForFile,
    listFiles,
    deleteFile,
    manager,
  };
}
