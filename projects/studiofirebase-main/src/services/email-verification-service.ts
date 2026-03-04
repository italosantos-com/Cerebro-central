/**
 * Email Verification Service
 * Serviço para reenviar emails de verificação
 */

import { auth } from '@/lib/firebase';
import { getBaseUrl } from '@/lib/utils';
import { sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';

export interface ResendEmailResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Reenviar email de verificação
 */
export async function resendVerificationEmail(email: string, password: string): Promise<ResendEmailResult> {
  try {
    console.log('[EmailVerificationService] Reenviando email de verificação para:', email);

    // Primeiro, fazer login temporário para reenviar o email
    const { signInWithEmailAndPassword, signOut } = await import('firebase/auth');

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const user = credential.user;

      if (!user) {
        return {
          success: false,
          message: 'Usuário não encontrado',
          error: 'USER_NOT_FOUND'
        };
      }

      // Reenviar email de verificação. se for admin (determinamos via customClaim no token?)
      // simplificamos incluindo uid no redirect para ambos os casos.
      const uid = user.uid;
      let redirectPath: string;
      // Buscar username do admin
      let usernameValue = "";
      try {
        const adminDocSnap = await import('firebase/firestore').then(({ doc, getDoc }) => getDoc(doc(auth.app.firestore(), "admins", uid)));
        if (adminDocSnap && adminDocSnap.exists()) {
          const adminData = adminDocSnap.data();
          usernameValue = adminData.username ? String(adminData.username).toLowerCase().trim() : "";
        }
      } catch {}
      if (usernameValue) {
        redirectPath = `/${usernameValue}/admin`;
      } else {
        redirectPath = `/admin?uid=${uid}`;
      }
      const actionUrl = `${getBaseUrl()}/auth/action?context=admin&redirect=${encodeURIComponent(redirectPath)}`;
      await sendEmailVerification(user, {
        url: actionUrl,
        handleCodeInApp: true,
      });

      // Fazer logout
      await signOut(auth);

      return {
        success: true,
        message: 'Email com o link de ativação reenviado com sucesso. Verifique sua caixa de entrada.'
      };
    } catch (loginError: any) {
      console.error('[EmailVerificationService] Erro ao fazer login:', loginError);

      let errorMessage = 'Não foi possível processar o reenvio do email';

      if (loginError.code === 'auth/user-not-found') {
        errorMessage = 'Conta não encontrada. Verifique o email.';
      } else if (loginError.code === 'auth/wrong-password' || loginError.code === 'auth/invalid-credential') {
        errorMessage = 'Senha incorreta. Verifique seus dados.';
      } else if (loginError.code === 'auth/too-many-requests') {
        errorMessage = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
      } else if (loginError.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido.';
      }

      return {
        success: false,
        message: errorMessage,
        error: loginError.code || 'LOGIN_FAILED'
      };
    }
  } catch (error: any) {
    console.error('[EmailVerificationService] Erro ao reenviar email:', error);

    return {
      success: false,
      message: 'Erro ao reenviar email de verificação',
      error: error.message || 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Enviar email de verificação (para novo usuário)
 */
export async function sendNewVerificationEmail(user: any): Promise<ResendEmailResult> {
  try {
    console.log('[EmailVerificationService] Enviando email de verificação para novo usuário:', user.email);

    // Buscar username do admin
    let usernameValue = "";
    try {
      const adminDocSnap = await import('firebase/firestore').then(({ doc, getDoc }) => getDoc(doc(auth.app.firestore(), "admins", user.uid)));
      if (adminDocSnap && adminDocSnap.exists()) {
        const adminData = adminDocSnap.data();
        usernameValue = adminData.username ? String(adminData.username).toLowerCase().trim() : "";
      }
    } catch {}
    const redirectPath = usernameValue ? `/${usernameValue}/admin` : `/admin?uid=${user.uid}`;
    const actionUrl = `${getBaseUrl()}/auth/action?context=admin&redirect=${encodeURIComponent(redirectPath)}`;
    await sendEmailVerification(user, {
      url: actionUrl,
      handleCodeInApp: true,
    });

    return {
      success: true,
      message: 'Email com o link de ativação enviado com sucesso.'
    };
  } catch (error: any) {
    console.error('[EmailVerificationService] Erro ao enviar email:', error);

    return {
      success: false,
      message: 'Erro ao enviar email de verificação',
      error: error.message || 'UNKNOWN_ERROR'
    };
  }
}
