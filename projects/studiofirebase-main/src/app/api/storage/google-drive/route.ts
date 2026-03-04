/**
 * Google Drive Storage API
 * Upload de arquivos para Google Drive
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { isSuperAdminUsername } from '@/lib/superadmin-config';

export const runtime = 'nodejs';

// Google Drive API v3
const GOOGLE_DRIVE_API = 'https://www.googleapis.com/drive/v3';
const GOOGLE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('[Google Drive] Iniciando upload...');

    // Verificar autenticação admin
    const authResult = await requireAdminApiAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    // SuperAdmin não pode usar este endpoint (usa Firebase Storage)
    if (isSuperAdminUsername(authResult.adminDoc?.username)) {
      return NextResponse.json({
        success: false,
        error: 'SuperAdmin usa Firebase Storage. Este endpoint é apenas para admins regulares.'
      }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum arquivo fornecido'
      }, { status: 400 });
    }

    // Obter access token do Google (deve estar no documento do admin)
    const googleAccessToken = authResult.adminDoc?.googleDrive?.accessToken;
    
    if (!googleAccessToken) {
      return NextResponse.json({
        success: false,
        error: 'Autenticação com Google Drive não configurada. Configure em Configurações > Integrações.'
      }, { status: 401 });
    }

    // Converter arquivo para buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Metadados do arquivo
    const metadata = {
      name: file.name,
      mimeType: file.type,
      parents: [authResult.adminDoc?.googleDrive?.folderId || 'root'] // Pasta específica ou raiz
    };

    // Upload multipart para Google Drive
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelimiter = "\r\n--" + boundary + "--";

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: ' + file.type + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n' +
      '\r\n' +
      buffer.toString('base64') +
      closeDelimiter;

    const response = await fetch(
      `${GOOGLE_UPLOAD_API}/files?uploadType=multipart`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`
        },
        body: multipartRequestBody
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Falha no upload para Google Drive');
    }

    const data = await response.json();

    // Tornar arquivo público (opcional)
    if (formData.get('public') === 'true') {
      await fetch(
        `${GOOGLE_DRIVE_API}/files/${data.id}/permissions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${googleAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            role: 'reader',
            type: 'anyone'
          })
        }
      );
    }

    // URL do arquivo
    const fileUrl = `https://drive.google.com/file/d/${data.id}/view`;
    const directUrl = `https://drive.google.com/uc?id=${data.id}&export=download`;

    console.log('[Google Drive] Upload bem-sucedido:', data.id);

    return NextResponse.json({
      success: true,
      provider: 'google-drive',
      url: fileUrl,
      directUrl,
      fileId: data.id,
      name: data.name,
      size: file.size
    });

  } catch (error) {
    console.error('[Google Drive] Erro no upload:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao fazer upload para Google Drive'
    }, { status: 500 });
  }
}

// Obter informações de um arquivo
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await requireAdminApiAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({
        success: false,
        error: 'fileId é obrigatório'
      }, { status: 400 });
    }

    const googleAccessToken = authResult.adminDoc?.googleDrive?.accessToken;
    
    if (!googleAccessToken) {
      return NextResponse.json({
        success: false,
        error: 'Autenticação com Google Drive não configurada'
      }, { status: 401 });
    }

    const response = await fetch(
      `${GOOGLE_DRIVE_API}/files/${fileId}?fields=id,name,mimeType,size,webViewLink,webContentLink`,
      {
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Falha ao obter informações do arquivo');
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      file: data
    });

  } catch (error) {
    console.error('[Google Drive] Erro ao obter arquivo:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao obter informações do arquivo'
    }, { status: 500 });
  }
}
