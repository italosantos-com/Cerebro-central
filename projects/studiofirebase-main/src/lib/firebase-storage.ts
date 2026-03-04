import { storage } from '@/lib/firebase';
import { ref, listAll, getDownloadURL, getMetadata } from 'firebase/storage';

export interface FirebaseFile {
  name: string;
  fullPath: string;
  url: string;
  type: string;
  size: number;
  createdAt: string;
  metadata?: {
    visibility?: 'public' | 'subscribers';
    customMetadata?: Record<string, string>;
  };
}

export async function fetchFirebaseFiles(folderPath: string = 'general-uploads'): Promise<FirebaseFile[]> {
  try {
    const folderRef = ref(storage, folderPath);
    const result = await listAll(folderRef);
    
    const files: FirebaseFile[] = [];
    
    for (const itemRef of result.items) {
      try {
        const [url, metadata] = await Promise.all([
          getDownloadURL(itemRef),
          getMetadata(itemRef)
        ]);
        
        files.push({
          name: itemRef.name,
          fullPath: itemRef.fullPath,
          url,
          type: metadata.contentType || 'application/octet-stream',
          size: metadata.size,
          createdAt: metadata.timeCreated,
          metadata: {
            visibility: metadata.customMetadata?.visibility as 'public' | 'subscribers' || 'public',
            customMetadata: metadata.customMetadata
          }
        });
      } catch (error) {

      }
    }
    
    // Ordenar por data de criação (mais recente primeiro)
    return files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    
    return [];
  }
}

export function isImageFile(contentType: string): boolean {
  return contentType.startsWith('image/');
}

export function isVideoFile(contentType: string): boolean {
  return contentType.startsWith('video/');
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
