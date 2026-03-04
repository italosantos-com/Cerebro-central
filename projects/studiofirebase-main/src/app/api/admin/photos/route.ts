import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { detectContentType } from '@/utils/video-url-processor';
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

// GET - Listar todas as fotos
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminApiAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({
        success: false,
        message: 'Firestore Admin não configurado'
      }, { status: 500 });
    }
    const photosRef = adminDb.collection('photos').where('adminUid', '==', authResult.uid);
    const snapshot = await photosRef.orderBy('createdAt', 'desc').get();
    
    const photos = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...normalizeFirestoreData(data)
      };
    });
    
    return NextResponse.json({
      success: true,
      photos
    });
    
  } catch (error) {
    console.error('[Admin Photos] Erro ao buscar fotos:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar fotos',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// POST - Criar nova foto
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminApiAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { title, imageUrl, storagePath = 'external' } = body;
    
    // Validação
    if (!title || !imageUrl) {
      return NextResponse.json({
        success: false,
        message: 'Título e URL da imagem são obrigatórios'
      }, { status: 400 });
    }

    // Validar se não é uma URL de vídeo
    const detectedType = detectContentType(imageUrl);
    if (detectedType === 'video') {
      return NextResponse.json({
        success: false,
        message: 'URLs de vídeo não são permitidas na galeria de fotos. Use a seção de Conteúdo Exclusivo para vídeos.'
      }, { status: 400 });
    }
    
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({
        success: false,
        message: 'Firestore Admin não configurado'
      }, { status: 500 });
    }
    const photoData = {
      title: title.trim(),
      imageUrl: imageUrl.trim(),
      storagePath,
      adminUid: authResult.uid,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await adminDb.collection('photos').add(photoData);
    
    return NextResponse.json({
      success: true,
      message: 'Foto criada com sucesso',
      photoId: docRef.id
    });
    
  } catch (error) {
    console.error('[Admin Photos] Erro ao criar foto:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao criar foto',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
