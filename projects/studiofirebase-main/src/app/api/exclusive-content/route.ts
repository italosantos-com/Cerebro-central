import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { YouTubeAccessService } from '@/services/youtubeAccessService';

const PROHIBITED_TERMS = [
  'pedofilia',
  'pedofilo',
  'pedophile',
  'child sex',
  'minor sex',
  'underage',
  'zoofilia',
  'zoofilo',
  'bestiality',
  'beastiality'
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasProhibitedContent(data: Record<string, any>): boolean {
  const title = typeof data.title === 'string' ? data.title : '';
  const description = typeof data.description === 'string' ? data.description : '';
  const tags = Array.isArray(data.tags) ? data.tags.join(' ') : '';
  const combined = normalizeText([title, description, tags].join(' '));
  return PROHIBITED_TERMS.some((term) => combined.includes(term));
}

// Função para verificar se o usuário é assinante ativo (mesma lógica unificada)
async function checkUserSubscription(userId: string): Promise<boolean> {
  try {
    const adminDb = getAdminDb();
    // 1. Verificar na coleção 'users' (mesma fonte dos usuários)
    if (adminDb) {
      try {
        const usersRef = adminDb.collection('users');

        // Tentar buscar por UID primeiro
        let userQuery = await usersRef.where('uid', '==', userId).get();

        // Se não encontrar por UID, tentar por email
        if (userQuery.empty) {
          userQuery = await usersRef.where('email', '==', userId).get();
        }

        if (!userQuery.empty) {
          const userDoc = userQuery.docs[0];
          const userData = userDoc.data();

          // Verificar se tem isSubscriber ou subscriptionStatus
          if (userData?.isSubscriber === true || userData?.subscriptionStatus === 'active') {
            console.log('[Exclusive Content API] Usuário ativo encontrado na coleção users:', userId);
            return true;
          }
        }
      } catch (error) {
        console.error('[Exclusive Content API] Erro ao verificar perfil do usuário:', error);
      }
    }

    // 2. Verificar na coleção 'subscribers' (mesma fonte dos pagamentos)
    if (adminDb) {
      try {
        const subscribersRef = adminDb.collection('subscribers');

        // Tentar buscar por userId primeiro
        let subscriberSnapshot = await subscribersRef
          .where('userId', '==', userId)
          .where('status', '==', 'active')
          .get();

        // Se não encontrar por userId, tentar por email
        if (subscriberSnapshot.empty) {
          subscriberSnapshot = await subscribersRef
            .where('email', '==', userId)
            .where('status', '==', 'active')
            .get();
        }

        if (!subscriberSnapshot.empty) {
          console.log('[Exclusive Content API] Assinante ativo encontrado na coleção subscribers:', userId);
          return true;
        }
      } catch (error) {
        console.error('[Exclusive Content API] Erro ao verificar Firestore:', error);
      }
    }

    console.log('[Exclusive Content API] Usuário não é assinante ativo:', userId);
    return false;
  } catch (error) {
    console.error('[Exclusive Content API] Erro geral ao verificar assinatura:', error);
    return false;
  }
}

function extractEmail(value: string) {
  return value.includes('@') ? value : null;
}

async function getUnlockedContentIds(adminDb: FirebaseFirestore.Firestore, userId: string) {
  try {
    const unlocksRef = adminDb.collection('exclusiveContentUnlocks');
    const ids = new Set<string>();

    const directSnap = await unlocksRef.where('userId', '==', userId).get();
    directSnap.docs.forEach((doc) => ids.add(doc.get('contentId')));

    const email = extractEmail(userId);
    if (email) {
      const emailSnap = await unlocksRef.where('email', '==', email).get();
      emailSnap.docs.forEach((doc) => ids.add(doc.get('contentId')));
    }

    return ids;
  } catch (error) {
    console.error('[Exclusive Content API] Erro ao buscar desbloqueios:', error);
    return new Set<string>();
  }
}

// GET - Buscar conteúdo exclusivo para assinantes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl || new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type'); // 'photo', 'video', ou null para todos
    const adminUidParam = searchParams.get('adminUid'); // Para isolar por admin

    console.log('[Exclusive Content API] GET request - userId:', userId, 'type:', type, 'adminUid:', adminUidParam);

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'userId é obrigatório'
      }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      console.error('[Exclusive Content API] adminDb não disponível');
      return NextResponse.json({
        success: false,
        message: 'Erro interno do servidor - adminDb não disponível'
      }, { status: 500 });
    }

    // Verificar se o usuário é um assinante ativo
    const isSubscriber = await checkUserSubscription(userId);

    // Sincronizar acesso do YouTube privado para assinantes ativos
    // (a lista é usada como fonte oficial de permitidos no sistema)
    const userEmail = extractEmail(userId);
    if (isSubscriber && userEmail) {
      try {
        await YouTubeAccessService.grantAccess(userEmail, undefined, undefined);
      } catch (syncError) {
        console.error('[Exclusive Content API] Falha ao sincronizar acesso YouTube:', syncError);
      }
    }

    const unlockedIds = await getUnlockedContentIds(adminDb, userId);

    // Buscar conteúdo exclusivo ativo, filtrando por adminUid quando fornecido
    let contentQuery: any = adminDb.collection('exclusiveContent').where('isActive', '==', true);
    if (adminUidParam) {
      contentQuery = contentQuery.where('adminUid', '==', adminUidParam);
    }
    const contentSnapshot = await contentQuery.get();

    const prohibitedIds = new Set<string>();

    // Mapear e ordenar em memória
    let content = contentSnapshot.docs
      .map(doc => {
        const data = doc.data();
        if (hasProhibitedContent(data)) {
          prohibitedIds.add(doc.id);
          return null;
        }
        const isUnlocked = unlockedIds.has(doc.id);
        const canAccess = isSubscriber || isUnlocked;
        return {
          id: doc.id,
          title: data.title,
          description: data.description,
          type: data.type,
          url: canAccess ? data.url : '',
          thumbnailUrl: data.thumbnailUrl || data.url || '',
          tags: data.tags || [],
          viewCount: data.viewCount || 0,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          isUnlocked,
          locked: !canAccess,
          _createdAtMs: data.createdAt?.toDate?.()?.getTime?.() || 0
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => b._createdAtMs - a._createdAtMs) // Ordenar em memória (mais recente primeiro)
      .map(({ _createdAtMs, ...item }) => item); // Remover campo temporário

    if (prohibitedIds.size > 0) {
      await Promise.all(
        Array.from(prohibitedIds).map((contentId) =>
          adminDb.collection('security_events').add({
            eventType: 'prohibited_content_blocked',
            scope: 'exclusive',
            contentId,
            createdAt: new Date().toISOString(),
          })
        )
      );
    }

    // Filtro de tipo em memória para evitar índice composto
    if (type && (type === 'photo' || type === 'video')) {
      content = content.filter(item => item.type === type);
    }

    console.log('[Exclusive Content API] Retornando', content.length, 'itens de conteúdo');

    return NextResponse.json({
      success: true,
      content,
      isSubscriber,
      requiresSubscription: !isSubscriber,
      message: `${content.length} itens encontrados`
    });

  } catch (error) {
    console.error('[Exclusive Content API] Erro ao buscar conteúdo:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      isSubscriber: false
    }, { status: 500 });
  }
}

