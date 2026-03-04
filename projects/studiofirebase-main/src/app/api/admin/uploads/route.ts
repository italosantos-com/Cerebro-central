import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminStorage, getAdminBucket } from '@/lib/firebase-admin';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';

// Force dynamic rendering for API routes that access database
export const dynamic = 'force-dynamic';

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  fullPath?: string;
  size?: number;
  createdAt: string;
  type: string;
  visibility?: 'public' | 'subscribers';
  isSubscriberOnly?: boolean;
  metadata?: {
    visibility?: 'public' | 'subscribers';
    customMetadata?: Record<string, string>;
  };
  source: 'firestore' | 'storage';
  collection?: string;
  title?: string;
  description?: string;
  storageType?: string;
}

// Função para normalizar datas do Firestore
function normalizeFirestoreData(data: any): any {
  const normalized = { ...data };
  
  // Converter Timestamps do Firestore para ISO strings
  if (data.createdAt) {
    if (data.createdAt.toDate) {
      normalized.createdAt = data.createdAt.toDate().toISOString();
    } else if (data.createdAt instanceof Date) {
      normalized.createdAt = data.createdAt.toISOString();
    } else if (typeof data.createdAt === 'string') {
      normalized.createdAt = data.createdAt;
    } else {
      normalized.createdAt = new Date().toISOString();
    }
  }
  
  if (data.updatedAt) {
    if (data.updatedAt.toDate) {
      normalized.updatedAt = data.updatedAt.toDate().toISOString();
    } else if (data.updatedAt instanceof Date) {
      normalized.updatedAt = data.updatedAt.toISOString();
    } else if (typeof data.updatedAt === 'string') {
      normalized.updatedAt = data.updatedAt;
    } else {
      normalized.updatedAt = new Date().toISOString();
    }
  }
  
  return normalized;
}

