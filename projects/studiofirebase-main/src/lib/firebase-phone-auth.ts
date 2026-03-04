import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

let recaptchaVerifier: RecaptchaVerifier | null = null;

export async function sendPhoneVerificationCode(phoneNumber: string, containerId: string = 'recaptcha-container'): Promise<ConfirmationResult> {
    const auth = getAuth();

    // Basic diagnostics
    if (typeof window !== 'undefined') {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container reCAPTCHA '${containerId}' não encontrado no DOM.`);
        }
    }

    if (!recaptchaVerifier) {
        const RecaptchaVerifierCtor = RecaptchaVerifier as unknown as {
            new(...args: any[]): RecaptchaVerifier;
        };
        recaptchaVerifier = new RecaptchaVerifierCtor(
            auth,
            containerId,
            {
                size: 'invisible',
                callback: () => {
                    // reCAPTCHA resolved
                },
            }
        );
    }

    return await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
}

export async function verifyPhoneCode(confirmationResult: ConfirmationResult, code: string) {
    try {
        const result = await confirmationResult.confirm(code);
        return { success: true, user: result.user };
    } catch (err) {
        return { success: false, error: 'Código inválido' };
    }
}
