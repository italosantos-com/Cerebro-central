/**
 * API Route: Verificar token do reCAPTCHA v2
 * POST /api/recaptcha/verify
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRecaptchaAssessment } from '@/lib/recaptcha-enterprise';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, action = 'submit' } = body;

        console.log(`[reCAPTCHA API] Verificando token para ação: ${action}`);

        // Validar campos obrigatórios
        if (!token) {
            return NextResponse.json(
                { success: false, valid: false, error: 'token é obrigatório' },
                { status: 400 }
            );
        }

        // Verificar token usando a função do lib/recaptcha-enterprise.ts
        const result = await createRecaptchaAssessment({ token, action });

        console.log(`[reCAPTCHA API] Resultado:`, result);

        return NextResponse.json({
            success: result.success,
            valid: result.valid,
            score: result.score,
            error: result.invalidReason,
        });

    } catch (error) {
        console.error('[reCAPTCHA API] Erro:', error);

        return NextResponse.json(
            {
                success: false,
                valid: false,
                error: 'Erro ao verificar reCAPTCHA',
                details: error instanceof Error ? error.message : 'Erro desconhecido'
            },
            { status: 500 }
        );
    }
}
