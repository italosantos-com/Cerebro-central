import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { isInternalRequest } from '@/lib/internal-service-auth';

export async function POST(request: NextRequest) {
  const internal = isInternalRequest(request);
  const authResult = internal ? null : await requireAdminApiAuth(request);
  if (!internal && authResult instanceof NextResponse) return authResult;
  const authUid = authResult && !(authResult instanceof NextResponse) ? authResult.uid : null;

  try {
    const body = await request.json();
    const { target, channel, message, mediaUrl, adminUid } = body || {};

    if (!target || !channel || !message) {
      return NextResponse.json(
        { success: false, message: 'target, channel e message são obrigatórios' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        { success: false, message: 'Firebase Admin não inicializado' },
        { status: 500 }
      );
    }

    // Implementação mínima: apenas enfileira um broadcast para processamento assíncrono.
    // Isso permite que a tool exista e seja testável sem disparar envios reais diretamente.
    const now = new Date();
    const docRef = await adminDb.collection('broadcast_queue').add({
      adminUid: authUid || adminUid || 'system',
      target: String(target),
      channel: String(channel),
      message: String(message),
      mediaUrl: typeof mediaUrl === 'string' ? mediaUrl : null,
      status: 'queued',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: {
        broadcastId: docRef.id,
        status: 'queued',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Erro ao processar broadcast' },
      { status: 500 }
    );
  }
}
