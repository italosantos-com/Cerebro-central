import { NextApiRequest, NextApiResponse } from 'next';
/**
 * Utilitários para verificação de tokens reCAPTCHA Enterprise no servidor
 */

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'projeto-italo-bc5ef';

interface RecaptchaEnterpriseAssessment {
    riskAnalysis: {
        score: number;
        reasons: string[];
    };
    tokenProperties: {
        valid: boolean;
        invalidReason?: string;
        hostname: string;
        action: string;
        createTime: string;
    };
    accountDefenderAssessment?: {
        labels: string[];
    };
}

interface VerifyRecaptchaResult {
    success: boolean;
    score: number;
    action: string;
    hostname: string;
    error?: string;
    assessment?: RecaptchaEnterpriseAssessment;
}

/**
 * Verifica token reCAPTCHA Enterprise usando Google Cloud API
 * 
 * @param token - Token reCAPTCHA recebido do cliente
 * @param expectedAction - Ação esperada (opcional)
 * @param minimumScore - Score mínimo aceito (0.0-1.0, padrão: 0.5)
 * @returns Resultado da verificação
 */
export async function verifyRecaptchaEnterprise(
    token: string,
    expectedAction?: string,
    minimumScore: number = 0.5
): Promise<VerifyRecaptchaResult> {
    if (!RECAPTCHA_SECRET_KEY) {
        console.error('[reCAPTCHA Enterprise] RECAPTCHA_SECRET_KEY não configurada');
        return {
            success: false,
            score: 0,
            action: '',
            hostname: '',
            error: 'Chave secreta não configurada'
        };
    }

    if (!token) {
        return {
            success: false,
            score: 0,
            action: '',
            hostname: '',
            error: 'Token reCAPTCHA é obrigatório'
        };
    }

    try {
        // URL da API Enterprise
        const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${PROJECT_ID}/assessments?key=${RECAPTCHA_SECRET_KEY}`;

        const requestBody = {
            event: {
                token: token,
                expectedAction: expectedAction || undefined,
                siteKey: process.env.RECAPTCHA_ENTERPRISE_SITE_KEY || process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[reCAPTCHA Enterprise] Erro na API:', response.status, errorText);
            return {
                success: false,
                score: 0,
                action: '',
                hostname: '',
                error: `Erro na API: ${response.status}`
            };
        }

        const assessment: RecaptchaEnterpriseAssessment = await response.json();

        // Verificar se o token é válido
        if (!assessment.tokenProperties?.valid) {
            console.warn('[reCAPTCHA Enterprise] Token inválido:', assessment.tokenProperties?.invalidReason);
            return {
                success: false,
                score: 0,
                action: assessment.tokenProperties?.action || '',
                hostname: assessment.tokenProperties?.hostname || '',
                error: `Token inválido: ${assessment.tokenProperties?.invalidReason}`,
                assessment
            };
        }

        // Verificar ação se especificada
        if (expectedAction && assessment.tokenProperties.action !== expectedAction) {
            console.warn('[reCAPTCHA Enterprise] Ação não coincide:', {
                expected: expectedAction,
                actual: assessment.tokenProperties.action
            });
            return {
                success: false,
                score: assessment.riskAnalysis?.score || 0,
                action: assessment.tokenProperties.action,
                hostname: assessment.tokenProperties.hostname,
                error: 'Ação não coincide com o esperado',
                assessment
            };
        }

        // Verificar score
        const score = assessment.riskAnalysis?.score || 0;
        if (score < minimumScore) {
            console.warn('[reCAPTCHA Enterprise] Score muito baixo:', {
                score,
                minimumScore,
                reasons: assessment.riskAnalysis?.reasons
            });
            return {
                success: false,
                score,
                action: assessment.tokenProperties.action,
                hostname: assessment.tokenProperties.hostname,
                error: `Score muito baixo: ${score} (mínimo: ${minimumScore})`,
                assessment
            };
        }

        console.log('[reCAPTCHA Enterprise] Verificação bem-sucedida:', {
            score,
            action: assessment.tokenProperties.action,
            hostname: assessment.tokenProperties.hostname
        });

        return {
            success: true,
            score,
            action: assessment.tokenProperties.action,
            hostname: assessment.tokenProperties.hostname,
            assessment
        };

    } catch (error) {
        console.error('[reCAPTCHA Enterprise] Erro na verificação:', error);
        return {
            success: false,
            score: 0,
            action: '',
            hostname: '',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
        };
    }
}

/**
 * Middleware de verificação reCAPTCHA para routes API
 */
export function withRecaptchaEnterprise(
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
    options: {
        tokenField?: string;
        actionField?: string;
        expectedAction?: string;
        minimumScore?: number;
    } = {}
) {
    const {
        tokenField = 'recaptchaToken',
        actionField = 'action',
        expectedAction,
        minimumScore = 0.5
    } = options;

    return async (req: NextApiRequest, res: NextApiResponse) => {
        // Extrair token do corpo da requisição
        const token = req.body?.[tokenField];
        const action = expectedAction || req.body?.[actionField];

        if (!token) {
            return res.status(400).json({
                error: 'Token reCAPTCHA é obrigatório',
                code: 'RECAPTCHA_TOKEN_REQUIRED'
            });
        }

        // Verificar reCAPTCHA
        const result = await verifyRecaptchaEnterprise(token, action, minimumScore);

        if (!result.success) {
            return res.status(400).json({
                error: 'Verificação reCAPTCHA falhou',
                code: 'RECAPTCHA_VERIFICATION_FAILED',
                details: result.error
            });
        }

        // Adicionar resultado ao objeto req para uso posterior
        req.recaptcha = result;

        // Prosseguir com o handler original
        return handler(req, res);
    };
}

/**
 * Utilitário para uso em Server Components/Actions
 */
export async function validateRecaptchaToken(
    token: string,
    expectedAction?: string,
    minimumScore: number = 0.5
): Promise<{ success: boolean; error?: string; score?: number }> {
    const result = await verifyRecaptchaEnterprise(token, expectedAction, minimumScore);

    if (result.success) {
        return { success: true, score: result.score };
    } else {
        return { success: false, error: result.error };
    }
}

// Tipos para TypeScript
export type { RecaptchaEnterpriseAssessment, VerifyRecaptchaResult };