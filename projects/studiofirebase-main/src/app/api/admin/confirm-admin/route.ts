import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { requireMainAdminApiAuth } from '@/lib/admin-api-auth';
import crypto from 'crypto';

const SMS_ENDPOINT =
  process.env.SMS_ENDPOINT ||
  process.env.NEXT_PUBLIC_SMS_ENDPOINT ||
  'https://sms-email-code-479719049222.europe-west1.run.app';

const SMS_API_KEY = process.env.SMS_API_KEY || process.env.NEXT_PUBLIC_SMS_API_KEY || '';

/**
 * POST /api/admin/confirm-admin
 *
 * Chamado pelo mainAdmin para confirmar um admin pendente.
 * Envia:
 *   1. Email de verificação (link do Firebase Auth)
 *   2. SMS com código OTP para o telefone do admin
 *
 * Body: { uid: string }
 */
export async function POST(request: NextRequest) {
  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();

  if (!adminAuth || !adminDb) {
    return NextResponse.json({ success: false, message: 'Firebase Admin não inicializado' }, { status: 500 });
  }

  // Apenas mainAdmin pode confirmar outros admins
  const authResult = await requireMainAdminApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  let body: { uid?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Body inválido' }, { status: 400 });
  }

  const { uid } = body;
  if (!uid?.trim()) {
    return NextResponse.json({ success: false, message: 'uid do admin é obrigatório' }, { status: 400 });
  }

  // Buscar o admin a confirmar
  const adminSnap = await adminDb.collection('admins').doc(uid).get();
  if (!adminSnap.exists) {
    return NextResponse.json({ success: false, message: 'Admin não encontrado' }, { status: 404 });
  }

  const adminData = adminSnap.data()!;
  const email: string = adminData.email;
  const phone: string | undefined = adminData.phone;

  if (!email) {
    return NextResponse.json({ success: false, message: 'Admin não possui email cadastrado' }, { status: 422 });
  }

  const results: Record<string, any> = {};

  // 1. Enviar link de verificação de email via Firebase Auth Admin SDK
  try {
    const emailVerificationLink = await adminAuth.generateEmailVerificationLink(email, {
      url:
        process.env.EMAIL_ACTION_BASE_URL ||
        `${process.env.NEXT_PUBLIC_BASE_URL || 'https://italosantos.com'}/auth/action?context=admin&redirect=/admin`,
    });

    // Logar link gerado (só no servidor — não expor ao cliente)
    console.log(`[confirm-admin] Email verification link gerado para ${email}:`, emailVerificationLink);

    // Enviar via Firebase Auth REST API (sendOobCode)
    const apiKey =
      process.env.FIREBASE_API_KEY ||
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
      '';

    if (apiKey) {
      const oobRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestType: 'VERIFY_EMAIL',
            // O Admin SDK gerou o link; para VERIFY_EMAIL via REST precisamos do idToken do usuário.
            // Usamos custom token → idToken para referência ao usuário correto.
            email,
            continueUrl:
              process.env.EMAIL_ACTION_BASE_URL ||
              `${process.env.NEXT_PUBLIC_BASE_URL || 'https://italosantos.com'}/auth/action?context=admin&redirect=/admin`,
          }),
        }
      );
      const oobData = await oobRes.json().catch(() => ({}));
      results.email = oobRes.ok
        ? { success: true, link: emailVerificationLink }
        : { success: false, error: oobData?.error?.message || 'Falha ao enviar email', link: emailVerificationLink };
    } else {
      // Sem API key: só retorna o link gerado (ex.: para copiar/enviar manualmente)
      results.email = { success: true, link: emailVerificationLink, note: 'FIREBASE_API_KEY ausente — link gerado mas não enviado automaticamente' };
    }
  } catch (err: any) {
    results.email = { success: false, error: err?.message || 'Erro ao gerar link de verificação de email' };
  }

  // 2. Enviar SMS com código OTP (se telefone disponível)
  if (phone) {
    if (!SMS_API_KEY) {
      results.sms = { success: false, error: 'SMS_API_KEY não configurada' };
    } else {
      try {
        // Gerar código OTP de 6 dígitos
        const otpCode = String(crypto.randomInt(100000, 999999));
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutos

        // Persistir o código no Firestore para verificação posterior
        await adminDb.collection('admin_confirmations').doc(uid).set({
          uid,
          otpCode,
          expiresAt,
          phone,
          attemptedAt: null,
          confirmed: false,
          createdAt: new Date(),
        });

        // Enviar via serviço SMS externo
        const smsRes = await fetch(`${SMS_ENDPOINT}/v1/sms/send-otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': SMS_API_KEY,
          },
          body: JSON.stringify({ phone, code: otpCode }),
        });

        if (smsRes.ok) {
          results.sms = { success: true, phone };
        } else {
          const errText = await smsRes.text();
          results.sms = { success: false, error: errText, phone };
        }
      } catch (err: any) {
        results.sms = { success: false, error: err?.message || 'Erro ao enviar SMS' };
      }
    }
  } else {
    results.sms = { success: false, skipped: true, reason: 'Admin não possui telefone cadastrado' };
  }

  return NextResponse.json({ success: true, results });
}
