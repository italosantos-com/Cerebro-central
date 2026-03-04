import { TwitterMediaOutput } from '../ai/flows/twitter-flow';

type CacheEntry = {
    data: TwitterMediaOutput;
    timestamp: number;
};

// Cache simples em memoria para evitar falhas de build quando providers externos nao estao disponiveis.
export class HybridCacheService {
    private static cache = new Map<string, CacheEntry>();

    /**
     * Salvar cache usando a estratégia adequada para o ambiente
     */
    static async saveCache(
        username: string,
        mediaType: string,
        maxResults: number,
        data: TwitterMediaOutput
    ): Promise<void> {
        const key = this.getKey(username, mediaType, maxResults);
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    /**
     * Carregar cache usando a estratégia adequada para o ambiente
     */
    static async loadCache(
        username: string,
        mediaType: string,
        maxResults: number
    ): Promise<TwitterMediaOutput | null> {
        const key = this.getKey(username, mediaType, maxResults);
        const entry = this.cache.get(key);
        return entry ? entry.data : null;
    }

    /**
     * Limpar cache específico
     */
    static async clearCache(
        username: string,
        mediaType: string,
        maxResults: number
    ): Promise<boolean> {
        const key = this.getKey(username, mediaType, maxResults);
        return this.cache.delete(key);
    }

    /**
     * Obter estatísticas do cache
     */
    static async getCacheStats(): Promise<{
        totalCaches: number;
        validCaches: number;
        expiredCaches: number;
        totalSizeKB: number;
        source: string;
    }> {
        const totalCaches = this.cache.size;
        return {
            totalCaches,
            validCaches: totalCaches,
            expiredCaches: 0,
            totalSizeKB: 0,
            source: 'Memory'
        };
    }

    private static getKey(username: string, mediaType: string, maxResults: number): string {
        return `${username}:${mediaType}:${maxResults}`.toLowerCase();
    }
}
