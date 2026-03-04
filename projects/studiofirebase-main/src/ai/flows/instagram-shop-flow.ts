
'use server';
/**
 * @fileOverview Fluxo para buscar mídias do perfil do Instagram da loja (@severetoys).
 * Agora utiliza o token salvo na integração Admin (Firebase) configurada via OAuth.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';

// O schema de entrada é vazio, pois o token e o ID são configurados no servidor.
const InstagramShopInputSchema = z.object({});
export type InstagramShopInput = z.infer<typeof InstagramShopInputSchema>;

const MediaItemSchema = z.object({
    id: z.string(),
    caption: z.string().optional().nullable(),
    media_type: z.enum(['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM']),
    media_url: z.string().optional(),
    thumbnail_url: z.string().optional(),
    permalink: z.string(),
    timestamp: z.string(),
});

// Define o schema de saída.
const InstagramMediaOutputSchema = z.object({
  media: z.array(MediaItemSchema),
  error: z.string().optional(),
});
export type InstagramMediaOutput = z.infer<typeof InstagramMediaOutputSchema>;
export type InstagramMedia = z.infer<typeof MediaItemSchema>;


/**
 * Fluxo Genkit que busca os posts com mídia do perfil @severetoys no Instagram.
 */
const fetchInstagramShopMediaFlow = ai.defineFlow(
  {
    name: 'fetchInstagramShopMediaFlow',
    inputSchema: InstagramShopInputSchema,
    outputSchema: InstagramMediaOutputSchema,
  },
  async () => {
    try {
      // Ler token e IG user id da integração Admin (gravada via OAuth)
      const adminApp = getAdminApp();
      if (!adminApp) {
        return { media: [], error: 'Admin SDK indisponível no servidor.' };
      }
      const db = getDatabase(adminApp);
      const snapshot = await db.ref('admin/integrations/instagram').get();
      const integration = snapshot.exists() ? snapshot.val() : null;

      const accessToken: string | undefined = integration?.access_token;
      const igUserId: string | undefined = integration?.user_id;

      if (!integration || !integration.connected || !accessToken || !igUserId) {
        return {
          media: [],
          error:
            'Integração com Instagram não configurada. Conecte a conta em Admin > Integrações para exibir a galeria da loja.'
        };
      }

      const maxResults = 50;
      const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
      // Usar Graph API v23.0 e o igUserId resolvido via integração Business
      const url = `https://graph.facebook.com/v23.0/${igUserId}/media?fields=${fields}&limit=${maxResults}&access_token=${encodeURIComponent(
        accessToken
      )}`;

      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage: string;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = `Erro ao buscar mídia da loja no Instagram: ${errorData.error?.message || 'Erro desconhecido'}`;
        } catch (e) {
          errorMessage = `Erro ao buscar mídia da loja no Instagram. Resposta não-JSON recebida: ${errorText}`;
        }
        return { media: [], error: errorMessage };
      }

      const data = await response.json();
      const result = {
        media: (data.data || []).map((item: any) => ({ ...item, caption: item.caption || null }))
      };
      return result;
    } catch (error: any) {
      let errorMessage = error?.message || 'Erro desconhecido ao acessar a API do Instagram.';
      if (typeof errorMessage === 'string' && (errorMessage.includes('decrypt') || errorMessage.includes('Failed to decrypt'))) {
        errorMessage = 'Erro ao descriptografar o token de acesso do Instagram. O token pode estar em formato inválido ou corrompido.';
      }
      return { media: [], error: `Não foi possível carregar o feed da loja. Motivo: ${errorMessage}` };
    }
  }
);


/**
 * Função exportada para ser chamada do lado do cliente.
 */
export async function fetchInstagramShopFeed(): Promise<InstagramMediaOutput> {
    return fetchInstagramShopMediaFlow({});
}
