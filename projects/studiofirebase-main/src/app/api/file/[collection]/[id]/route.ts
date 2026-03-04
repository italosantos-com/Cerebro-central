import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminStorage, getAdminBucket } from '@/lib/firebase-admin';

interface RouteParams {
  params: Promise<{
    collection: string;
    id: string;
  }>;
}

// GET - Buscar arquivo específico
export async function GET(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  try {
    const { collection, id } = params;
    
    if (!collection || !id) {
      return NextResponse.json({
        success: false,
        message: 'Collection e ID são obrigatórios'
      }, { status: 400 });
    }
    
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      console.error('[Admin] Firebase Admin não inicializado');
      return NextResponse.json({
        error: 'Firebase Admin não inicializado'
      }, { status: 500 });
    }
    
    const docRef = adminDb.collection(collection).doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return NextResponse.json({
        success: false,
        message: 'Arquivo não encontrado'
      }, { status: 404 });
    }
    
    const data = doc.data();
    
    return NextResponse.json({
      success: true,
      file: {
        id: doc.id,
        ...data
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar arquivo:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar arquivo'
    }, { status: 500 });
  }
}

// DELETE - Excluir arquivo
export async function DELETE(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  try {
    const { collection, id } = params;
    
    if (!collection || !id) {
      return NextResponse.json({
        success: false,
        message: 'Collection e ID são obrigatórios'
      }, { status: 400 });
    }
    
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      console.error('[Admin] Firebase Admin não inicializado');
      return NextResponse.json({
        error: 'Firebase Admin não inicializado'
      }, { status: 500 });
    }
    
    const docRef = adminDb.collection(collection).doc(id);
    
    // Verificar se o documento existe
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({
        success: false,
        message: 'Arquivo não encontrado'
      }, { status: 404 });
    }
    
    const data = doc.data();
    
    // Deletar do Firebase Storage se aplicável
    if (data?.storageType === 'firebase-storage' && data?.url) {
      try {
        const adminStorage = getAdminStorage();
        
        if (!adminStorage) {
          console.error('[Admin] Firebase Storage não inicializado');
        } else {
          const bucket = getAdminBucket();
          if (!bucket) {
            console.warn('[File API] Bucket não disponível, pulando exclusão no Storage');
          } else {
        
          // Extrair o caminho do arquivo da URL do Storage
          const storageUrl = data.url;
          if (storageUrl.includes('storage.googleapis.com/')) {
            const urlParts = storageUrl.split('/');
            const bucketName = urlParts[3];
            const filePath = urlParts.slice(4).join('/');
            
            if (!bucketName || bucketName === bucket.name) {
              await bucket.file(filePath).delete();
              console.log(`Arquivo deletado do Storage: ${filePath}`);
            }
          }
          }
        }
      } catch (error) {
        console.error('Erro ao deletar do Storage:', error);
        // Não falhar se não conseguir deletar do storage
      }
    }
    
    // Excluir o documento
    await docRef.delete();
    
    return NextResponse.json({
      success: true,
      message: 'Arquivo excluído com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao excluir arquivo:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao excluir arquivo',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
