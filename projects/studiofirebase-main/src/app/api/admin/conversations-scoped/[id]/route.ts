/**
 * API: GET/PUT/DELETE - Conversa Específica do Admin (Isolada)
 * 
 * Rota dinâmica para operações em conversa individual
 * - GET  /api/admin/conversations-scoped/{id}  - Obter conversa específica
 * - PUT  /api/admin/conversations-scoped/{id}  - Atualizar conversa
 * - DELETE /api/admin/conversations-scoped/{id} - Deletar conversa
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import {
  extractAdminUidFromRequest,
  validateOwnership
} from '@/lib/admin-api-middleware';

// GET - Obter conversa específica com validação de propriedade
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const { adminUid, error: authError } = await extractAdminUidFromRequest(request);
    
    if (!adminUid) {
      return NextResponse.json(
        { error: authError || 'Não autenticado', success: false },
        { status: 401 }
      );
    }

    const conversationId = params.id;
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'ID da conversa é obrigatório', success: false },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Firebase DB não inicializado', success: false },
        { status: 500 }
      );
    }

    // Buscar conversa no escopo do admin (usando SDK admin)
    const docSnapshot = await db
      .collection('admins')
      .doc(adminUid)
      .collection('conversations')
      .doc(conversationId)
      .get();

    if (!docSnapshot.exists) {
      return NextResponse.json(
        { error: 'Conversa não encontrada', success: false },
        { status: 404 }
      );
    }

    const data = docSnapshot.data();

    // Validar propriedade
    if (!validateOwnership(data, adminUid)) {
      return NextResponse.json(
        { error: 'Você não tem permissão para acessar esta conversa', success: false },
        { status: 403 }
      );
    }

    console.log('[Conversations API] GET/:id - Conversa encontrada:', conversationId);

    return NextResponse.json({
      success: true,
      conversation: {
        id: docSnapshot.id,
        ...data
      }
    });
  } catch (error) {
    console.error('[Conversations API] Erro no GET/:id:', error);
    return NextResponse.json(
      { error: 'Erro ao obter conversa', success: false },
      { status: 500 }
    );
  }
}

// PUT - Atualizar conversa
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const { adminUid, error: authError } = await extractAdminUidFromRequest(request);
    
    if (!adminUid) {
      return NextResponse.json(
        { error: authError || 'Não autenticado', success: false },
        { status: 401 }
      );
    }

    const conversationId = params.id;
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'ID da conversa é obrigatório', success: false },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Firebase DB não inicializado', success: false },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { title, description, visibility, tags } = body;

    // Buscar conversa primeiro para validar propriedade
    const conversationRef = db
      .collection('admins')
      .doc(adminUid)
      .collection('conversations')
      .doc(conversationId);

    const snapshot = await conversationRef.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { error: 'Conversa não encontrada', success: false },
        { status: 404 }
      );
    }

    const existingData = snapshot.data();
    if (!validateOwnership(existingData, adminUid)) {
      return NextResponse.json(
        { error: 'Você não tem permissão para atualizar esta conversa', success: false },
        { status: 403 }
      );
    }

    // Preparar dados atualizados
    const updateData: any = {
      updatedAt: new Date()
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (visibility !== undefined) updateData.visibility = visibility;
    if (tags !== undefined) updateData.tags = tags;

    await conversationRef.update(updateData);

    console.log('[Conversations API] PUT/:id - Conversa atualizada:', conversationId);

    return NextResponse.json({
      success: true,
      message: 'Conversa atualizada com sucesso',
      conversationId
    });
  } catch (error) {
    console.error('[Conversations API] Erro no PUT/:id:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar conversa', success: false },
      { status: 500 }
    );
  }
}

// DELETE - Deletar conversa
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const { adminUid, error: authError } = await extractAdminUidFromRequest(request);
    
    if (!adminUid) {
      return NextResponse.json(
        { error: authError || 'Não autenticado', success: false },
        { status: 401 }
      );
    }

    const conversationId = params.id;
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'ID da conversa é obrigatório', success: false },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Firebase DB não inicializado', success: false },
        { status: 500 }
      );
    }

    // Buscar conversa primeiro para validar propriedade
    const conversationRef = db
      .collection('admins')
      .doc(adminUid)
      .collection('conversations')
      .doc(conversationId);

    const snapshot = await conversationRef.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { error: 'Conversa não encontrada', success: false },
        { status: 404 }
      );
    }

    const data = snapshot.data();
    if (!validateOwnership(data, adminUid)) {
      return NextResponse.json(
        { error: 'Você não tem permissão para deletar esta conversa', success: false },
        { status: 403 }
      );
    }

    await conversationRef.delete();

    console.log('[Conversations API] DELETE/:id - Conversa deletada:', conversationId);

    return NextResponse.json({
      success: true,
      message: 'Conversa deletada com sucesso',
      conversationId
    });
  } catch (error) {
    console.error('[Conversations API] Erro no DELETE/:id:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar conversa', success: false },
      { status: 500 }
    );
  }
}
