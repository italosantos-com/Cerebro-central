import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const fallback = {
    convertedAmount: 99,
    currencyCode: 'BRL',
    currencySymbol: 'R$',
    locale: 'pt-BR',
  };

  try {
    const { initializeLocalization } = await import('@/ai/flows/localization-flow');

    const body = await req.json().catch(() => ({}));
    const explicitLocale: string | undefined = body.locale;
    const baseAmountBRL: number = typeof body.baseAmountBRL === 'number' ? body.baseAmountBRL : 99.00;

    fallback.convertedAmount = baseAmountBRL;
    fallback.locale = explicitLocale || fallback.locale;

    const result = await initializeLocalization({
      baseAmountBRL,
      explicitLocale,
      translate: true,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      fallback: true,
      error: e?.message || 'Localization init failed',
      ...fallback,
    });
  }
}

export async function GET() {
  // Simple health check
  return NextResponse.json({ status: 'ok', flow: 'localizationFlow' });
}
