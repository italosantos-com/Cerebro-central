/**
 * Serviço de SMS com Firebase Phone Authentication
 * 
 * Firebase oferece SMS nativo para autenticação de telefone
 * Vantagens:
 * - Nenhuma integração com Twilio necessária
 * - Autenticação nativa do Firebase
 * - Segurança integrada (reCAPTCHA)
 * - Funciona em todos os países
 * 
 * Documentação: https://firebase.google.com/docs/auth/web/phone-auth
 */

import {
  getAuth,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  PhoneAuthProvider,
  linkWithCredential,
  signOut,
  linkWithPhoneNumber,
  User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

export interface FirebaseSmsConfig {
  recaptchaContainerId?: string;
  recaptchaSize?: 'normal' | 'compact' | 'invisible';
  appVerifier?: RecaptchaVerifier;
}

interface SendOtpResponse {
  verificationId: string;
  confirmationResult: ConfirmationResult;
}

interface VerifyOtpResponse {
  success: boolean;
  message: string;
}

/**
 * Setup do reCAPTCHA para proteção contra bots
 * Necessário antes de enviar OTP
 */
export function setupRecaptchaVerifier(
  containerId: string = 'recaptcha-container',
  size: 'normal' | 'compact' | 'invisible' = 'invisible'
): RecaptchaVerifier {
  try {
    // Evitar múltiplas instâncias
    if ((window as any).recaptchaVerifier) {
      return (window as any).recaptchaVerifier;
    }

    const verifier = new RecaptchaVerifier(
      auth,
      containerId,
      {
        size,
        callback: (response: string) => {
          console.log('[SMS Service] reCAPTCHA validation successful:', response.substring(0, 20) + '...');
        },
        'expired-callback': () => {
          console.warn('[SMS Service] reCAPTCHA expired, please try again');
        },
        'error-callback': (error: Error) => {
          console.error('[SMS Service] reCAPTCHA error:', error);
        },
      }
    );

    (window as any).recaptchaVerifier = verifier;
    return verifier;
  } catch (error) {
    console.error('[SMS Service] Erro ao setup reCAPTCHA:', error);
    throw error;
  }
}

/**
 * Formatar número de telefone para E.164 (ex: +14155552671)
 */
export function formatPhoneNumber(phone: string): string {
  const trimmed = phone.trim();
  const cleaned = trimmed.replace(/\D/g, '');

  // E.164 com +
  if (trimmed.startsWith('+')) {
    return '+' + cleaned;
  }

  // Prefixo internacional 00 -> +
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.slice(2);
  }

  // Se já tem código do Brasil
  if (cleaned.startsWith('55')) {
    return '+' + cleaned;
  }

  // Se tem 10 ou 11 dígitos, assumir Brasil
  if (cleaned.length === 10 || cleaned.length === 11) {
    return '+55' + cleaned;
  }

  // Fallback: tentar adicionar + ao início
  return '+' + cleaned;
}

/**
 * Validar formato de número de telefone
 */
export function isValidPhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone);
  // E.164 format: +[country][number]
  return /^\+\d{10,15}$/.test(formatted);
}

/**
 * Enviar OTP por SMS usando Firebase Phone Auth
 * 
 * @param phoneNumber - Número de telefone (aceita vários formatos)
 * @param recaptchaContainerId - ID do container para reCAPTCHA
 * @returns Dados de verificação para confirmação posterior
 */
export async function sendSmsOtp(
  phoneNumber: string,
  recaptchaContainerId: string = 'recaptcha-container'
): Promise<SendOtpResponse> {
  try {
    console.log('[SMS Service] Enviando OTP para:', phoneNumber.replace(/\d(?=\d{4})/g, '*'));

    // Validar número
    if (!isValidPhoneNumber(phoneNumber)) {
      throw new Error('Formato de telefone inválido. Use E.164 (ex: +14155552671) ou número BR (ex: 11999999999).');
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log('[SMS Service] Número formatado:', formattedPhone);

    // Setup reCAPTCHA
    const verifier = setupRecaptchaVerifier(recaptchaContainerId);

    // Enviar OTP
    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, verifier);
    console.log('[SMS Service] ✅ OTP enviado com sucesso');
    console.log('[SMS Service] Verification ID:', confirmationResult.verificationId.substring(0, 20) + '...');

    return {
      verificationId: confirmationResult.verificationId,
      confirmationResult,
    };
  } catch (error: any) {
    console.error('[SMS Service] Erro ao enviar OTP:', error);
    let message = error.message;
    // Tratamento de erros específicos do Firebase
    if (error.code === 'auth/invalid-phone-number') {
      message = 'Número de telefone inválido';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'Muitas tentativas. Aguarde alguns minutos.';
    } else if (error.code === 'auth/operation-not-allowed') {
      message = 'Autenticação por telefone não está ativada no Firebase';
    } else if (error.message?.includes('recaptcha')) {
      message = 'Erro na validação do reCAPTCHA. Tente novamente.';
    }
    throw new Error(message);
  }
}