// POST - Registrar visualização de conteúdo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentId, userId } = body;

    if (!contentId || !userId) {
      return NextResponse.json({
        success: false,
        message: 'contentId e userId são obrigatórios'
      }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({
        success: false,
        message: 'Erro interno do servidor'
      }, { status: 500 });
    }

    // Verificar se o usuário é um assinante ativo ou já desbloqueou este item
    const isSubscriber = await checkUserSubscription(userId);
    if (!isSubscriber) {
      const unlockedIds = await getUnlockedContentIds(adminDb, userId);
      if (!unlockedIds.has(contentId)) {
        return NextResponse.json({
          success: false,
          message: 'Usuário não autorizado'
        }, { status: 403 });
      }
    }

    // Incrementar contador de visualizações
    const contentRef = adminDb.collection('exclusiveContent').doc(contentId);
    await contentRef.update({
      viewCount: FieldValue.increment(1),
      lastViewedAt: new Date()
    });

    console.log('[Exclusive Content API] Visualização registrada - contentId:', contentId, 'userId:', userId);

    return NextResponse.json({
      success: true,
      message: 'Visualização registrada'
    });

  } catch (error) {
    console.error('[Exclusive Content API] Erro ao registrar visualização:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao registrar visualização'
    }, { status: 500 });
  }
}