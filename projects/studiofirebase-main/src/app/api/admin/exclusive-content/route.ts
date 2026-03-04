import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminStorage, getAdminBucket } from '@/lib/firebase-admin';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';

export const runtime = 'nodejs';

// Função para criar conteúdo de exemplo
async function createSampleContent() {
  const sampleContent = [
    {
      title: 'Foto Exclusiva 1',
      description: 'Uma foto incrível exclusiva para assinantes',
      type: 'photo',
      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
      thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
      tags: ['natureza', 'paisagem', 'exclusivo'],
      viewCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: 'Foto Exclusiva 2',
      description: 'Outra foto espetacular para nossos assinantes',
      type: 'photo',
      url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
      thumbnailUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop',
      tags: ['floresta', 'verde', 'exclusivo'],
      viewCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: 'Vídeo Exclusivo 1',
      description: 'Um vídeo incrível exclusivo para assinantes',
      type: 'video',
      url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
      tags: ['vídeo', 'exclusivo', 'premium'],
      viewCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: 'Vídeo do YouTube',
      description: 'Exemplo de vídeo do YouTube integrado',
      type: 'video',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
      tags: ['youtube', 'exemplo', 'embed'],
      viewCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const adminDb = getAdminDb();
  
  if (!adminDb) {
    console.error('[Admin] Firebase Admin não inicializado');
    throw new Error('Firebase Admin não inicializado');
  }
  
  const batch = adminDb.batch();
  
  sampleContent.forEach((item) => {
    const docRef = adminDb.collection('exclusiveContent').doc();
    batch.set(docRef, item);
  });

  await batch.commit();
  return sampleContent.length;
}

// Função para deletar arquivo do Firebase Storage
async function deleteFromStorage(fileName: string, storageType: string, uploadType: string = 'exclusive-content') {
  if (storageType === 'firebase-storage') {
    try {
      const adminStorage = getAdminStorage();
      
      if (!adminStorage) {
        console.error('[Admin] Firebase Storage não inicializado');
        return;
      }
      
      const bucket = getAdminBucket();
      if (!bucket) return;
      
      // Tentar deletar de diferentes pastas baseado no tipo
      const possiblePaths = [
        `uploads/${uploadType}/images/${fileName}`,
        `uploads/${uploadType}/videos/${fileName}`,
        `uploads/${uploadType}/${fileName}`
      ];
      
      for (const filePath of possiblePaths) {
        try {
          await bucket.file(filePath).delete();
          console.log(`[Admin Exclusive Content] Arquivo deletado do Storage: ${filePath}`);
          return; // Se conseguiu deletar, sai da função
        } catch (error) {
          // Se não encontrou o arquivo neste caminho, tenta o próximo
          continue;
        }
      }
      
      console.log(`[Admin Exclusive Content] Arquivo não encontrado no Storage: ${fileName}`);
    } catch (error) {
      console.error(`[Admin Exclusive Content] Erro ao deletar do Storage:`, error);
      // Não falhar se não conseguir deletar do storage
    }
  }
}

// GET - Buscar conteúdo exclusivo do admin autenticado
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
    
    const exclusiveContentRef = adminDb.collection('exclusiveContent').where('adminUid', '==', authResult.uid);
    const snapshot = await exclusiveContentRef.orderBy('createdAt', 'desc').get();

    // Se não há conteúdo, retornar array vazio (não criar conteúdo de exemplo global)
    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        content: []
      });
    }

    const content = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
    }));

    return NextResponse.json({
      success: true,
      content
    });

  } catch (error) {
    console.error('Erro ao buscar conteúdo exclusivo:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar conteúdo exclusivo'
    }, { status: 500 });
  }
}

// POST - Adicionar novo conteúdo exclusivo
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminApiAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { title, description, type, url, thumbnailUrl, tags } = body;

    if (!title || !type || !url) {
      return NextResponse.json({
        success: false,
        message: 'Título, tipo e URL são obrigatórios'
      }, { status: 400 });
    }

    const adminDb = getAdminDb();
    
    if (!adminDb) {
      console.error('[Admin] Firebase Admin não inicializado');
      return NextResponse.json({ 
        success: false,
        message: 'Firebase Admin não inicializado' 
      }, { status: 500 });
    }

    const newContent = {
      title,
      description: description || '',
      type,
      url,
      thumbnailUrl: thumbnailUrl || url,
      tags: tags || [],
      viewCount: 0,
      isActive: true,
      adminUid: authResult.uid,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await adminDb.collection('exclusiveContent').add(newContent);

    return NextResponse.json({
      success: true,
      message: 'Conteúdo exclusivo adicionado com sucesso',
      id: docRef.id
    });

  } catch (error) {
    console.error('Erro ao adicionar conteúdo exclusivo:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao adicionar conteúdo exclusivo'
    }, { status: 500 });
  }
}
