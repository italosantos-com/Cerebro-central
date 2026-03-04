/**
 * API Route: Verificar Status do Pagamento PIX
 * Consulta o status de um pagamento no Mercado Pago
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ paymentId: string }> }
) {
  const params = await props.params;
  try {
    const { paymentId } = params;

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar access token do admin
    const adminApp = getAdminApp();
    if (!adminApp) {
      return NextResponse.json(
        { success: false, error: 'Firebase Admin não configurado' },
        { status: 500 }
      );
    }

    const db = getDatabase(adminApp);
    const tokenSnap = await db.ref('admin/integrations/mercadopago/access_token').get();
    const accessToken = tokenSnap.val();

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Mercado Pago não conectado' },
        { status: 401 }
      );
    }

    // Consultar status no Mercado Pago
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ao consultar pagamento: ${response.status}`);
    }

    const payment = await response.json();

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      status: payment.status, // pending, approved, rejected, cancelled, etc
      statusDetail: payment.status_detail,
      amount: payment.transaction_amount,
      dateApproved: payment.date_approved,
      dateCreated: payment.date_created,
    });
  } catch (error) {
    console.error('[API] Erro ao verificar status do pagamento:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao verificar pagamento',
      },
      { status: 500 }
    );
  }
}
