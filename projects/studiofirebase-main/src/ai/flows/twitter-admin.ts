"use server";
/**
 * Genkit flows para orquestrar integração do Twitter no painel Admin
 * - Iniciar login (retorna URL)
 * - Logout
 * - Buscar mídias (fotos / vídeos) usando o fluxo existente
 */

import { z } from 'zod';
import { ai } from '../genkit';
import { getBaseUrl } from '@/lib/utils';
import { twitterFlow, type TwitterMediaOutput } from './twitter-flow';

// Schema comum de entrada para mídias
const MediaInputSchema = z.object({
    username: z.string().min(1),
    maxResults: z.number().int().min(1).max(100).default(20),
});

// 1) Flow: obter URL de login do Twitter para o Admin (popup)
export const twitterAdminLoginUrl = ai.defineFlow(
    {
        name: 'twitterAdminLoginUrl',
        inputSchema: z.object({}).optional(),
        outputSchema: z.object({ url: z.string().url() }),
    },
    async () => {
        const base = getBaseUrl();
        // Usamos a rota canônica de Admin que já persiste PKCE e trata callback
        const url = new URL('/api/admin/twitter/connect', base).toString();
        return { url };
    }
);

// 2) Flow: logout do Twitter (apaga cookies)
export const twitterAdminLogout = ai.defineFlow(
    {
        name: 'twitterAdminLogout',
        inputSchema: z.object({}).optional(),
        outputSchema: z.object({ success: z.boolean() }),
    },
    async () => {
        const base = getBaseUrl();
        const res = await fetch(new URL('/api/auth/twitter-logout', base), { method: 'POST' });
        return { success: res.ok };
    }
);

// 3) Flow: fotos de um usuário (usa o fluxo otimizado existente)
export const twitterPhotosForUser = ai.defineFlow(
    {
        name: 'twitterPhotosForUser',
        inputSchema: MediaInputSchema,
        outputSchema: z.custom<TwitterMediaOutput>(),
    },
    async ({ username, maxResults }: { username: string; maxResults: number }) => {
        return (await twitterFlow.run({ username, maxResults, mediaType: 'photos' })) as any;
    }
);

// 4) Flow: vídeos de um usuário (usa o fluxo otimizado existente)
export const twitterVideosForUser = ai.defineFlow(
    {
        name: 'twitterVideosForUser',
        inputSchema: MediaInputSchema,
        outputSchema: z.custom<TwitterMediaOutput>(),
    },
    async ({ username, maxResults }: { username: string; maxResults: number }) => {
        return (await twitterFlow.run({ username, maxResults, mediaType: 'videos' })) as any;
    }
);

const twitterAdminFlows = {
    twitterAdminLoginUrl,
    twitterAdminLogout,
    twitterPhotosForUser,
    twitterVideosForUser,
};

export default twitterAdminFlows;
