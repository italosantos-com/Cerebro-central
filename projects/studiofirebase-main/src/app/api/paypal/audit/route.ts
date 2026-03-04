import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

/**
 * Rota de auditoria de eventos PayPal.
 * Permite persistir createOrder/capture para verificação posterior.
 * Enviar via POST JSON: { stage: 'createOrder' | 'capture' | 'error', currency, amount, description, orderId?, payerEmail?, meta? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stage, currency, amount, description, orderId, payerEmail, meta } = body || {};

    if (!stage || typeof stage !== 'string') {
      return NextResponse.json({ success: false, error: 'stage inválido' }, { status: 400 });
    }

    // Monta payload básico
    const payload = {
      stage,
      currency: typeof currency === 'string' ? currency : null,
      amount: typeof amount === 'number' ? amount : null,
      description: typeof description === 'string' ? description : null,
      orderId: typeof orderId === 'string' ? orderId : null,
      payerEmail: typeof payerEmail === 'string' ? payerEmail : null,
      meta: meta ?? null,
      ts: Date.now(),
      isoDate: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, 'paypal_audit'), payload);
    } catch (fireErr) {
      console.warn('[paypal][audit] Falha ao gravar Firestore, seguindo sem bloquear fluxo:', fireErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[paypal][audit] erro', err);
    return NextResponse.json({ success: false, error: 'Erro interno auditoria' }, { status: 500 });
  }
}