/**
 * Verificar código OTP enviado por SMS
 * 
 * @param confirmationResult - Resultado do envio (de sendSmsOtp)
 * @param code - Código OTP recebido pelo usuário (6 dígitos)
 * @returns Usuário autenticado
 */
export async function verifySmsOtp(
  confirmationResult: ConfirmationResult,
  code: string
): Promise<VerifyOtpResponse> {
  try {
    console.log('[SMS Service] Verificando código OTP...');

    // Validar código
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      throw new Error('Código deve conter 6 dígitos');
    }

    // Confirmar código
    const result = await confirmationResult.confirm(code);
    console.log('[SMS Service] ✅ Código verificado com sucesso');
    console.log('[SMS Service] Usuário autenticado:', result.user.uid);

    return {
      success: true,
      message: 'Telefone verificado com sucesso',
    };
  } catch (error: any) {
    console.error('[SMS Service] Erro ao verificar OTP:', error);
    let message = error.message;
    if (error.code === 'auth/invalid-verification-code') {
      message = 'Código inválido ou expirado';
    } else if (error.code === 'auth/code-expired') {
      message = 'Código expirou. Solicite um novo.';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'Muitas tentativas. Aguarde antes de tentar novamente.';
    }
    return {
      success: false,
      message,
    };
  }
}

/**
 * Vincular credencial de telefone a usuário existente
 * Útil após registrar com email/senha
 * 
 * @param confirmationResult - Resultado da verificação de SMS
 * @param code - Código OTP
 * @returns Sucesso da vinculação
 */
export async function linkPhoneCredential(
  confirmationResult: ConfirmationResult,
  code: string
): Promise<VerifyOtpResponse> {
  try {
    console.log('[SMS Service] Vinculando credencial de telefone...');

    const credential = PhoneAuthProvider.credential(
      confirmationResult.verificationId,
      code
    );

    if (!auth.currentUser) {
      throw new Error('Nenhum usuário autenticado');
    }

    await linkWithCredential(auth.currentUser, credential);
    console.log('[SMS Service] ✅ Credencial de telefone vinculada');

    return {
      success: true,
      message: 'Telefone vinculado com sucesso',
    };
  } catch (error: any) {
    console.error('[SMS Service] Erro ao vincular telefone:', error);
    let message = error.message;
    if (error.code === 'auth/credential-already-in-use') {
      message = 'Este número de telefone já está registrado';
    } else if (error.code === 'auth/invalid-verification-code') {
      message = 'Código inválido ou expirado';
    }
    return {
      success: false,
      message,
    };
  }
}

/**
 * Re-enviar código OTP (para novo container reCAPTCHA)
 * Útil quando usuário quer fazer novo envio
 */
export async function resendSmsOtp(
  phoneNumber: string,
  recaptchaContainerId: string = 'recaptcha-container'
): Promise<SendOtpResponse> {
  try {
    // Limpar reCAPTCHA anterior
    if ((window as any).recaptchaVerifier) {
      try {
        (window as any).recaptchaVerifier.clear();
      } catch (e) {
        console.warn('[SMS Service] Erro ao limpar reCAPTCHA anterior:', e);
      }
      delete (window as any).recaptchaVerifier;
    }

    console.log('[SMS Service] Re-enviando OTP...');
    return await sendSmsOtp(phoneNumber, recaptchaContainerId);
  } catch (error) {
    console.error('[SMS Service] Erro ao re-enviar OTP:', error);
    throw error;
  }
}

/**
 * Obter o número de telefone do usuário autenticado
 */
export function getCurrentUserPhoneNumber(): string | null {
  if (!auth.currentUser) return null;
  // Procurar provedor de telefone
  const phoneProvider = auth.currentUser.providerData.find(
    p => p.providerId === 'phone'
  );
  return phoneProvider?.phoneNumber || null;
}

/**
 * Limpar reCAPTCHA
 */
export function clearRecaptchaVerifier(): void {
  try {
    if ((window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier.clear();
      delete (window as any).recaptchaVerifier;
      console.log('[SMS Service] reCAPTCHA limpo');
    }
  } catch (error) {
    console.warn('[SMS Service] Erro ao limpar reCAPTCHA:', error);
  }
}

const firebaseSmsService = {
  setupRecaptchaVerifier,
  formatPhoneNumber,
  isValidPhoneNumber,
  sendSmsOtp,
  verifySmsOtp,
  linkPhoneCredential,
  resendSmsOtp,
  getCurrentUserPhoneNumber,
  clearRecaptchaVerifier,
};

export default firebaseSmsService;
