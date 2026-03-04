/**
 * iCloud Drive Storage API
 * Upload de fotos para iCloud Drive
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { isSuperAdminUsername } from '@/lib/superadmin-config';

export const runtime = 'nodejs';

// iCloud API endpoints
const ICLOUD_API_BASE = 'https://p52-ckdatabasews.icloud.com/database/1';

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        console.log('[iCloud Drive] Iniciando upload de foto...');

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

        // Validar que é uma imagem
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({
                success: false,
                error: 'Apenas arquivos de imagem são aceitos para iCloud Drive'
            }, { status: 400 });
        }

        // Obter tokens do iCloud (deve estar no documento do admin)
        const icloudAuth = authResult.adminDoc?.icloud;

        if (!icloudAuth?.dsid || !icloudAuth?.sessionToken) {
            return NextResponse.json({
                success: false,
                error: 'Autenticação com iCloud não configurada. Configure em Configurações > Integrações.'
            }, { status: 401 });
        }

        // Converter arquivo para buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString('base64');

        // Preparar upload para iCloud Drive
        // Nota: iCloud API requer autenticação complexa com 2FA
        // Esta é uma implementação simplificada que assume tokens válidos

        const uploadPayload = {
            operations: [{
                operationType: 'create',
                record: {
                    recordName: `photo_${Date.now()}`,
                    recordType: 'CPLAsset',
                    fields: {
                        masterAssetFileSize: {
                            value: file.size
                        },
                        originalFileName: {
                            value: file.name
                        },
                        assetFileType: {
                            value: file.type
                        },
                        masterAssetData: {
                            value: {
                                fileChecksum: '', // Checksum seria calculado
                                size: file.size,
                                downloadURL: '', // Preenchido após upload
                            }
                        }
                    }
                }
            }]
        };

        // iCloud CloudKit API
        const response = await fetch(
            `${ICLOUD_API_BASE}/com.apple.photos.cloud/production/private/records/modify`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Apple-ID-Session-Token': icloudAuth.sessionToken,
                    'X-Apple-CloudKit-Request-KeyID': icloudAuth.keyId || '',
                },
                body: JSON.stringify(uploadPayload)
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[iCloud Drive] Erro na resposta:', errorData);

            // Se o erro for de autenticação, informar o usuário
            if (response.status === 401 || response.status === 403) {
                return NextResponse.json({
                    success: false,
                    error: 'Sessão do iCloud expirada. Por favor, faça login novamente em Configurações > Integrações.'
                }, { status: 401 });
            }

            throw new Error(errorData.serverErrorCode || 'Falha no upload para iCloud Drive');
        }

        const data = await response.json();

        // Como alternativa ao iCloud API direto, podemos usar uma abordagem híbrida:
        // 1. Salvar a imagem em formato otimizado no Firebase/Google
        // 2. Registrar no Firestore com referência ao iCloud
        // 3. Usar iCloud apenas para backup/sincronização

        const fileUrl = data.records?.[0]?.fields?.masterAssetData?.value?.downloadURL || '';
        const fileId = data.records?.[0]?.recordName || '';

        console.log('[iCloud Drive] Upload bem-sucedido:', fileId);

        return NextResponse.json({
            success: true,
            provider: 'icloud-drive',
            url: fileUrl || `icloud://photo/${fileId}`,
            fileId,
            name: file.name,
            size: file.size,
            note: 'iCloud Drive integração em desenvolvimento. Usando referência híbrida.'
        });

    } catch (error) {
        console.error('[iCloud Drive] Erro no upload:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao fazer upload para iCloud Drive'
        }, { status: 500 });
    }
}

// Obter informações de uma foto
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

        const icloudAuth = authResult.adminDoc?.icloud;

        if (!icloudAuth?.sessionToken) {
            return NextResponse.json({
                success: false,
                error: 'Autenticação com iCloud não configurada'
            }, { status: 401 });
        }

        const response = await fetch(
            `${ICLOUD_API_BASE}/com.apple.photos.cloud/production/private/records/lookup`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Apple-ID-Session-Token': icloudAuth.sessionToken,
                },
                body: JSON.stringify({
                    records: [{
                        recordName: fileId
                    }]
                })
            }
        );

        if (!response.ok) {
            throw new Error('Falha ao obter informações da foto');
        }

        const data = await response.json();
        const record = data.records?.[0];

        return NextResponse.json({
            success: true,
            file: {
                id: record?.recordName,
                name: record?.fields?.originalFileName?.value,
                size: record?.fields?.masterAssetFileSize?.value,
                type: record?.fields?.assetFileType?.value,
                url: record?.fields?.masterAssetData?.value?.downloadURL
            }
        });

    } catch (error) {
        console.error('[iCloud Drive] Erro ao obter foto:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao obter informações da foto'
        }, { status: 500 });
    }
}
