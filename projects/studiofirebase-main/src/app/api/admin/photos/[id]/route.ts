import { NextRequest, NextResponse } from 'next/server';
import { getAdminBucket, getAdminDb } from '@/lib/firebase-admin';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// Função para deletar arquivo do Firebase Storage
async function deleteFromStorage(fileName: string, storageType: string, uploadType: string = 'photos') {
  if (storageType === 'firebase-storage') {
    try {
      const bucket = getAdminBucket();
      if (!bucket) {
        console.warn('[Admin Photos] Bucket não configurado para exclusão.');
        return;
      }
      
      // Tentar deletar de diferentes pastas baseado no tipo
      const possiblePaths = [
        `uploads/${uploadType}/${fileName}`,
        `uploads/${uploadType}/images/${fileName}`,
        `italosantos.com/photos/${fileName}`,
        `italosantos.com/photos-by-url/${fileName}`
      ];
      
      for (const filePath of possiblePaths) {
        try {
          await bucket.file(filePath).delete();
          console.log(`[Admin Photos] Arquivo deletado do Storage: ${filePath}`);
          return; // Se conseguiu deletar, sai da função
        } catch {
          // Se não encontrou o arquivo neste caminho, tenta o próximo
          continue;
        }
      }
      
      console.log(`[Admin Photos] Arquivo não encontrado no Storage: ${fileName}`);
    } catch (error) {
      console.error(`[Admin Photos] Erro ao deletar do Storage:`, error);
      // Não falhar se não conseguir deletar do storage
    }
  }
}

// PUT - Atualizar foto
export async function PUT(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  try {
    const authResult = await requireAdminApiAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = params;
    
    const body = await request.json();
    const { title, imageUrl, storagePath } = body;
    
    // Validação
    if (!title || !imageUrl) {
      return NextResponse.json({
        success: false,
        message: 'Título e URL da imagem são obrigatórios'
      }, { status: 400 });
    }
    
    // Verificar se o documento existe
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({
        success: false,
        message: 'Firestore Admin não configurado'
      }, { status: 500 });
    }
    const docRef = adminDb.collection('photos').doc(id);

    // Verificar se o documento existe
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({
        success: false,
        message: 'Foto não encontrada'
      }, { status: 404 });
    }

    // Verificar ownership
    if (doc.data()?.adminUid !== authResult.uid) {
      return NextResponse.json({
        success: false,
        message: 'Acesso negado'
      }, { status: 403 });
    }

    const updateData = {
      title: title.trim(),
      imageUrl: imageUrl.trim(),
      storagePath: storagePath || 'external',
      updatedAt: new Date()
    };
    
    await docRef.update(updateData);
    
    return NextResponse.json({
      success: true,
      message: 'Foto atualizada com sucesso'
    });
    
  } catch (error) {
    console.error('[Admin Photos] Erro ao atualizar foto:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao atualizar foto',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// DELETE - Excluir foto
export async function DELETE(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  try {
    const authResult = await requireAdminApiAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'ID é obrigatório'
      }, { status: 400 });
    }
    
    // Verificar se o documento existe
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({
        success: false,
        message: 'Firestore Admin não configurado'
      }, { status: 500 });
    }
    const docRef = adminDb.collection('photos').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return NextResponse.json({
        success: false,
        message: 'Foto não encontrada'
      }, { status: 404 });
    }

    const data = doc.data();

    // Verificar ownership
    if (data?.adminUid !== authResult.uid) {
      return NextResponse.json({
        success: false,
        message: 'Acesso negado'
      }, { status: 403 });
    }

    // Deletar do Firebase Storage se aplicável
    if (data?.storagePath && data?.storagePath !== 'external') {
      await deleteFromStorage(data.storagePath, 'firebase-storage');
    }

    // Excluir o documento
    await docRef.delete();
    
    return NextResponse.json({
      success: true,
      message: 'Foto excluída com sucesso'
    });

  } catch (error) {
    console.error('[Admin Photos] Erro ao excluir foto:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao excluir foto',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
