"use server";
/**
 * Genkit flows para orquestrar integração do Mercado Pago no painel Admin
 * - Iniciar login (retorna URL)
 * - Desconectar (limpa integração no DB)
 * - Os endpoints Pix já usam o token dinâmico do Admin conectado
 */

import { z } from 'zod';
import { ai } from '../genkit';
import { getBaseUrl } from '@/lib/utils';

// 1) Flow: obter URL de login do Mercado Pago para o Admin (popup)
export const mercadoPagoAdminLoginUrl = ai.defineFlow(
    {
        name: 'mercadoPagoAdminLoginUrl',
        inputSchema: z.object({}).optional(),
        outputSchema: z.object({ url: z.string().url() }),
    },
    async () => {
        const base = getBaseUrl();
        const url = new URL('/api/admin/mercadopago/connect', base).toString();
        return { url };
    }
);

// 2) Flow: desconectar Mercado Pago (marca como desconectado e remove tokens)
export const mercadoPagoAdminDisconnect = ai.defineFlow(
    {
        name: 'mercadoPagoAdminDisconnect',
        inputSchema: z.object({}).optional(),
        outputSchema: z.object({ success: z.boolean() }),
    },
    async () => {
        const base = getBaseUrl();
        const res = await fetch(new URL('/api/admin/mercadopago/disconnect?popup=1', base), { method: 'GET' });
        return { success: res.ok };
    }
);

const mercadopagoAdminFlows = {
    mercadoPagoAdminLoginUrl,
    mercadoPagoAdminDisconnect,
};

export default mercadopagoAdminFlows;