// GET - Listar todos os arquivos (Firestore + Storage)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminApiAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const allFiles: UploadedFile[] = [];
    const adminDb = getAdminDb();
    const adminStorage = getAdminStorage();

    if (!adminDb || !adminStorage) {
      console.error('[Admin] Firebase Admin não inicializado');
      return NextResponse.json({
        error: 'Firebase Admin não inicializado'
      }, { status: 500 });
    }

    // 1. Buscar conteúdo exclusivo
    try {
      const exclusiveQuery = adminDb.collection('exclusiveContent').orderBy('createdAt', 'desc');
      const exclusiveSnapshot = await exclusiveQuery.get();
      const exclusiveFiles: UploadedFile[] = exclusiveSnapshot.docs.map((doc: any) => {
        const data = normalizeFirestoreData(doc.data());
        return {
          id: doc.id,
          name: data.title || 'Sem título',
          url: data.url || '',
          size: data.size || 0,
          createdAt: data.createdAt || new Date().toISOString(),
          type: data.type === 'photo' ? 'image/jpeg' : 'video/mp4',
          visibility: (data.isActive ? 'public' : 'subscribers') as UploadedFile['visibility'],
          source: 'firestore' as const,
          collection: 'exclusiveContent',
          title: data.title,
          description: data.description,
          storageType: data.storageType || 'unknown'
        };
      });
      allFiles.push(...exclusiveFiles);
    } catch (error) {
      console.error('[Admin Uploads] Erro ao buscar conteúdo exclusivo:', error);
    }

    // 2. Buscar fotos
    try {
      const photosQuery = adminDb.collection('photos').orderBy('createdAt', 'desc');
      const photosSnapshot = await photosQuery.get();
      const photosFiles = photosSnapshot.docs.map((doc: any) => {
        const data = normalizeFirestoreData(doc.data());
        return {
          id: doc.id,
          name: data.title || 'Foto sem título',
          url: data.imageUrl || data.url || '',
          size: data.size || 0,
          createdAt: data.createdAt || new Date().toISOString(),
          type: 'image/jpeg',
          visibility: (data.visibility || 'public') as 'public' | 'subscribers',
          source: 'firestore' as const,
          collection: 'photos',
          title: data.title,
          storageType: data.storageType || 'unknown'
        };
      });
      allFiles.push(...photosFiles);
    } catch (error) {
      console.error('[Admin Uploads] Erro ao buscar fotos:', error);
    }

    // 3. Buscar vídeos
    try {
      const videosQuery = adminDb.collection('videos').orderBy('createdAt', 'desc');
      const videosSnapshot = await videosQuery.get();
      const videosFiles = videosSnapshot.docs.map((doc: any) => {
        const data = normalizeFirestoreData(doc.data());
        return {
          id: doc.id,
          name: data.title || 'Vídeo sem título',
          url: data.videoUrl || data.url || '',
          size: data.size || 0,
          createdAt: data.createdAt || new Date().toISOString(),
          type: 'video/mp4',
          visibility: (data.visibility || 'public') as 'public' | 'subscribers',
          source: 'firestore' as const,
          collection: 'videos',
          title: data.title,
          description: data.description,
          storageType: data.storageType || 'unknown'
        };
      });
      allFiles.push(...videosFiles);
    } catch (error) {
      console.error('[Admin Uploads] Erro ao buscar vídeos:', error);
    }

    // 4. Buscar produtos
    try {
      const productsQuery = adminDb.collection('products').orderBy('createdAt', 'desc');
      const productsSnapshot = await productsQuery.get();
      const productsFiles: UploadedFile[] = productsSnapshot.docs.map((doc: any) => {
        const data = normalizeFirestoreData(doc.data());
        return {
          id: doc.id,
          name: data.name || 'Produto sem título',
          url: data.imageUrl || data.url || '',
          size: data.size || 0,
          createdAt: data.createdAt || new Date().toISOString(),
          type: data.type === 'video' ? 'video/mp4' : 'image/jpeg',
          visibility: (data.status === 'active' ? 'public' : 'subscribers') as UploadedFile['visibility'],
          source: 'firestore' as const,
          collection: 'products',
          title: data.name,
          description: data.description,
          storageType: data.storageType || 'unknown'
        };
      });
      allFiles.push(...productsFiles);
    } catch (error) {
      console.error('[Admin Uploads] Erro ao buscar produtos:', error);
    }

    // 5. Buscar arquivos do Firebase Storage (opcional - pode ser lento)
    try {
      const bucket = getAdminBucket();
      if (!bucket) throw new Error('Bucket do Firebase Storage indisponível');
      const [files] = await bucket.getFiles({ prefix: 'italosantos.com/general-uploads/' });
      
      const storageFiles = await Promise.all(
        files.map(async (file: any) => {
          const [metadata] = await file.getMetadata();
          const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 1000 * 60 * 60 * 24 // 24 horas
          });
          
          return {
            id: file.name,
            name: file.name.split('/').pop() || 'Arquivo sem nome',
            url,
            fullPath: file.name,
            size: Number.parseInt(metadata.size, 10) || 0,
            createdAt: metadata.timeCreated,
            type: metadata.contentType || 'unknown',
            visibility: (metadata.metadata?.visibility as 'public' | 'subscribers') || 'public',
            isSubscriberOnly: metadata.metadata?.isSubscriberOnly === 'true',
            metadata: {
              visibility: (metadata.metadata?.visibility as 'public' | 'subscribers') || 'public',
              customMetadata: metadata.metadata
            },
            source: 'storage' as const,
            storageType: 'firebase-storage'
          };
        })
      );
      allFiles.push(...storageFiles);
    } catch (error) {
      console.error('[Admin Uploads] Erro ao buscar arquivos do Storage:', error);
    }

    // Ordenar por data de criação (mais recente primeiro)
    allFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      files: allFiles
    });

  } catch (error) {
    console.error('[Admin Uploads] Erro ao buscar arquivos:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar arquivos',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
