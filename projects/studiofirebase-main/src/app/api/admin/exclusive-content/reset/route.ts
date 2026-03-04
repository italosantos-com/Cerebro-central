import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

// Endpoint para limpar e recriar dados de exemplo
export async function POST(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      console.error('[Admin] Firebase Admin não inicializado');
      return NextResponse.json({ 
        error: 'Firebase Admin não inicializado' 
      }, { status: 500 });
    }
    
    const exclusiveContentRef = adminDb.collection('exclusiveContent');

    // Limpar dados existentes
    const snapshot = await exclusiveContentRef.get();
    const batch = adminDb.batch();
    
    snapshot.docs.forEach((doc: any) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    // Criar novos dados de exemplo com melhor qualidade
    const newSampleContent = [
      {
        title: 'Foto Exclusiva da Natureza',
        description: 'Uma bela paisagem exclusiva para nossos assinantes',
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
        title: 'Vídeo do YouTube - Rick Roll',
        description: 'Exemplo de vídeo do YouTube integrado',
        type: 'video',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        tags: ['youtube', 'exemplo', 'embed', 'música'],
        viewCount: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Vídeo Direto MP4',
        description: 'Exemplo de vídeo com link direto',
        type: 'video',
        url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=400&h=300&fit=crop',
        tags: ['vídeo', 'direto', 'mp4'],
        viewCount: 2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Vídeo do Vimeo',
        description: 'Exemplo de vídeo do Vimeo',
        type: 'video',
        url: 'https://vimeo.com/148751763',
        thumbnailUrl: 'https://vumbnail.com/148751763.jpg',
        tags: ['vimeo', 'exemplo', 'embed'],
        viewCount: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Foto de Exemplo 2',
        description: 'Outra foto de exemplo',
        type: 'photo',
        url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop',
        tags: ['floresta', 'verde', 'natureza'],
        viewCount: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const newBatch = adminDb.batch();
    newSampleContent.forEach((item) => {
      const docRef = exclusiveContentRef.doc();
      newBatch.set(docRef, item);
    });

    await newBatch.commit();

    return NextResponse.json({
      success: true,
      message: `${newSampleContent.length} novos itens de exemplo criados`,
      count: newSampleContent.length
    });

  } catch (error) {
    console.error('Erro ao resetar conteúdo exclusivo:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao resetar conteúdo exclusivo'
    }, { status: 500 });
  }
}
