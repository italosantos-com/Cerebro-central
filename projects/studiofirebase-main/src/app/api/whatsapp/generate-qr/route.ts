import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { whatsappService } from '@/services/whatsapp-business-service';

const DEFAULT_PREFILLED_MESSAGE =
  process.env.WHATSAPP_QR_PREFILLED_MESSAGE?.trim() ||
  'Olá! Gostaria de mais informações.';

export async function POST(request: NextRequest) {
  const authResult = await requireAdminApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  let body: any;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const prefilledMessage =
    typeof body.prefilledMessage === 'string'
      ? body.prefilledMessage.trim()
      : DEFAULT_PREFILLED_MESSAGE;

  const generateQrImage =
    body.generateQrImage === 'SVG' || body.generateQrImage === 'PNG'
      ? body.generateQrImage
      : 'PNG';

  const code = typeof body.code === 'string' && body.code.trim() ? body.code.trim() : undefined;

  if (!prefilledMessage) {
    return NextResponse.json(
      { success: false, message: 'prefilledMessage é obrigatório' },
      { status: 400 }
    );
  }

  if (prefilledMessage.length > 140) {
    return NextResponse.json(
      {
        success: false,
        message: 'prefilledMessage deve ter no máximo 140 caracteres',
      },
      { status: 400 }
    );
  }

  const configStatus = whatsappService.getConfigStatus();
  if (!configStatus.ok) {
    const missingList = configStatus.missing.join(', ');
    return NextResponse.json(
      {
        success: false,
        message: missingList
          ? `Configuração do WhatsApp Business incompleta. Defina: ${missingList}.`
          : 'Configuração do WhatsApp Business incompleta.',
        missing: configStatus.missing,
      },
      { status: 422 }
    );
  }

  try {
    const qr = await whatsappService.createMessageQrCode({
      prefilledMessage,
      generateQrImage,
      code,
    });

    return NextResponse.json({
      success: true,
      qr,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Erro ao gerar QR code';
    const status = typeof error?.status === 'number' ? error.status : 500;
    const details = error?.details;
    return NextResponse.json(
      { success: false, message, details },
      { status }
    );
  }
}
