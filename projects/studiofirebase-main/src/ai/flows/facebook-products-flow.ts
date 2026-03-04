
'use server';
/**
 * @fileOverview Fluxo para buscar produtos de um catálogo do Facebook.
 * Agora utiliza o token salvo na integração Admin (Firebase) configurada via OAuth.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';

// Schema de entrada (vazio, pois usaremos variáveis de ambiente)
const FacebookProductsInputSchema = z.object({});
export type FacebookProductsInput = z.infer<typeof FacebookProductsInputSchema>;

// Schema de saída para os produtos
const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  price: z.string(),
  image_url: z.string().url(),
  url: z.string().url().optional(),
});

const FacebookProductsOutputSchema = z.object({
  products: z.array(ProductSchema),
  error: z.string().optional(),
});
export type FacebookProductsOutput = z.infer<typeof FacebookProductsOutputSchema>;
export type FacebookProduct = z.infer<typeof ProductSchema>;

/**
 * Fluxo Genkit que busca produtos de um catálogo do Facebook.
 */
const fetchFacebookProductsFlow = ai.defineFlow(
  {
    name: 'fetchFacebookProductsFlow',
    inputSchema: FacebookProductsInputSchema,
    outputSchema: FacebookProductsOutputSchema,
  },
  async () => {
    try {
      // Obter token da integração Admin (Facebook)
      const adminApp = getAdminApp();
      if (!adminApp) {
        return { products: [], error: 'Admin SDK indisponível no servidor.' };
      }
      const db = getDatabase(adminApp);
      const snapshot = await db.ref('admin/integrations/facebook').get();
      const integration = snapshot.exists() ? snapshot.val() : null;

      const accessToken: string | undefined = integration?.access_token;
      if (!integration || !integration.connected || !accessToken) {
        return {
          products: [],
          error: 'Integração com Facebook não configurada. Conecte a conta em Admin > Integrações para exibir o catálogo.'
        };
      }

      // ID do catálogo pode ser configurado via variável de ambiente
      const catalogId = process.env.FACEBOOK_CATALOG_ID;
      if (!catalogId) {
        return {
          products: [],
          error:
            'FACEBOOK_CATALOG_ID não configurado no servidor. Defina o ID do catálogo do Facebook para listar os produtos.'
        };
      }

      const fields = 'id,name,description,price,image_url,url';
      const url = `https://graph.facebook.com/v23.0/${catalogId}/products?fields=${fields}&access_token=${encodeURIComponent(
        accessToken
      )}`;

      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage: string;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = `Erro ao buscar produtos do Facebook: ${errorData.error?.message || 'Erro desconhecido'}`;
        } catch (e) {
          errorMessage = `Erro ao buscar produtos do Facebook. Resposta não-JSON recebida: ${errorText}`;
        }
        return { products: [], error: errorMessage };
      }

      const data = await response.json();
      const products = (data.data || []).map((product: any) => ({
        ...product,
        price: product.price || '0.00',
        description: product.description || null
      }));

      return { products };
    } catch (error: any) {
      return {
        products: [],
        error: `Não foi possível carregar os produtos do catálogo. Motivo: ${error?.message || 'Erro desconhecido'}`
      };
    }
  }
);


/**
 * Função exportada para ser chamada do lado do cliente.
 */
export async function fetchFacebookProducts(): Promise<FacebookProductsOutput> {
    return fetchFacebookProductsFlow({});
}
