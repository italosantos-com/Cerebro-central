import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

function extractEmail(value: string) {
  return value.includes('@') ? value : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentId, userId, paymentMethod, amount } = body || {};

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

    const email = extractEmail(String(userId));
    const nowIso = new Date().toISOString();

    const payload = {
      contentId: String(contentId),
      userId: String(userId),
      email: email || null,
      paymentMethod: paymentMethod ? String(paymentMethod) : 'unknown',
      amount: typeof amount === 'number' ? amount : null,
      status: 'paid',
      createdAt: new Date(),
      createdAtIso: nowIso,
    };

    const docRef = await adminDb.collection('exclusiveContentUnlocks').add(payload);

    return NextResponse.json({
      success: true,
      id: docRef.id,
    });
  } catch (error: any) {
    console.error('[Exclusive Content Unlock] Erro ao desbloquear:', error);
    return NextResponse.json({
      success: false,
      message: error?.message || 'Erro ao registrar desbloqueio'
    }, { status: 500 });
  }
}
