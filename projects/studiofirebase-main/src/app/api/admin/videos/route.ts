import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminStorage } from '@/lib/firebase-admin';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';

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



// GET - Listar vídeos do admin autenticado
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminApiAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const adminDb = getAdminDb();
    
    if (!adminDb) {
      console.error('[Admin] Firebase Admin não inicializado');
      return NextResponse.json({
        error: 'Firebase Admin não inicializado'
      }, { status: 500 });
    }
    
    const videosRef = adminDb.collection('videos').where('adminUid', '==', authResult.uid);
    const snapshot = await videosRef.orderBy('createdAt', 'desc').get();
    
    const videos = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      const normalizedData = normalizeFirestoreData(data);
      console.log('[Admin Videos] Vídeo:', doc.id, 'Thumbnail:', normalizedData.thumbnailUrl);
      return {
        id: doc.id,
        ...normalizedData
      };
    });
    
    return NextResponse.json({
      success: true,
      videos
    });
    
  } catch (error) {
    console.error('[Admin Videos] Erro ao buscar vídeos:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar vídeos',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// POST - Criar novo vídeo
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminApiAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { title, description, videoUrl, thumbnailUrl, storageType = 'external' } = body;
    
    // Validação
    if (!title || !videoUrl) {
      return NextResponse.json({
        success: false,
        message: 'Título e URL do vídeo são obrigatórios'
      }, { status: 400 });
    }
    
    // Não gerar thumbnail automático - deixar vazio para usar thumbnail nativa
    const finalThumbnailUrl = thumbnailUrl || '';
    
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      console.error('[Admin] Firebase Admin não inicializado');
      return NextResponse.json({
        error: 'Firebase Admin não inicializado'
      }, { status: 500 });
    }
    
    const videoData = {
      title: title.trim(),
      description: description?.trim() || '',
      videoUrl: videoUrl.trim(),
      thumbnailUrl: finalThumbnailUrl,
      storageType,
      adminUid: authResult.uid,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await adminDb.collection('videos').add(videoData);
    
    return NextResponse.json({
      success: true,
      message: 'Vídeo criado com sucesso',
      videoId: docRef.id,
      thumbnailUrl: finalThumbnailUrl
    });
    
  } catch (error) {
    console.error('[Admin Videos] Erro ao criar vídeo:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao criar vídeo',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
