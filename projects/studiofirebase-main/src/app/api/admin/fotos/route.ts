import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';

// Função para normalizar datas do Firestore
function normalizeFirestoreData(data: any): any {
    const normalized = { ...data };

    // Normalizar URL da foto (compatibilidade com uploads antigos)
    if (!normalized.photoUrl) {
        normalized.photoUrl = normalized.url || normalized.imageUrl || '';
    }

    // Converter Timestamps do Firestore para ISO strings
    if (data.createdAt) {
        if (data.createdAt.toDate) {
            normalized.createdAt = data.createdAt.toDate().toISOString();
        } else if (data.createdAt instanceof Date) {
            normalized.createdAt = data.createdAt.toISOString();
        } else if (typeof data.createdAt === 'string') {
            normalized.createdAt = data.createdAt;
        } else {
            normalized.createdAt = new Date().toISOString();
        }
    }

    if (data.updatedAt) {
        if (data.updatedAt.toDate) {
            normalized.updatedAt = data.updatedAt.toDate().toISOString();
        } else if (data.updatedAt instanceof Date) {
            normalized.updatedAt = data.updatedAt.toISOString();
        } else if (typeof data.updatedAt === 'string') {
            normalized.updatedAt = data.updatedAt;
        } else {
            normalized.updatedAt = new Date().toISOString();
        }
    }

    return normalized;
}



// GET - Listar fotos do admin autenticado
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

        const photosRef = adminDb.collection('photos').where('adminUid', '==', authResult.uid);
        const snapshot = await photosRef.orderBy('createdAt', 'desc').get();

        const photos = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            const normalizedData = normalizeFirestoreData(data);
            console.log('[Admin Photos] Foto:', doc.id, 'URL:', normalizedData.photoUrl);
            return {
                id: doc.id,
                ...normalizedData
            };
        });

        return NextResponse.json({
            success: true,
            photos
        });

    } catch (error) {
        console.error('[Admin Photos] Erro ao buscar fotos:', error);
        return NextResponse.json({
            success: false,
            message: 'Erro ao buscar fotos',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
        }, { status: 500 });
    }
}

// POST - Criar nova foto
export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAdminApiAuth(request);
        if (authResult instanceof NextResponse) return authResult;

        const body = await request.json();
        const { title, description, photoUrl, storageType = 'external', fileName } = body;

        // Validação
        if (!title || !photoUrl) {
            return NextResponse.json({
                success: false,
                message: 'Título e URL da foto são obrigatórios'
            }, { status: 400 });
        }

        const adminDb = getAdminDb();

        if (!adminDb) {
            console.error('[Admin] Firebase Admin não inicializado');
            return NextResponse.json({
                error: 'Firebase Admin não inicializado'
            }, { status: 500 });
        }

        const photoData = {
            title: title.trim(),
            description: description?.trim() || '',
            photoUrl: photoUrl.trim(),
            storageType,
            adminUid: authResult.uid,
            fileName: typeof fileName === 'string' && fileName.trim() ? fileName.trim() : undefined,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const docRef = await adminDb.collection('photos').add(photoData);

        return NextResponse.json({
            success: true,
            message: 'Foto criada com sucesso',
            photoId: docRef.id
        });

    } catch (error) {
        console.error('[Admin Photos] Erro ao criar foto:', error);
        return NextResponse.json({
            success: false,
            message: 'Erro ao criar foto',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
        }, { status: 500 });
    }
}
