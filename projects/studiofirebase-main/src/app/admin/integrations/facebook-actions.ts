'use server';

import { cookies } from 'next/headers';

/**
 * Ações do servidor para gerenciar dados de integração do Facebook
 */

const FACEBOOK_STORAGE_KEY = 'facebook_integration';

interface FacebookIntegrationData {
    accessToken: string;
    userID: string;
    connectedAt: number;
    pages?: Array<{
        id: string;
        name: string;
        accessToken: string;
    }>;
}

/**
 * Salva os dados de integração do Facebook
 */
export async function saveFacebookIntegration(data: FacebookIntegrationData) {
    try {
        const cookieStore = await cookies();

        // Salvar no cookie (usando JsonWeb token seria mais seguro em produção)
        cookieStore.set(FACEBOOK_STORAGE_KEY, JSON.stringify(data), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 dias
        });

        return { success: true, message: 'Integração do Facebook salva com sucesso' };
    } catch (error) {
        console.error('Erro ao salvar integração do Facebook:', error);
        return { success: false, error: 'Falha ao salvar integração' };
    }
}

/**
 * Obtém os dados de integração do Facebook
 */
export async function getFacebookIntegration(): Promise<FacebookIntegrationData | null> {
    try {
        const cookieStore = await cookies();
        const data = cookieStore.get(FACEBOOK_STORAGE_KEY);

        if (!data?.value) {
            return null;
        }

        return JSON.parse(data.value);
    } catch (error) {
        console.error('Erro ao obter integração do Facebook:', error);
        return null;
    }
}

/**
 * Remove a integração do Facebook
 */
export async function removeFacebookIntegration() {
    try {
        const cookieStore = await cookies();
        cookieStore.delete(FACEBOOK_STORAGE_KEY);
        return { success: true, message: 'Integração do Facebook removida' };
    } catch (error) {
        console.error('Erro ao remover integração do Facebook:', error);
        return { success: false, error: 'Falha ao remover integração' };
    }
}

/**
 * Verifica se o Facebook está conectado
 */
export async function isFacebookConnected(): Promise<boolean> {
    const integration = await getFacebookIntegration();
    return integration !== null && integration.accessToken !== undefined;
}

/**
 * Obtém o access token do Facebook
 */
export async function getFacebookAccessToken(): Promise<string | null> {
    const integration = await getFacebookIntegration();
    return integration?.accessToken || null;
}

/**
 * Obtém as páginas do Facebook do usuário
 */
export async function getFacebookPages(): Promise<Array<{ id: string; name: string; accessToken: string }> | null> {
    const integration = await getFacebookIntegration();
    return integration?.pages || null;
}
