import { NextResponse, type NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Force Node.js runtime for Buffer/stream support
export const runtime = 'nodejs';
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('[Admin Upload API] Iniciando upload...');

    // Verificar se o Firestore está disponível
    if (!adminDb) {
      console.error('[Admin Upload API] Firestore não inicializado');
      return NextResponse.json({
        success: false,
        message: 'Configuração do servidor não disponível'
      }, { status: 503 });
    }

    console.log('[Admin Upload API] Firestore OK');

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = formData.get('folder') as string || 'admin-uploads';
    const title = formData.get('title') as string || 'Upload Admin';
    const description = formData.get('description') as string || '';
    const visibility = formData.get('visibility') as string || 'public';

    console.log('[Admin Upload API] Dados recebidos:', {
      hasFile: !!file,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      folder: folder,
      title,
      visibility
    });

    if (!file) {
      console.error('[Admin Upload API] Nenhum arquivo enviado');
      return NextResponse.json({
        success: false,
        message: 'Nenhum arquivo enviado'
      }, { status: 400 });
    }

    // Validar tamanho do arquivo (máximo 5MB para base64)
    const maxSize = 5 * 1024 * 1024; // 5MB (limite para Firestore)
    if (file.size > maxSize) {
      console.error('[Admin Upload API] Arquivo muito grande:', file.size);
      return NextResponse.json({
        success: false,
        message: 'Arquivo muito grande. Máximo 5MB para armazenamento direto no Firestore'
      }, { status: 400 });
    }

    // Validar tipo de arquivo (somente imagens e vídeos)
    const allowedTypes = ['image/', 'video/'];
    const isValidType = allowedTypes.some(type => file.type.startsWith(type));
    if (!isValidType) {
      console.error('[Admin Upload API] Tipo não permitido:', file.type);
      return NextResponse.json({
        success: false,
        message: 'Tipo de arquivo não permitido. Apenas imagens e vídeos'
      }, { status: 400 });
    }

    console.log('[Admin Upload API] Validações OK');

    // Converter arquivo para base64
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const base64Data = fileBuffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64Data}`;

    // Criar ID único para o arquivo
    const timestamp = Date.now();
    const fileId = `${timestamp}_${Math.random().toString(36).substring(2)}`;

    console.log('[Admin Upload API] Arquivo convertido para base64');
    console.log('[Admin Upload API] ID do arquivo:', fileId);

    // Determinar tipo de arquivo
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    try {
      let firestoreDoc: { id: string; collection: "photos" | "videos" } | null = null;

      if (isImage) {
        // Salvar na coleção de fotos
        const photoData = {
          title,
          imageUrl: dataUrl, // Base64 data URL
          imageBase64: base64Data, // Base64 puro (sem data:)
          storagePath: `firestore-uploads/${folder}/${fileId}`, // Caminho virtual
          visibility,
          isSubscriberOnly: visibility === 'subscribers',
          createdAt: new Date(),
          uploadedFrom: 'admin-upload-api-firestore',
          originalFileName: file.name,
          fileSize: file.size,
          contentType: file.type,
          storageType: 'firestore-base64' // Indica que está no Firestore como base64
        };

        const docRef = adminDb.collection('photos').doc(fileId);
        await docRef.set(photoData);
        firestoreDoc = { id: fileId, collection: "photos" };

        console.log('[Admin Upload API] Foto salva no Firestore:', fileId);

      } else if (isVideo) {
        // Salvar na coleção de vídeos
        const videoData = {
          title,
          description,
          videoUrl: dataUrl, // Base64 data URL
          videoBase64: base64Data, // Base64 puro (sem data:)
          thumbnailUrl: 'https://placehold.co/600x400.png', // Thumbnail padrão
          videoStoragePath: `firestore-uploads/${folder}/${fileId}`, // Caminho virtual
          visibility,
          isSubscriberOnly: visibility === 'subscribers',
          createdAt: new Date(),
          uploadedFrom: 'admin-upload-api-firestore',
          originalFileName: file.name,
          fileSize: file.size,
          contentType: file.type,
          price: 0, // Preço padrão
          storageType: 'firestore-base64' // Indica que está no Firestore como base64
        };

        const docRef = adminDb.collection('videos').doc(fileId);
        await docRef.set(videoData);
        firestoreDoc = { id: fileId, collection: "videos" };

        console.log('[Admin Upload API] Vídeo salvo no Firestore:', fileId);
      }

      console.log('[Admin Upload API] Dados salvos no Firestore com sucesso');

      return NextResponse.json({
        success: true,
        message: 'Upload realizado com sucesso no Firestore',
        url: dataUrl, // Data URL para preview imediato
        fileName: fileId,
        originalName: file.name,
        size: file.size,
        type: file.type,
        path: `firestore-uploads/${folder}/${fileId}`,
        firestoreId: fileId,
        collection: firestoreDoc?.collection,
        visibility,
        storageType: 'firestore-base64'
      });

    } catch (firestoreError) {
      console.error('[Admin Upload API] Erro ao salvar no Firestore:', firestoreError);
      return NextResponse.json({
        success: false,
        message: `Erro ao salvar no Firestore: ${firestoreError instanceof Error ? firestoreError.message : 'Erro desconhecido'}`
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[Admin Upload API] Erro geral:', error);
    return NextResponse.json({
      success: false,
      message: `Erro interno do servidor: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    }, { status: 500 });
  }
}
