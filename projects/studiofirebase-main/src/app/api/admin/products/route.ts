
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminStorage, getAdminAuth } from '@/lib/firebase-admin';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';

// Função para normalizar datas do Firestore
function normalizeFirestoreData(data: any): any {
  const normalized = { ...data };
  if (data.createdAt && data.createdAt.toDate) {
    normalized.createdAt = data.createdAt.toDate().toISOString();
  }
  if (data.updatedAt && data.updatedAt.toDate) {
    normalized.updatedAt = data.updatedAt.toDate().toISOString();
  }
  return normalized;
}

// GET - Listar produtos (autenticado: do próprio admin; público: filtrar por sellerId param)
export async function GET(request: NextRequest) {
  try {
    console.log('[Products API] Starting GET request');
    const adminDb = getAdminDb();
    console.log('[Products API] adminDb:', !!adminDb);
    if (!adminDb) {
      console.log('[Products API] Firebase Admin not initialized');
      return NextResponse.json({ error: 'Firebase Admin não inicializado' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const sellerIdParam = searchParams.get('sellerId');

    // Tenta autenticar; se não houver token, trata como acesso público
    let authenticatedUid: string | null = null;
    const hasAuthHeader = request.headers.get('authorization')?.startsWith('Bearer ') || request.cookies.get('__session')?.value;
    if (hasAuthHeader) {
      const authResult = await requireAdminApiAuth(request);
      if (authResult instanceof NextResponse) return authResult;
      authenticatedUid = authResult.uid;
    }

    let productsQuery: any = adminDb.collection('products');

    if (authenticatedUid) {
      // Admin autenticado: retorna apenas seus próprios produtos
      productsQuery = productsQuery.where('sellerId', '==', authenticatedUid);
    } else if (sellerIdParam) {
      // Acesso público com filtro de vendedor explícito
      productsQuery = productsQuery.where('sellerId', '==', sellerIdParam);
    }
    // Se não autenticado e sem sellerId, retorna todos os produtos (fallback legacy)

    console.log('[Products API] Got productsRef');
    const snapshot = await productsQuery.orderBy('createdAt', 'desc').get();
    console.log('[Products API] Got snapshot, docs count:', snapshot.docs.length);
    const products = snapshot.docs.map((doc: any) => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) }));
    console.log('[Products API] Processed products:', products.length);
    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error('[Products API] Error:', error);
    return NextResponse.json({ success: false, message: 'Erro ao buscar produtos', error: error instanceof Error ? error.message : 'Erro desconhecido' }, { status: 500 });
  }
}

// POST - Criar novo produto
export async function POST(request: NextRequest) {
  try {
    const auth = getAdminAuth();
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Firebase Admin não inicializado' }, { status: 500 });
    }

    // Verificar autenticação: aceitar tanto cookie quanto Bearer token
    const sessionCookie = request.cookies.get("__session")?.value || "";
    const authHeader = request.headers.get('authorization') || "";
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : "";

    let sellerId: string;

    if (sessionCookie) {
      // Autenticação via cookie de sessão
      const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
      sellerId = decodedClaims.uid;
    } else if (bearerToken) {
      // Autenticação via token Bearer
      const decodedToken = await auth.verifyIdToken(bearerToken);
      sellerId = decodedToken.uid;
    } else {
      return NextResponse.json({ success: false, message: 'Não autenticado. Token ou sessão necessária.' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, price, videoUrl, status = 'active', storageType } = body;

    if (!name || !price || !videoUrl) {
      return NextResponse.json({ success: false, message: 'Nome, preço e URL do vídeo são obrigatórios' }, { status: 400 });
    }
    if (parseFloat(price) <= 0) {
      return NextResponse.json({ success: false, message: 'O preço deve ser maior que zero' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin não inicializado' }, { status: 500 });
    }

    const productData = {
      name: name.trim(),
      description: description?.trim() || '',
      price: parseFloat(price),
      imageUrl: '',
      videoUrl: videoUrl.trim(),
      type: 'video',
      status,
      storageType: storageType || 'external',
      sales: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      sellerId: sellerId, // Adicionar o ID do vendedor ao produto
    };

    const docRef = await adminDb.collection('products').add(productData);

    return NextResponse.json({ success: true, message: 'Produto criado com sucesso', productId: docRef.id });

  } catch (error) {
    if (error instanceof Error && (error.message.includes('session-cookie-expired') || error.message.includes('session-cookie-revoked'))) {
      return NextResponse.json({ success: false, message: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
    }
    return NextResponse.json({ success: false, message: 'Erro ao criar produto', error: error instanceof Error ? error.message : 'Erro desconhecido' }, { status: 500 });
  }
}
