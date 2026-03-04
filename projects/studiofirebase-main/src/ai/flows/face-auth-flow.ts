
'use server';
/**
 * @fileOverview User authentication flow using Firebase Storage, Realtime Database, and AI face comparison.
 * - verifyUser: Authenticates a user by comparing their face image against all stored images.
 * Fixed TypeScript type issues
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAllUsers } from '@/services/user-auth-service';

// Input schema for user authentication
const VerifyUserInputSchema = z.object({
  imageBase64: z.string().describe("A base64 encoded image for authentication."),
});
export type VerifyUserInput = z.infer<typeof VerifyUserInputSchema>;

// Output schema for authentication
const VerifyUserOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  redirectUrl: z.string().optional(),
  errorCode: z.enum(['NO_USERS_FOUND', 'MATCH_NOT_FOUND', 'VERIFICATION_FAILED', 'UNKNOWN', 'NO_FACE_DETECTED']).optional(),
});
export type VerifyUserOutput = z.infer<typeof VerifyUserOutputSchema>;

const VIP_URL = "/assinante";

/**
 * Genkit flow to authenticate a user by comparing their face against all stored images
 * using an AI model.
 */
const verifyUserFlow = ai.defineFlow(
  {
    name: 'verifyUserFlow',
    inputSchema: VerifyUserInputSchema,
    outputSchema: VerifyUserOutputSchema,
  },
  async (input: VerifyUserInput): Promise<VerifyUserOutput> => {
    const { imageBase64 } = input;
    try {
  
      
      const allUsers = await getAllUsers();

      if (allUsers.length === 0) {

        const result: VerifyUserOutput = { 
          success: false, 
          message: 'Nenhum usuário cadastrado. Por favor, registre-se primeiro.', 
          errorCode: 'NO_USERS_FOUND'
        };
        return result;
      }
      
      
      
      for (const user of allUsers) {
        if (!user.imageUrl) {
  
            continue;
        }

        
        const { output } = await ai.generate({
            model: 'googleai/gemini-2.0-flash',
            prompt: `
              Você é um especialista em verificação facial. Compare a "Imagem de Login" com a "Imagem Armazenada".
              Responda APENAS com "SIM" se for a mesma pessoa, ou "NÃO" se não for. Não adicione nenhuma outra palavra ou pontuação.

              Imagem de Login:
              {{media url=loginImage}}

              Imagem Armazenada:
              {{media url=storedImage}}
            `,
            context: {
              loginImage: { url: `data:image/jpeg;base64,${imageBase64.split(',')[1]}` }, 
              storedImage: { url: user.imageUrl },
            },
            output: {
              format: 'text'
            },
            config: {
              temperature: 0, 
            }
        });
        
        const resultText = (output as string || "").trim().toUpperCase();
        

        if (resultText.includes('SIM')) {

            const result: VerifyUserOutput = { 
              success: true, 
              message: `Autenticado com sucesso! Redirecionando para a área do assinante...`, 
              redirectUrl: VIP_URL 
            };
            return result;
        }
      }

      
      const result: VerifyUserOutput = { 
        success: false, 
        message: 'Rosto não reconhecido. Tente novamente ou cadastre-se.', 
        errorCode: 'MATCH_NOT_FOUND'
      };
      return result;

    } catch (e: any) {

      const errorMessage = typeof e?.message === 'string' ? e.message : 'Ocorreu um erro inesperado durante a verificação.';
      const result: VerifyUserOutput = { 
        success: false, 
        message: errorMessage, 
        errorCode: 'VERIFICATION_FAILED'
      };
      return result;
    }
  }
);

export async function verifyUser(input: VerifyUserInput): Promise<VerifyUserOutput> {
  return verifyUserFlow(input);
}
