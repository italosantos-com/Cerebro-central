// NOTE: Client-side service; keep it framework-agnostic and configurable via env
import { sendSmsOtp, verifySmsOtp } from '@/services/firebase-sms-service';

let smsConfirmationResult: Awaited<ReturnType<typeof sendSmsOtp>>['confirmationResult'] | null = null;

interface VerificationResponse {
  success: boolean;
  message: string;
  mode?: string;
  ttlSeconds?: number;
}

/**
 * Envia um código de verificação para um e-mail ou número de telefone.
 * @param type 'email' ou 'sms'
 * @param recipient O endereço de e-mail ou número de telefone.
 * @returns Promise<VerificationResponse>
 */
export const sendVerificationCode = async (type: 'email' | 'sms', recipient: string): Promise<VerificationResponse> => {
  console.log(`[VerificationService] Enviando código do tipo '${type}' para '${recipient}'...`);
  
  try {
    if (type === 'email') {
      // Fluxo de E-mail: Chama a API interna do Next.js
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'verify-email',
          email: recipient
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao enviar e-mail');
      }

      return { success: true, message: 'E-mail de verificação enviado.' };
    } 
    
    if (type === 'sms') {
      // Fluxo de SMS: Firebase Phone Auth (sem API key)
      const { confirmationResult } = await sendSmsOtp(recipient, 'recaptcha-container');
      smsConfirmationResult = confirmationResult;

      return {
        success: true,
        message: 'SMS enviado com sucesso.'
      };
    }

    throw new Error('Tipo de verificação inválido');

  } catch (error: any) {
    console.error(`[VerificationService] Falha ao enviar código para ${recipient}:`, error);
    return { success: false, message: error.message || 'Ocorreu um erro desconhecido.' };
  }
};

/**
 * Verifica um código recebido por e-mail ou SMS.
 * @param recipient O endereço de e-mail ou número de telefone que recebeu o código.
 * @param code O código a ser verificado.
 * @returns Promise<VerificationResponse>
 */
export const verifyCode = async (recipient: string, code: string): Promise<VerificationResponse> => {
  console.log(`[VerificationService] Verificando código '${code}' para '${recipient}'...`);
  
  // Apenas SMS suporta verificação de código OTP neste fluxo
  // E-mail usa link de verificação (Firebase Auth)
  
  try {
    if (!smsConfirmationResult) {
      throw new Error('Sessão de verificação expirada. Solicite um novo SMS.');
    }

    const result = await verifySmsOtp(smsConfirmationResult, code);
    if (!result.success) {
      throw new Error(result.message);
    }

    return { success: true, message: result.message };

  } catch (error: any) {
    console.error(`[VerificationService] Falha ao verificar o código para ${recipient}:`, error);
    return { success: false, message: error.message || 'Ocorreu um erro desconhecido.' };
  }
};
