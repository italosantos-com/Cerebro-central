import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminStorage, getAdminBucket } from '@/lib/firebase-admin';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// Função para deletar arquivo do Firebase Storage
async function deleteFromStorage(fileName: string, storageType: string, uploadType: string = 'exclusive-content') {
  if (storageType === 'firebase-storage') {
    try {
      const adminStorage = getAdminStorage();
      if (!adminStorage) {
        console.error('[Admin Exclusive Content] Firebase Admin Storage não está disponível.');
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

// PUT - Atualizar conteúdo exclusivo
export async function PUT(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  try {
    const { id } = params;
    
    const body = await request.json();
    
    const { title, description, type, url, thumbnailUrl, tags } = body;
    
    // Validação
    if (!title || !url || !type) {
      return NextResponse.json({
        success: false,
        message: 'Título, URL e tipo são obrigatórios'
      }, { status: 400 });
    }
    
    if (!['photo', 'video'].includes(type)) {
      return NextResponse.json({
        success: false,
        message: 'Tipo deve ser "photo" ou "video"'
      }, { status: 400 });
    }
    
    // Atualizar documento
    const adminDb = getAdminDb();
    if (!adminDb) throw new Error("Firebase Admin DB não inicializado");
    const docRef = adminDb.collection('exclusiveContent').doc(id);
    
    // Verificar se o documento existe
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({
        success: false,
        message: 'Conteúdo não encontrado'
      }, { status: 404 });
    }
    
    const updateData = {
      title: title.trim(),
      description: description?.trim() || '',
      type,
      url: url.trim(),
      thumbnailUrl: thumbnailUrl?.trim() || '',
      tags: Array.isArray(tags) ? tags : [],
      updatedAt: new Date()
    };
    
    await docRef.update(updateData);
    
    return NextResponse.json({
      success: true,
      message: 'Conteúdo exclusivo atualizado com sucesso'
    });
    
  } catch (error) {
    console.error('[Admin Exclusive Content] Erro ao atualizar conteúdo exclusivo:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao atualizar conteúdo exclusivo',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// DELETE - Excluir conteúdo exclusivo
export async function DELETE(
  request: NextRequest,
  props: RouteParams
) {
  const params = await props.params;
  try {
    const { id } = params;
    
    console.log(`[Admin Exclusive Content] DELETE request - id: ${id}`);
    
    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'ID é obrigatório'
      }, { status: 400 });
    }
    
    // Verificar se o documento existe
    const adminDb = getAdminDb();
    if (!adminDb) throw new Error("Firebase Admin DB não inicializado");
    const docRef = adminDb.collection('exclusiveContent').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return NextResponse.json({
        success: false,
        message: 'Conteúdo não encontrado'
      }, { status: 404 });
    }

    const data = doc.data();
    
    // Deletar do Firebase Storage se aplicável
    if (data?.storageType && data?.fileName) {
      await deleteFromStorage(data.fileName, data.storageType);
    }

    // Excluir o documento
    await docRef.delete();
    
    console.log(`[Admin Exclusive Content] Conteúdo excluído com sucesso - id: ${id}`);
    
    return NextResponse.json({
      success: true,
      message: 'Conteúdo excluído com sucesso'
    });

  } catch (error) {
    console.error('[Admin Exclusive Content] Erro ao excluir conteúdo:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao excluir conteúdo',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
