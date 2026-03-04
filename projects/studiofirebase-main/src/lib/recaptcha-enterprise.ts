/**
 * reCAPTCHA v2 - Simple Checkbox
 * 
 * Verificação simples e confiável do reCAPTCHA
 */

export interface RecaptchaAssessmentOptions {
    token: string;
    action?: string;
}

export interface RecaptchaAssessmentResult {
    success: boolean;
    score?: number;
    reasons?: string[];
    action?: string;
    valid: boolean;
    invalidReason?: string;
}

/**
 * Verifica o token do reCAPTCHA v2 no servidor
 * 
 * @param options - Token do reCAPTCHA
 * @returns Resultado da verificação
 */
export async function createRecaptchaAssessment(
    options: RecaptchaAssessmentOptions
): Promise<RecaptchaAssessmentResult> {
    const {
        token,
        action = 'submit'
    } = options;

    try {
        if (!token) {
            return {
                success: false,
                valid: false,
                invalidReason: 'Token não fornecido',
                reasons: ['Token ausente']
            };
        }

        // Chamar API de verificação do reCAPTCHA v2
        const secretKey = process.env.RECAPTCHA_SECRET_KEY;
        
        if (!secretKey) {
            console.warn('[reCAPTCHA] RECAPTCHA_SECRET_KEY não configurado');
            // Em desenvolvimento, passar
            if (process.env.NODE_ENV !== 'production') {
                return {
                    success: true,
                    valid: true,
                    score: 0.9,
                    action
                };
            }
        }

        const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `secret=${secretKey}&response=${token}`,
        });

        const data = await response.json();

        if (!data.success) {
            return {
                success: false,
                valid: false,
                invalidReason: 'Verificação reCAPTCHA falhou',
                reasons: data['error-codes'] || ['unknown_error']
            };
        }

        return {
            success: true,
            valid: true,
            score: data.score || 0.5,
            action: action
        };
    } catch (error: any) {
        console.error('[reCAPTCHA] Erro ao verificar token:', error);
        return {
            success: false,
            valid: false,
            invalidReason: error.message || 'Erro ao verificar reCAPTCHA',
            reasons: ['verification_error']
        };
    }
}

/**
 * Verifica se o reCAPTCHA foi validado
 */
export async function verifyRecaptchaToken(token: string): Promise<boolean> {
    const result = await createRecaptchaAssessment({ token });
    return result.success && result.valid;
}

/**
 * Verifica se a pontuação do reCAPTCHA é aceitável
 */
export function isScoreAcceptable(score: number | null, threshold: number = 0.5): boolean {
    if (score === null) return false;
    return score >= threshold;
}

/**
 * Obtém recomendação de ação baseada na pontuação
 */
export function getScoreRecommendation(score: number | null): {
    action: 'allow' | 'challenge' | 'block';
    message: string;
} {
    if (score === null) {
        return {
            action: 'block',
            message: 'Token inválido ou avaliação falhou',
        };
    }

    if (score >= 0.7) {
        return {
            action: 'allow',
            message: 'Interação muito provavelmente legítima',
        };
    }

    if (score >= 0.5) {
        return {
            action: 'allow',
            message: 'Interação provavelmente legítima',
        };
    }

    if (score >= 0.3) {
        return {
            action: 'challenge',
            message: 'Interação suspeita - considere desafio adicional',
        };
    }

    return {
        action: 'block',
        message: 'Interação muito provavelmente suspeita',
    };
}

