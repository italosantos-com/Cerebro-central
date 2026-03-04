import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminStorage, getAdminAuth } from '@/lib/firebase-admin';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// PUT - Atualizar produto
export async function PUT(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  try {
    const { id } = params;

    const body = await request.json();
    const { name, description, price, videoUrl, status, storageType, incrementSales } = body;

    // Verificar autenticação apenas para operações que não sejam incrementSales
    // (incrementSales pode ser chamado pelo sistema público ao comprar)
    if (!incrementSales) {
      const auth = getAdminAuth();
      if (!auth) {
        return NextResponse.json({ success: false, message: 'Firebase Admin não inicializado' }, { status: 500 });
      }

      // Verificar autenticação: aceitar tanto cookie quanto Bearer token
      const sessionCookie = request.cookies.get("__session")?.value || "";
      const authHeader = request.headers.get('authorization') || "";
      const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : "";

      if (sessionCookie) {
        await auth.verifySessionCookie(sessionCookie, true);
      } else if (bearerToken) {
        await auth.verifyIdToken(bearerToken);
      } else {
        return NextResponse.json({ success: false, message: 'Não autenticado. Token ou sessão necessária.' }, { status: 401 });
      }
    }

    // Se for apenas para incrementar vendas
    if (incrementSales) {
      const adminDb = getAdminDb();

      if (!adminDb) {
        console.error('[Admin] Firebase Admin não inicializado');
        return NextResponse.json({
          error: 'Firebase Admin não inicializado'
        }, { status: 500 });
      }

      const docRef = adminDb.collection('products').doc(id);

      // Verificar se o documento existe
      const doc = await docRef.get();
      if (!doc.exists) {
        return NextResponse.json({
          success: false,
          message: 'Produto não encontrado'
        }, { status: 404 });
      }

      const currentData = doc.data();
      const currentSales = currentData?.sales || 0;

      await docRef.update({
        sales: currentSales + 1,
        updatedAt: new Date()
      });

      return NextResponse.json({
        success: true,
        message: 'Contador de vendas atualizado',
        sales: currentSales + 1
      });
    }

    // Validação para atualizações normais
    if (!name || !price || !videoUrl) {
      return NextResponse.json({
        success: false,
        message: 'Nome, preço e URL do vídeo são obrigatórios'
      }, { status: 400 });
    }

    // Validação básica de URL
    try {
      new URL(videoUrl);
    } catch {
      return NextResponse.json({
        success: false,
        message: 'URL do vídeo deve ser uma URL válida'
      }, { status: 400 });
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Preço deve ser um número válido e maior que zero'
      }, { status: 400 });
    }

    // Validação de status
    const validStatuses = ['active', 'inactive', 'draft'];
    const productStatus = status || 'active';
    if (!validStatuses.includes(productStatus)) {
      return NextResponse.json({
        success: false,
        message: `Status deve ser um dos seguintes: ${validStatuses.join(', ')}`
      }, { status: 400 });
    }

    // Atualizar documento
    const adminDb = getAdminDb();

    if (!adminDb) {
      console.error('[Admin] Firebase Admin não inicializado');
      return NextResponse.json({
        error: 'Firebase Admin não inicializado'
      }, { status: 500 });
    }

    const docRef = adminDb.collection('products').doc(id);

    // Verificar se o documento existe
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({
        success: false,
        message: 'Produto não encontrado'
      }, { status: 404 });
    }

    const updateData = {
      name: name.trim(),
      description: description?.trim() || '',
      price: parsedPrice,
      imageUrl: '', // Sempre vazio, usa thumbnail automática
      videoUrl: videoUrl.trim(),
      type: 'video',
      status: productStatus,
      storageType: storageType || 'external',
      updatedAt: new Date()
    };

    await docRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Produto atualizado com sucesso'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Erro ao atualizar produto',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// DELETE - Excluir produto
export async function DELETE(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'ID é obrigatório'
      }, { status: 400 });
    }

    // Verificar autenticação
    const auth = getAdminAuth();
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Firebase Admin não inicializado' }, { status: 500 });
    }

    const sessionCookie = request.cookies.get("__session")?.value || "";
    const authHeader = request.headers.get('authorization') || "";
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : "";

    if (sessionCookie) {
      await auth.verifySessionCookie(sessionCookie, true);
    } else if (bearerToken) {
      await auth.verifyIdToken(bearerToken);
    } else {
      return NextResponse.json({ success: false, message: 'Não autenticado. Token ou sessão necessária.' }, { status: 401 });
    }

    // Verificar se o documento existe
    const adminDb = getAdminDb();

    if (!adminDb) {
      console.error('[Admin] Firebase Admin não inicializado');
      return NextResponse.json({
        error: 'Firebase Admin não inicializado'
      }, { status: 500 });
    }

    const docRef = adminDb.collection('products').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({
        success: false,
        message: 'Produto não encontrado'
      }, { status: 404 });
    }

    // Excluir o documento
    await docRef.delete();

    return NextResponse.json({
      success: true,
      message: 'Produto excluído com sucesso'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Erro ao excluir produto',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// GET - Buscar produto por ID
export async function GET(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'ID é obrigatório'
      }, { status: 400 });
    }

    const adminDb = getAdminDb();

    if (!adminDb) {
      console.error('[Admin] Firebase Admin não inicializado');
      return NextResponse.json({
        error: 'Firebase Admin não inicializado'
      }, { status: 500 });
    }

    const docRef = adminDb.collection('products').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({
        success: false,
        message: 'Produto não encontrado'
      }, { status: 404 });
    }

    const productData = doc.data();

    return NextResponse.json({
      success: true,
      product: {
        id: doc.id,
        ...productData
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Erro ao buscar produto',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
