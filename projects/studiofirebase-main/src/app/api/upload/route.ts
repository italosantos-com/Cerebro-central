// src/app/api/upload/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getAdminDb, getAdminStorage, getAdminBucket } from '@/lib/firebase-admin';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { isSuperAdminUsername } from '@/lib/superadmin-config';
import { getStorageProvider, uploadToProvider } from '@/services/cloud-storage-providers';

// Ensure Node runtime (required for Buffer/streams)
export const runtime = 'nodejs';
// Limites de tamanho para diferentes estratégias de upload
const BASE64_LIMIT = 1 * 1024 * 1024; // 1MB - máximo para base64 (limite do Firestore)
const IMAGE_STORAGE_LIMIT = 10 * 1024 * 1024; // 10MB - máximo para imagens no Storage
const VIDEO_STORAGE_LIMIT = 2 * 1024 * 1024 * 1024; // 2GB - máximo para vídeos no Storage
const MAX_SIZE = 5 * 1024 * 1024 * 1024; // 5GB - máximo geral



export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('[Upload API] Iniciando upload...');

    // Exigir autenticação de admin para qualquer operação de upload/registro
    const authResult = await requireAdminApiAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const adminAuthHeader = request.headers.get('authorization') || '';

    const isSuperAdmin =
      authResult.decodedToken?.isSuperAdmin === true ||
      isSuperAdminUsername(authResult.adminDoc?.username);

    // Verificar se o Firebase Admin está disponível
    const adminDb = getAdminDb();
    const adminStorage = getAdminStorage();

    if (!adminDb || !adminStorage) {
      console.error('[Upload API] Firebase Admin não inicializado');
      return NextResponse.json(
        { success: false, message: 'Configuração do servidor não disponível. Verifique as variáveis de ambiente do Firebase Admin.' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const maybeFolder = formData.get('folder');
    const folder = typeof maybeFolder === 'string' && maybeFolder.trim() ? maybeFolder.trim() : 'general';
    const maybeTitle = formData.get('title');
    const title = typeof maybeTitle === 'string' && maybeTitle.trim() ? maybeTitle.trim() : 'Sem título';
    const maybeVisibility = formData.get('visibility');
    const visibility = typeof maybeVisibility === 'string' && ['public', 'private'].includes(maybeVisibility) ? maybeVisibility : 'public';
    const maybeType = formData.get('uploadType') || formData.get('type');
    const uploadType = typeof maybeType === 'string' && maybeType.trim() ? maybeType.trim() : 'general';
    const externalUrlEntry = formData.get('externalUrl');
    const externalUrl = typeof externalUrlEntry === 'string' && externalUrlEntry.trim() ? externalUrlEntry.trim() : null;
    const maybePrice = formData.get('price');
    const price = typeof maybePrice === 'string' && maybePrice.trim() ? parseFloat(maybePrice) : 0;
    const maybeDescription = formData.get('description');
    const description = typeof maybeDescription === 'string' && maybeDescription.trim() ? maybeDescription.trim() : '';

    console.log('[Upload API] Arquivo recebido:', (file as any)?.name, (file as any)?.type, (file as any)?.size, 'Tipo:', uploadType, 'Preço:', price);

    if (!file && !externalUrl) {
      console.error('[Upload API] Nenhum arquivo ou URL externa enviada');
      return NextResponse.json({ success: false, message: 'Nenhum arquivo ou URL enviada' }, { status: 400 });
    }

    // ========================================
    // ROTEAMENTO INTELIGENTE POR PROVIDER
    // ========================================
    // SuperAdmin: Firebase Storage (nativo)
    // Novos Admins: Google Drive/One, YouTube, iCloud Drive

    const username = authResult.adminDoc?.username;
    const isSuper = isSuperAdmin;

    // Validar URL externa (quando não há arquivo)
    if (!file && externalUrl) {
      try {
        const parsed = new URL(externalUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return NextResponse.json({ success: false, message: 'URL externa inválida (apenas http/https).' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ success: false, message: 'URL externa inválida.' }, { status: 400 });
      }
    }

    let fileType = '';
    let fileSize = 0;
    let originalName = '';
    let fileName = '';
    let storageType = '';
    let fileData = null;
    let finalUrl = '';

    if (file) {
      // Validar tamanho do arquivo
      if (typeof file.size === 'number' && file.size > MAX_SIZE) {
        console.error('[Upload API] Arquivo muito grande:', file.size);
        return NextResponse.json({ success: false, message: 'Arquivo muito grande. Máximo 5GB' }, { status: 400 });
      }

      // Validar tipo de arquivo
      const allowedPrefixes = ['image/', 'video/'];
      fileType = (file as any)?.type || '';
      const isValidType = allowedPrefixes.some((p) => fileType.startsWith(p));
      if (!isValidType) {
        console.error('[Upload API] Tipo não permitido:', fileType);
        return NextResponse.json(
          { success: false, message: 'Tipo de arquivo não permitido. Apenas imagens e vídeos' },
          { status: 400 }
        );
      }

      fileSize = file.size;
      originalName = (file as any)?.name || 'upload';

      // Preparar nome único de arquivo
      const sanitized = originalName.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const hasDot = sanitized.includes('.');
      const extFromName = hasDot ? sanitized.split('.').pop()!.toLowerCase() : '';
      const fallbackExt = fileType.startsWith('image/') ? 'jpg' : fileType.startsWith('video/') ? 'mp4' : 'bin';
      const ext = extFromName || fallbackExt;
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      fileName = `${uniqueSuffix}_${sanitized.replace(/\./g, '_')}`;

      console.log('[Upload API] Nome do arquivo:', fileName, 'Tamanho:', fileSize, 'Tipo:', fileType);

      // Estratégia híbrida inteligente
      const isImage = fileType.startsWith('image/');
      const isVideo = fileType.startsWith('video/');
      // DETERMINAR PROVIDER BASEADO EM ROLE
      const mediaType = isImage ? 'image' : isVideo ? 'video' : 'file';

      const provider = getStorageProvider(username, mediaType);
      console.log('[Upload API] Provider selecionado:', provider, '| Role:', isSuper ? 'SuperAdmin' : 'Admin');

      // Se NÃO for SuperAdmin, rotear para providers específicos
      if (!isSuper && provider !== 'firebase-storage') {
        console.log('[Upload API] Roteando para provider externo:', provider);

        const arrayBuffer = await file.arrayBuffer();
        const uploadResult = await uploadToProvider(
          {
            name: fileName,
            size: fileSize,
            type: fileType,
            data: arrayBuffer
          },
          provider,
          adminAuthHeader
            ? { provider, credentials: { adminAuthHeader } }
            : { provider }
        );

        if (!uploadResult.success) {
          return NextResponse.json({
            success: false,
            message: uploadResult.error || `Falha no upload para ${provider}`
          }, { status: 500 });
        }

        // Salvar metadados no Firestore
        const collection = isImage ? 'photos' : isVideo ? 'videos' : 'files';
        const docData = {
          fileName,
          originalName,
          size: fileSize,
          type: fileType,
          storageType: provider,
          url: uploadResult.url,
          fileId: uploadResult.fileId,
          title,
          description,
          price,
          visibility,
          adminUid: authResult.uid,
          adminUsername: username,
          uploadType,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (uploadType === 'photos' || uploadType === 'videos') {
          await adminDb.collection(collection).doc(fileName).set(docData);
          console.log(`[Upload API] Metadados salvos em ${collection}/${fileName}`);
        }

        return NextResponse.json({
          success: true,
          message: `Upload realizado com sucesso no ${provider}`,
          url: uploadResult.url,
          fileId: uploadResult.fileId,
          fileName,
          originalName,
          size: fileSize,
          type: fileType,
          storageType: provider,
          provider
        });
      }

      // SuperAdmin continua usando Firebase Storage (código original)
      console.log('[Upload API] SuperAdmin usando Firebase Storage');
      // Estratégia híbrida inteligente
      const isImage_FB = fileType.startsWith('image/');
      const isVideo_FB = fileType.startsWith('video/');
      if (isImage_FB) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Upload API] Usando Firebase Storage para imagem');
        }
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        const bucket = getAdminBucket();
        if (!bucket) throw new Error('Bucket do Firebase Storage indisponível');
        const filePath = `uploads/${authResult.uid}/${uploadType}/images/${fileName}`;
        const fileUpload = bucket.file(filePath);

        await fileUpload.save(fileBuffer, {
          metadata: {
            contentType: fileType,
            metadata: {
              originalName,
              uploadType,
              uploadedBy: authResult.uid
            }
          }
        });

        // Não tentar fazer makePublic() - usar URL de download direto
        // O Firebase Storage Rules já permite leitura pública em /uploads/**

        storageType = 'firebase-storage';
        // Usar getSignedUrl ou URL público via Storage Rules
        const [signedUrl] = await fileUpload.getSignedUrl({
          action: 'read',
          expires: '03-01-2500' // URL de longa duração
        });
        finalUrl = signedUrl;

        console.log('[Upload API] Imagem enviada para Firebase Storage:', finalUrl);
      } else if (isVideo_FB && fileSize <= VIDEO_STORAGE_LIMIT) {
        // Vídeo - sempre usar Firebase Storage (otimizado para streaming)
        if (process.env.NODE_ENV === 'development') {
          console.log('[Upload API] Usando Firebase Storage para vídeo');
        }
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        const bucket = getAdminBucket();
        if (!bucket) throw new Error('Bucket do Firebase Storage indisponível');
        const filePath = `uploads/${authResult.uid}/${uploadType}/videos/${fileName}`;
        const fileUpload = bucket.file(filePath);

        await fileUpload.save(fileBuffer, {
          metadata: {
            contentType: fileType,
            metadata: {
              originalName,
              uploadType,
              uploadedBy: authResult.uid
            }
          }
        });

        // Não tentar fazer makePublic() - usar URL de download direto
        // O Firebase Storage Rules já permite leitura pública em /uploads/**

        storageType = 'firebase-storage';
        // Usar getSignedUrl ou URL público via Storage Rules
        const [signedUrl] = await fileUpload.getSignedUrl({
          action: 'read',
          expires: '03-01-2500' // URL de longa duração
        });
        finalUrl = signedUrl;

        if (process.env.NODE_ENV === 'development') {
          console.log('[Upload API] Vídeo enviado para Firebase Storage:', finalUrl);
        }
      } else {
        // Arquivo muito grande - salvar apenas metadados e usar URL externa
        console.log('[Upload API] Arquivo muito grande detectado, salvando apenas metadados');
        storageType = 'external-url';
        finalUrl = externalUrl || `https://example.com/uploads/${fileName}`; // Placeholder
      }
    } else if (externalUrl) {
      // URL externa fornecida
      console.log('[Upload API] Usando URL externa fornecida');
      fileType = 'video/mp4'; // Assumir vídeo para URLs externas
      fileSize = 0;
      originalName = 'video-externo';
      fileName = `external_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      storageType = 'external-url';
      finalUrl = externalUrl;
    }

    // Determinar coleção baseada no tipo de upload
    let collection = 'photos';
    if (uploadType === 'assistant-media') {
      collection = 'assistantMedia';
    } else if (uploadType === 'exclusive-content') {
      collection = 'exclusiveContent';
    } else if (fileType.startsWith('video/')) {
      collection = 'videos';
    }

    // Para vídeos, não gerar thumbnail automático - deixar vazio para usar thumbnail nativa
    let thumbnailUrl = '';

    // Salvar no Firestore
    const filePath = `firestore-uploads/${folder}/${fileName}`;
    const docData: any = {
      fileName,
      originalName,
      size: fileSize,
      type: fileType,
      path: filePath,
      firestoreId: fileName,
      collection,
      visibility,
      title,
      description,
      price,
      thumbnailUrl,
      storageType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      uploadedBy: authResult.uid,
      adminUid: authResult.uid,
      adminUsername: authResult.adminDoc?.username || null,
      folder,
      url: finalUrl,
      // Campos adicionais para compatibilidade com a API de vídeos
      videoUrl: finalUrl, // Campo principal usado pela API de vídeos
    };

    // Adicionar dados do arquivo apenas se for base64
    if (fileData) {
      docData.fileData = fileData;
    }

    // Só salvar no Firestore se não for para a galeria de fotos admin
    // (A galeria de fotos tem seu próprio sistema de salvamento)
    if (uploadType !== 'photos') {
      console.log('[Upload API] Salvando documento no Firestore...');
      await adminDb.collection(collection).doc(fileName).set(docData);
    } else {
      console.log('[Upload API] Upload de foto - não salvando no Firestore (será salvo pela API de fotos)');
    }

    console.log('[Upload API] Upload finalizado com sucesso');

    // Retornar resposta de sucesso
    return NextResponse.json({
      success: true,
      message: 'Upload realizado com sucesso',
      fileName,
      originalName,
      size: fileSize,
      type: fileType,
      path: filePath,
      firestoreId: fileName,
      collection,
      visibility,
      storageType,
      url: finalUrl,
      videoUrl: finalUrl, // Campo principal usado pela API de vídeos
      thumbnailUrl,
      price,
      description,
      isLargeFile: fileSize > BASE64_LIMIT,
      isVeryLargeFile: fileSize > (fileType.startsWith('image/') ? IMAGE_STORAGE_LIMIT : VIDEO_STORAGE_LIMIT),
      strategy: storageType === 'firestore-base64' ? 'base64' :
        storageType === 'firebase-storage' ? 'storage' : 'external'
    });

  } catch (error) {
    console.error('[Upload API] Erro geral:', error);
    return NextResponse.json(
      { success: false, message: `Erro interno do servidor: ${error instanceof Error ? error.message : 'Erro desconhecido'}` },
      { status: 500 }
    );
  }
}
