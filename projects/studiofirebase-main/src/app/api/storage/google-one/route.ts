/**
 * Google One Storage API
 * Upload de arquivos grandes para Google One (usa Google Drive API com quota maior)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { isSuperAdminUsername } from '@/lib/superadmin-config';

export const runtime = 'nodejs';

// Google Drive API v3 (Google One usa a mesma API)
const GOOGLE_DRIVE_API = 'https://www.googleapis.com/drive/v3';
const GOOGLE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        console.log('[Google One] Iniciando upload...');

        // Verificar autenticação admin
        const authResult = await requireAdminApiAuth(request);
        if (authResult instanceof NextResponse) return authResult;

        // SuperAdmin não pode usar este endpoint
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

        // Obter access token do Google
        const googleAccessToken = authResult.adminDoc?.googleOne?.accessToken ||
            authResult.adminDoc?.googleDrive?.accessToken;

        if (!googleAccessToken) {
            return NextResponse.json({
                success: false,
                error: 'Autenticação com Google One não configurada. Configure em Configurações > Integrações.'
            }, { status: 401 });
        }

        // Verificar tamanho do arquivo (Google One suporta arquivos maiores)
        const MAX_SIZE = 15 * 1024 * 1024 * 1024; // 15GB para conta gratuita
        if (file.size > MAX_SIZE) {
            return NextResponse.json({
                success: false,
                error: `Arquivo muito grande. Máximo: ${MAX_SIZE / (1024 * 1024 * 1024)}GB`
            }, { status: 413 });
        }

        // Converter arquivo para buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Usar upload resumable para arquivos grandes
        // 1. Iniciar sessão de upload
        const metadata = {
            name: file.name,
            mimeType: file.type,
            parents: [authResult.adminDoc?.googleOne?.folderId || 'root'],
            description: 'Uploaded via italosantos.com - Google One Storage'
        };

        const initResponse = await fetch(
            `${GOOGLE_UPLOAD_API}/files?uploadType=resumable`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${googleAccessToken}`,
                    'Content-Type': 'application/json; charset=UTF-8',
                    'X-Upload-Content-Type': file.type,
                    'X-Upload-Content-Length': file.size.toString()
                },
                body: JSON.stringify(metadata)
            }
        );

        if (!initResponse.ok) {
            const errorData = await initResponse.json();
            throw new Error(errorData.error?.message || 'Falha ao iniciar upload');
        }

        const uploadUrl = initResponse.headers.get('Location');
        if (!uploadUrl) {
            throw new Error('URL de upload não recebida');
        }

        console.log('[Google One] Sessão de upload iniciada');

        // 2. Upload do arquivo em chunks (para arquivos grandes)
        const CHUNK_SIZE = 256 * 1024 * 1024; // 256MB por chunk
        let uploadedBytes = 0;

        while (uploadedBytes < buffer.length) {
            const chunk = buffer.slice(uploadedBytes, Math.min(uploadedBytes + CHUNK_SIZE, buffer.length));
            const endByte = uploadedBytes + chunk.length - 1;

            console.log(`[Google One] Uploading bytes ${uploadedBytes}-${endByte}/${buffer.length}`);

            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Range': `bytes ${uploadedBytes}-${endByte}/${buffer.length}`,
                    'Content-Length': chunk.length.toString()
                },
                body: chunk
            });

            if (uploadResponse.status === 308) {
                // Continue uploading
                const rangeHeader = uploadResponse.headers.get('Range');
                if (rangeHeader) {
                    const rangeMatch = rangeHeader.match(/bytes=0-(\d+)/);
                    if (rangeMatch) {
                        uploadedBytes = parseInt(rangeMatch[1]) + 1;
                    }
                }
            } else if (uploadResponse.ok || uploadResponse.status === 201) {
                // Upload completo
                const data = await uploadResponse.json();

                // URL do arquivo
                const fileUrl = `https://drive.google.com/file/d/${data.id}/view`;
                const directUrl = `https://drive.google.com/uc?id=${data.id}&export=download`;

                console.log('[Google One] Upload bem-sucedido:', data.id);

                return NextResponse.json({
                    success: true,
                    provider: 'google-one',
                    url: fileUrl,
                    directUrl,
                    fileId: data.id,
                    name: data.name,
                    size: file.size,
                    quotaUsed: true
                });
            } else {
                const errorData = await uploadResponse.json();
                throw new Error(errorData.error?.message || 'Falha no upload');
            }

            uploadedBytes += chunk.length;
        }

        // Se chegou aqui, algo deu errado
        throw new Error('Upload não completou corretamente');

    } catch (error) {
        console.error('[Google One] Erro no upload:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao fazer upload para Google One'
        }, { status: 500 });
    }
}

// Obter quota do Google One
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const authResult = await requireAdminApiAuth(request);
        if (authResult instanceof NextResponse) return authResult;

        const googleAccessToken = authResult.adminDoc?.googleOne?.accessToken ||
            authResult.adminDoc?.googleDrive?.accessToken;

        if (!googleAccessToken) {
            return NextResponse.json({
                success: false,
                error: 'Autenticação com Google One não configurada'
            }, { status: 401 });
        }

        const response = await fetch(
            `${GOOGLE_DRIVE_API}/about?fields=storageQuota,user`,
            {
                headers: {
                    'Authorization': `Bearer ${googleAccessToken}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Falha ao obter informações de quota');
        }

        const data = await response.json();
        const quota = data.storageQuota;

        return NextResponse.json({
            success: true,
            quota: {
                limit: parseInt(quota.limit || '0'),
                usage: parseInt(quota.usage || '0'),
                usageInDrive: parseInt(quota.usageInDrive || '0'),
                usageInTrash: parseInt(quota.usageInTrash || '0'),
                available: parseInt(quota.limit || '0') - parseInt(quota.usage || '0'),
                percentUsed: ((parseInt(quota.usage || '0') / parseInt(quota.limit || '1')) * 100).toFixed(2)
            },
            user: data.user
        });

    } catch (error) {
        console.error('[Google One] Erro ao obter quota:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao obter informações de quota'
        }, { status: 500 });
    }
}
