export type SocialPlatform = 'facebook' | 'instagram' | 'twitter' | 'paypal' | 'mercadopago' | 'stripe';

const DEFAULT_ENDPOINTS: Record<SocialPlatform, string> = {
    facebook: 'https://facebook-423019559653.us-central1.run.app',
    instagram: 'https://instagram-423019559653.us-central1.run.app',
    twitter: 'https://twitter-423019559653.us-central1.run.app',
    paypal: 'https://paypal-423019559653.us-central1.run.app',
    mercadopago: 'https://mercado-pago-423019559653.us-central1.run.app',
    stripe: 'https://stripe-423019559653.us-central1.run.app', // ajuste a URL se necessário
};

function getPath(platform: SocialPlatform): string {
    const pathKey = `NEXT_PUBLIC_CLOUD_RUN_${platform.toUpperCase()}_PATH` as keyof NodeJS.ProcessEnv;
    const fromEnv = typeof process !== 'undefined' ? (process.env as any)[pathKey] : undefined;
    // Padrão: raiz do serviço
    return fromEnv || '/';
}

function joinUrl(base: string, path: string): string {
    if (!path) return base;
    if (base.endsWith('/') && path.startsWith('/')) return base + path.slice(1);
    if (!base.endsWith('/') && !path.startsWith('/')) return base + '/' + path;
    return base + path;
}

export function getEndpoint(platform: SocialPlatform): string {
    const envKey = `NEXT_PUBLIC_CLOUD_RUN_${platform.toUpperCase()}` as keyof NodeJS.ProcessEnv;
    const fromEnv = typeof process !== 'undefined' ? (process.env as any)[envKey] : undefined;
    return fromEnv || DEFAULT_ENDPOINTS[platform];
}

export function buildRedirectUri(platform: SocialPlatform): string {
    if (typeof window === 'undefined') return '';
    const base = `${window.location.origin}/auth/callback`;
    const params = new URLSearchParams({ platform });
    return `${base}?${params.toString()}`;
}

export function openOAuthWindow(platform: SocialPlatform): Window | null {
    if (typeof window === 'undefined') return null;
    // Caso especial: permitir URL fixa para Mercado Pago via env
    if (platform === 'mercadopago') {
        const fixedUrl = (typeof process !== 'undefined' ? (process.env as any).NEXT_PUBLIC_MERCADOPAGO_OAUTH_URL : undefined) as string | undefined;
        if (fixedUrl && fixedUrl.startsWith('https://')) {
            const width = 600;
            const height = 700;
            const left = window.top ? (window.top.outerWidth - width) / 2 : 100;
            const top = window.top ? (window.top.outerHeight - height) / 2 : 100;
            const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no`;
            try {
                const w = window.open(fixedUrl, 'oauth_connect', features);
                return w;
            } catch {
                return null;
            }
        }

        // Fallback padrão: usar rota interna do app
        const localUrl = `${window.location.origin}/api/admin/mercadopago/connect`;
        const width = 600;
        const height = 700;
        const left = window.top ? (window.top.outerWidth - width) / 2 : 100;
        const top = window.top ? (window.top.outerHeight - height) / 2 : 100;
        const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no`;
        try {
            const w = window.open(localUrl, 'oauth_connect', features);
            return w;
        } catch {
            return null;
        }
    }

    const endpoint = getEndpoint(platform);
    const path = getPath(platform);
    const redirectUri = buildRedirectUri(platform);
    const state = `${platform}:${Date.now()}`;
    const origin = window.location.origin;
    const baseUrl = joinUrl(endpoint, path);
    const url = `${baseUrl}?redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&origin=${encodeURIComponent(origin)}`;

    const width = 600;
    const height = 700;
    const left = window.top ? (window.top.outerWidth - width) / 2 : 100;
    const top = window.top ? (window.top.outerHeight - height) / 2 : 100;
    const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no`;
    try {
        const w = window.open(url, 'oauth_connect', features);
        return w;
    } catch {
        return null;
    }
}

export async function postLogout(platform: SocialPlatform): Promise<void> {
    try {
        // Em desenvolvimento local, não fazer chamadas diretas ao Cloud Run (CORS)
        // A limpeza local já é suficiente para desconectar
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            console.log(`[DEBUG] Skipping Cloud Run logout for ${platform} in localhost`);
            return;
        }
        
        const endpoint = getEndpoint(platform);
        await fetch(`${endpoint}/logout`, { method: 'POST', credentials: 'include' }).catch(() => { });
    } catch {
        // ignore
    }
}
