'use server';

/**
 * @fileOverview Face Auth flow integrado com Firebase
 * Gerencia autenticação via Face ID usando Firebase Firestore
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Interface para dados do usuário
export interface FaceIDUser {
  nome: string;
  email: string;
  telefone: string;
  image: string;
  video?: string;
  firebaseUid?: string;
}

// Interface para resposta da API
interface ApiResponse {
  success: boolean;
  message: string;
  redirectUrl?: string;
  userEmail?: string;
  userName?: string;
  isSubscriber?: boolean;
  subscriptionType?: string;
}

// Funções para comunicar com a nova API Firebase

function getApiUrl() {
  if (typeof window === 'undefined') {
    // Server-side: use Firebase URL
    // Prefer explicit base URL env vars in server environment
    if (process.env.NEXT_PUBLIC_BASE_URL) return `${process.env.NEXT_PUBLIC_BASE_URL}/api/face-auth`;
    if (process.env.NEXT_PUBLIC_SITE_URL) return `${process.env.NEXT_PUBLIC_SITE_URL}/api/face-auth`;
    // Fallback to Firebase hosted auth handler or site domain
    if (process.env.FIREBASE_AUTH_DOMAIN) return `https://${process.env.FIREBASE_AUTH_DOMAIN}/api/face-auth`;
    return 'https://creatorsphere-srajp.firebaseapp.com/api/face-auth';
  }
  // Client-side: relative path
  return '/api/face-auth';
}

async function callFaceAuthAPI(action: string, data: any): Promise<ApiResponse> {
  const url = getApiUrl();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action,
      ...data
    })
  });
  // Trata resposta vazia ou inválida
  const text = await response.text();
  try {
    if (!text || text.trim() === '' || text.trim() === 'data:,') {
      return { success: false, message: 'Resposta vazia da API de Face ID.' };
    }
    return JSON.parse(text);
  } catch (e) {
    return { success: false, message: 'Erro ao processar resposta da API de Face ID.' };
  }
}

async function registerUserWithFirebase(userData: FaceIDUser): Promise<ApiResponse> {
  return await callFaceAuthAPI('register', userData);
}

async function verifyUserWithFirebase(loginData: { image: string; email?: string }): Promise<ApiResponse> {
  return await callFaceAuthAPI('login', loginData);
}

async function checkPaymentStatusFirebase(email: string): Promise<ApiResponse> {
  return await callFaceAuthAPI('checkPayment', { customerEmail: email });
}

async function checkExistingUserFirebase(userData: Partial<FaceIDUser>): Promise<ApiResponse> {
  return await callFaceAuthAPI('checkUser', userData);
}

// Schema de entrada para cadastro
const RegisterFaceIDInputSchema = z.object({
  nome: z.string().describe("Nome do usuário"),
  email: z.string().email().describe("Email do usuário"),
  telefone: z.string().describe("Telefone do usuário"),
  image: z.string().describe("Imagem facial em base64"),
  video: z.string().optional().describe("Vídeo facial em base64"),
  firebaseUid: z.string().optional().describe("UID do Firebase")
});

// Schema de entrada para login
const LoginFaceIDInputSchema = z.object({
  image: z.string().describe("Imagem facial em base64 para autenticação"),
  email: z.string().email().optional().describe("Email opcional para verificação adicional")
});

// Schema de saída para ambas as operações
const FaceIDOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  isVip: z.boolean().optional().describe("Se o usuário tem acesso VIP"),
  redirectUrl: z.string().optional().describe("URL para redirecionamento"),
  userEmail: z.string().optional().describe("Email do usuário autenticado")
});

export type RegisterFaceIDInput = z.infer<typeof RegisterFaceIDInputSchema>;
export type LoginFaceIDInput = z.infer<typeof LoginFaceIDInputSchema>;
export type FaceIDOutput = z.infer<typeof FaceIDOutputSchema>;

/**
 * Fluxo para registrar usuário via Face ID com Google Apps Script
 */
const registerHandler = async (input: RegisterFaceIDInput): Promise<FaceIDOutput> => {
  try {
    const userData: FaceIDUser = {
      nome: input.nome,
      email: input.email,
      telefone: input.telefone,
      image: input.image,
      video: input.video,
      firebaseUid: input.firebaseUid
    };

    // Primeiro verificar se o usuário já existe
    const checkResult = await checkExistingUserFirebase(userData);
    if (!checkResult.success) {
      return {
        success: false,
        message: checkResult.message
      };
    }

    const result = await registerUserWithFirebase(userData);
    if (result.success) {
      return {
        success: true,
        message: 'Cadastro realizado com sucesso! Agora você pode fazer login.',
        redirectUrl: '/auth/face?tab=signin'
      };
    }

    return {
      success: false,
      message: result.message || 'Erro ao cadastrar usuário.'
    };
  } catch (error) {
    return {
      success: false,
      message: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
};

const registerFaceIDFlow = ai.defineFlow(
  {
    name: 'registerFaceIDFlow',
    inputSchema: RegisterFaceIDInputSchema,
    outputSchema: FaceIDOutputSchema,
  },
  registerHandler
);

/**
 * Fluxo para login via Face ID com Google Apps Script
 */
const loginHandler = async (input: LoginFaceIDInput): Promise<FaceIDOutput> => {
  try {
    const result = await verifyUserWithFirebase({ image: input.image, email: input.email });
    if (!result.success) {
      return { success: false, message: result.message || 'Usuário não reconhecido. Verifique se você está cadastrado.' };
    }

    // Verificar se é VIP (tem pagamento/assinatura ativa)
    let isVip = false;
    let redirectUrl = '/assinante';

    if (result.userEmail) {
      const paymentResult = await checkPaymentStatusFirebase(result.userEmail);
      if (paymentResult.success && paymentResult.isSubscriber) {
        isVip = true;
        redirectUrl = '/galeria-assinantes';
      }
    }

    return {
      success: true,
      message: isVip ? 'Login realizado! Acesso VIP liberado.' : 'Login realizado! Vá para área de assinante para ativar seu acesso premium.',
      isVip,
      redirectUrl,
      userEmail: result.userEmail || input.email
    };
  } catch (error) {
    return { success: false, message: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}` };
  }
};

const loginFaceIDFlow = ai.defineFlow(
  {
    name: 'loginFaceIDFlow',
    inputSchema: LoginFaceIDInputSchema,
    outputSchema: FaceIDOutputSchema,
  },
  loginHandler
);

/**
 * Função exportada para cadastro via Face ID
 */
export async function registerWithFaceID(input: RegisterFaceIDInput): Promise<FaceIDOutput> {
  return registerFaceIDFlow(input);
}

/**
 * Função exportada para login via Face ID
 */
export async function loginWithFaceID(input: LoginFaceIDInput): Promise<FaceIDOutput> {
  return loginFaceIDFlow(input);
}

/**
 * Função exportada para verificar status de pagamento
 */
export async function checkUserPaymentStatus(email: string): Promise<FaceIDOutput> {
  try {
    const result = await checkPaymentStatusFirebase(email);

    return {
      success: result.success,
      message: result.message,
      isVip: result.success, // Se o pagamento foi identificado, é VIP
      redirectUrl: result.success ? '/galeria-assinantes' : '/dashboard'
    };
  } catch (error) {
    return {
      success: false,
      message: `Erro ao verificar status de pagamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}
