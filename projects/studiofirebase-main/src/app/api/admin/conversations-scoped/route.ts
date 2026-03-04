/**
 * API: GET/POST - Conversas do Admin (Isoladas)
 * 
 * Rotas:
 * - GET  /api/admin/conversations              - Listar conversas do admin
 * - POST /api/admin/conversations              - Criar nova conversa
 * - GET  /api/admin/conversations/:id          - Obter conversa específica (veja [id]/route.ts)
 * - PUT  /api/admin/conversations/:id          - Atualizar conversa (veja [id]/route.ts)
 * - DELETE /api/admin/conversations/:id        - Deletar conversa (veja [id]/route.ts)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import {
  extractAdminUidFromRequest
} from '@/lib/admin-api-middleware';

// GET - Listar conversas do admin autenticado
export async function GET(request: NextRequest) {
  try {
    const { adminUid, error: authError } = await extractAdminUidFromRequest(request);
    
    if (!adminUid) {
      return NextResponse.json(
        { error: authError || 'Não autenticado', success: false },
        { status: 401 }
      );
    }

    console.log('[Conversations API] GET - Listando para admin:', adminUid);

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Firebase DB não inicializado', success: false },
        { status: 500 }
      );
    }

    // Query scoped: buscar apenas conversas deste admin
    const snapshot = await db
      .collection('admins')
      .doc(adminUid)
      .collection('conversations')
      .orderBy('updatedAt', 'desc')
      .get();

    const conversations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`[Conversations API] Encontradas ${conversations.length} conversas`);

    return NextResponse.json({
      success: true,
      count: conversations.length,
      conversations
    });
  } catch (error) {
    console.error('[Conversations API] Erro no GET:', error);
    return NextResponse.json(
      { error: 'Erro ao listar conversas', success: false },
      { status: 500 }
    );
  }
}

// POST - Criar nova conversa
export async function POST(request: NextRequest) {
  try {
    const { adminUid, error: authError } = await extractAdminUidFromRequest(request);
    
    if (!adminUid) {
      return NextResponse.json(
        { error: authError || 'Não autenticado', success: false },
        { status: 401 }
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

    if (!title) {
      return NextResponse.json(
        { error: 'Título é obrigatório', success: false },
        { status: 400 }
      );
    }

    // Preparar dados com escopo de admin
    const conversationData = {
      title,
      description: description || '',
      visibility: visibility || 'private', // 'private' | 'public' | 'subscribers'
      tags: tags || [],
      adminUid, // Sempre adicionar adminUid
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
      lastMessageAt: null,
      participants: [adminUid]
    };

    // Salvar em admins/{adminUid}/conversations/{conversationId}
    const docRef = await db
      .collection('admins')
      .doc(adminUid)
      .collection('conversations')
      .add(conversationData);

    console.log('[Conversations API] Conversa criada:', docRef.id);

    return NextResponse.json({
      success: true,
      message: 'Conversa criada com sucesso',
      conversationId: docRef.id,
      data: { id: docRef.id, ...conversationData }
    }, { status: 201 });
  } catch (error) {
    console.error('[Conversations API] Erro no POST:', error);
    return NextResponse.json(
      { error: 'Erro ao criar conversa', success: false },
      { status: 500 }
    );
  }
}


