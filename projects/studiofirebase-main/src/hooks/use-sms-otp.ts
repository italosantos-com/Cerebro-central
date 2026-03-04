/**
 * Hook para gerenciar SMS com Firebase
 * 
 * Uso:
 * const { sendOtp, verifyOtp, loading, error, verificationId } = useSmsOtp();
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { ConfirmationResult } from 'firebase/auth';
import {
  sendSmsOtp,
  verifySmsOtp,
  linkPhoneCredential,
  resendSmsOtp,
  clearRecaptchaVerifier,
  formatPhoneNumber,
  isValidPhoneNumber,
} from '@/services/firebase-sms-service';

export interface UseSmsOtpState {
  loading: boolean;
  verifying: boolean;
  error: string | null;
  verificationId: string | null;
  confirmationResult: ConfirmationResult | null;
  phoneNumber: string | null;
  verifiedPhoneNumber: string | null;
  resendCountdown: number;
}

export interface UseSmsOtpMethods {
  sendOtp: (phoneNumber: string, recaptchaContainerId?: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<boolean>;
  linkPhoneWithOtp: (code: string) => Promise<boolean>;
  resendOtp: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
  canResend: () => boolean;
}

export function useSmsOtp(
  onSuccess?: () => void,
  onError?: (error: string) => void
): UseSmsOtpState & UseSmsOtpMethods {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [verifiedPhoneNumber, setVerifiedPhoneNumber] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  const resendTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Enviar OTP
  const sendOtp = useCallback(
    async (phone: string, recaptchaContainerId: string = 'recaptcha-container') => {
      setLoading(true);
      setError(null);

      try {
        // Validar
        if (!isValidPhoneNumber(phone)) {
          throw new Error('Número de telefone inválido. Use E.164 (ex: +14155552671) ou número BR (ex: 11999999999).');
        }

        const formatted = formatPhoneNumber(phone);
        console.log('[useSmsOtp] Enviando OTP para:', formatted);

        // Enviar
        const result = await sendSmsOtp(phone, recaptchaContainerId);

        setPhoneNumber(formatted);
        setVerificationId(result.verificationId);
        setConfirmationResult(result.confirmationResult);

        // Iniciar contador de reenvio (60 segundos)
        setResendCountdown(60);
        if (resendTimerRef.current) clearInterval(resendTimerRef.current);

        resendTimerRef.current = setInterval(() => {
          setResendCountdown(prev => {
            if (prev <= 1) {
              if (resendTimerRef.current) clearInterval(resendTimerRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        console.log('[useSmsOtp] ✅ OTP enviado com sucesso');
        onSuccess?.();
      } catch (err: any) {
        const message = err.message || 'Erro ao enviar OTP';
        setError(message);
        console.error('[useSmsOtp] Erro:', message);
        onError?.(message);
      } finally {
        setLoading(false);
      }
    },
    [onSuccess, onError]
  );

  // Verificar OTP
  const verifyOtp = useCallback(
    async (code: string): Promise<boolean> => {
      if (!confirmationResult) {
        setError('Nenhuma verificação em progresso');
        return false;
      }

      setVerifying(true);
      setError(null);

      try {
        console.log('[useSmsOtp] Verificando código OTP...');

        const result = await verifySmsOtp(confirmationResult, code);

        if (!result.success) {
          throw new Error(result.message);
        }

        setVerifiedPhoneNumber(phoneNumber);
        console.log('[useSmsOtp] ✅ OTP verificado com sucesso');
        onSuccess?.();
        return true;
      } catch (err: any) {
        const message = err.message || 'Erro ao verificar código';
        setError(message);
        console.error('[useSmsOtp] Erro:', message);
        onError?.(message);
        return false;
      } finally {
        setVerifying(false);
      }
    },
    [confirmationResult, phoneNumber, onSuccess, onError]
  );

  // Vincular credencial de telefone
  const linkPhoneWithOtp = useCallback(
    async (code: string): Promise<boolean> => {
      if (!confirmationResult) {
        setError('Nenhuma verificação em progresso');
        return false;
      }

      setVerifying(true);
      setError(null);

      try {
        console.log('[useSmsOtp] Vinculando telefone...');

        const result = await linkPhoneCredential(confirmationResult, code);

        if (!result.success) {
          throw new Error(result.message);
        }

        setVerifiedPhoneNumber(phoneNumber);
        console.log('[useSmsOtp] ✅ Telefone vinculado com sucesso');
        onSuccess?.();
        return true;
      } catch (err: any) {
        const message = err.message || 'Erro ao vincular telefone';
        setError(message);
        console.error('[useSmsOtp] Erro:', message);
        onError?.(message);
        return false;
      } finally {
        setVerifying(false);
      }
    },
    [confirmationResult, phoneNumber, onSuccess, onError]
  );

  // Re-enviar OTP
  const resendOtp = useCallback(async () => {
    if (!phoneNumber) {
      setError('Número de telefone não disponível');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[useSmsOtp] Re-enviando OTP...');

      const result = await resendSmsOtp(phoneNumber);

      setVerificationId(result.verificationId);
      setConfirmationResult(result.confirmationResult);

      // Reiniciar contador
      setResendCountdown(60);
      if (resendTimerRef.current) clearInterval(resendTimerRef.current);

      resendTimerRef.current = setInterval(() => {
        setResendCountdown(prev => {
          if (prev <= 1) {
            if (resendTimerRef.current) clearInterval(resendTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      console.log('[useSmsOtp] ✅ OTP re-enviado com sucesso');
      onSuccess?.();
    } catch (err: any) {
      const message = err.message || 'Erro ao re-enviar OTP';
      setError(message);
      console.error('[useSmsOtp] Erro:', message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [phoneNumber, onSuccess, onError]);

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Reset
  const reset = useCallback(() => {
    setError(null);
    setVerificationId(null);
    setConfirmationResult(null);
    setPhoneNumber(null);
    setVerifiedPhoneNumber(null);
    setResendCountdown(0);
    clearRecaptchaVerifier();
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
  }, []);

  // Pode reenviar?
  const canResend = useCallback(() => {
    return resendCountdown === 0 && confirmationResult !== null;
  }, [resendCountdown, confirmationResult]);

  return {
    loading,
    verifying,
    error,
    verificationId,
    confirmationResult,
    phoneNumber,
    verifiedPhoneNumber,
    resendCountdown,
    sendOtp,
    verifyOtp,
    linkPhoneWithOtp,
    resendOtp,
    clearError,
    reset,
    canResend,
  };
}

export default useSmsOtp;
