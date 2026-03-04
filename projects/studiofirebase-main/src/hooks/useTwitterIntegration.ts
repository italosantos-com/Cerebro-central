"use client";

import { useCallback } from 'react';

type TweetMedia = any;

interface PagedResult<T> {
    items: T[];
    next_token?: string;
}

export function useTwitterIntegration() {
    const login = useCallback(async (): Promise<{ success: boolean; username?: string; error?: string }> => {
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        const url = `/api/auth/twitter-login`;
        const popup = window.open(url, '_blank', `width=${width},height=${height},top=${top},left=${left}`);

        if (!popup || popup.closed) {
            // Fallback to full redirect
            window.location.href = url;
            return { success: false, error: 'popup_blocked' };
        }

        return new Promise((resolve) => {
            const listener = (event: MessageEvent) => {
                if (event.origin !== window.location.origin) return;
                const { platform, success, error, username } = event.data || {};
                if (platform !== 'twitter') return;
                window.removeEventListener('message', listener);
                resolve({ success: Boolean(success), username, error });
            };
            window.addEventListener('message', listener);

            const timer = setInterval(() => {
                if (popup.closed) {
                    clearInterval(timer);
                    window.removeEventListener('message', listener);
                    resolve({ success: false, error: 'popup_closed' });
                }
            }, 500);
        });
    }, []);

    const logout = useCallback(async () => {
        await fetch('/api/auth/twitter-logout', { method: 'POST' });
    }, []);

    const refresh = useCallback(async () => {
        const res = await fetch('/api/auth/twitter-refresh', { method: 'POST' });
        return res.ok;
    }, []);

    async function fetchWithRefresh(url: string): Promise<Response> {
        let res = await fetch(url);
        if (res.status === 401) {
            const ok = await fetch('/api/auth/twitter-refresh', { method: 'POST' });
            if (ok.ok) {
                res = await fetch(url);
            }
        }
        return res;
    }

    const getVideos = useCallback(async (username: string, paginationToken?: string, limit: number = 50): Promise<PagedResult<TweetMedia>> => {
        const params = new URLSearchParams({ username, max_results: String(limit) });
        if (paginationToken) params.set('pagination_token', paginationToken);
        const res = await fetchWithRefresh(`/api/twitter/videos?${params.toString()}`);
        if (!res.ok) throw new Error('Falha ao buscar vídeos do Twitter');
        const data = await res.json();
        return { items: data.tweets || [], next_token: data.next_token };
    }, []);

    const getPhotos = useCallback(async (username: string, paginationToken?: string, limit: number = 50): Promise<PagedResult<TweetMedia>> => {
        const params = new URLSearchParams({ username, max_results: String(limit) });
        if (paginationToken) params.set('pagination_token', paginationToken);
        const res = await fetchWithRefresh(`/api/twitter/fotos?${params.toString()}`);
        if (!res.ok) throw new Error('Falha ao buscar fotos do Twitter');
        const data = await res.json();
        return { items: data.tweets || [], next_token: data.next_token };
    }, []);

    return { login, logout, refresh, getVideos, getPhotos };
}

export default useTwitterIntegration;
