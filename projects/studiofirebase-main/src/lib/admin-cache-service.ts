/**
 * Admin Cache Service
 * Gerencia cache de dados para cada admin (Twitter, Instagram, etc)
 * Armazenado em: admins/{adminUid}/cache/
 */

import { AdminStorageManager } from '@/lib/admin-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Serviço de cache para um admin específico
 */
export class AdminCacheService {
  private manager: AdminStorageManager;
  private memoryCache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_EXPIRATION_HOURS = 24;

  constructor(adminUid: string) {
    this.manager = new AdminStorageManager(adminUid);
  }

  /**
   * Salva dados em cache (memória + storage)
   */
  async set<T>(
    key: string,
    data: T,
    expirationHours?: number
  ): Promise<void> {
    const expiresAt = Date.now() + (expirationHours || this.DEFAULT_EXPIRATION_HOURS) * 60 * 60 * 1000;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt,
    };

    // Salvar em memória
    this.memoryCache.set(key, entry);

    // Salvar em storage
    try {
      await this.manager.saveCache(key, JSON.stringify(entry));
      console.log(`[AdminCache] ✅ Cache salvo: ${key}`);
    } catch (err) {
      console.warn(`[AdminCache] ⚠️ Erro ao salvar cache em storage:`, err);
      // Continuar mesmo se falhar o storage (memória está ok)
    }
  }

  /**
   * Recupera dados do cache (memória primeiro, depois storage)
   */
  async get<T>(key: string): Promise<T | null> {
    // 1️⃣ Verificar memória primeiro
    const memEntry = this.memoryCache.get(key) as CacheEntry<T> | undefined;
    if (memEntry && !this.isExpired(memEntry)) {
      console.log(`[AdminCache] 💾 Cache recuperado da memória: ${key}`);
      return memEntry.data;
    }

    // 2️⃣ Se não estiver em memória, tentar carregar do storage
    try {
      const cachedJSON = await this.manager.loadCache(key);
      if (!cachedJSON) {
        console.log(`[AdminCache] ❌ Cache não encontrado: ${key}`);
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cachedJSON);

      // Verificar se expirou
      if (this.isExpired(entry)) {
        console.log(`[AdminCache] ⏰ Cache expirado: ${key}`);
        return null;
      }

      // Restaurar em memória para próxima vez
      this.memoryCache.set(key, entry);

      console.log(`[AdminCache] 📦 Cache recuperado do storage: ${key}`);
      return entry.data;
    } catch (err) {
      console.warn(`[AdminCache] ⚠️ Erro ao carregar cache do storage:`, err);
      return null;
    }
  }

  /**
   * Verifica se um cache existe e não expirou
   */
  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  /**
   * Remove um cache
   */
  async delete(key: string): Promise<void> {
    // Remover de memória
    this.memoryCache.delete(key);

    // TODO: Remover do storage quando tiver função de delete específica
    console.log(`[AdminCache] 🗑️ Cache removido: ${key}`);
  }

  /**
   * Limpa todos os caches
   */
  async clear(): Promise<void> {
    // Limpar memória
    this.memoryCache.clear();

    // Limpar storage
    try {
      await this.manager.clearFolder('cache');
      console.log(`[AdminCache] 🧹 Todos os caches removidos`);
    } catch (err) {
      console.warn(`[AdminCache] ⚠️ Erro ao limpar cache em storage:`, err);
    }
  }

  /**
   * Retorna informações do cache
   */
  async getStats(): Promise<{ size: number; keys: string[] }> {
    const keys = Array.from(this.memoryCache.keys());
    const size = this.memoryCache.size;

    return {
      size,
      keys,
    };
  }

  /**
   * Verifica se um cache entry expirou
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() > entry.expiresAt;
  }
}

/**
 * Serviço de cache global para um admin (singleton por admin)
 */
const cacheServices = new Map<string, AdminCacheService>();

export function getAdminCacheService(adminUid: string): AdminCacheService {
  if (!cacheServices.has(adminUid)) {
    cacheServices.set(adminUid, new AdminCacheService(adminUid));
  }
  return cacheServices.get(adminUid)!;
}

/**
 * Helper para cache de dados do Twitter
 */
export async function cacheTwitterData(
  adminUid: string,
  data: any,
  expirationHours?: number
): Promise<void> {
  const cacheService = getAdminCacheService(adminUid);
  await cacheService.set(`twitter_data_${adminUid}`, data, expirationHours);
}

/**
 * Helper para recuperar dados do Twitter do cache
 */
export async function getTwitterDataFromCache(adminUid: string): Promise<any | null> {
  const cacheService = getAdminCacheService(adminUid);
  return cacheService.get(`twitter_data_${adminUid}`);
}

/**
 * Helper para cache de dados do Instagram
 */
export async function cacheInstagramData(
  adminUid: string,
  data: any,
  expirationHours?: number
): Promise<void> {
  const cacheService = getAdminCacheService(adminUid);
  await cacheService.set(`instagram_data_${adminUid}`, data, expirationHours);
}

/**
 * Helper para recuperar dados do Instagram do cache
 */
export async function getInstagramDataFromCache(adminUid: string): Promise<any | null> {
  const cacheService = getAdminCacheService(adminUid);
  return cacheService.get(`instagram_data_${adminUid}`);
}

/**
 * Helper para cache de dados genéricos
 */
export async function setCacheData(
  adminUid: string,
  key: string,
  data: any,
  expirationHours?: number
): Promise<void> {
  const cacheService = getAdminCacheService(adminUid);
  await cacheService.set(key, data, expirationHours);
}

/**
 * Helper para recuperar dados genéricos do cache
 */
export async function getCacheData(adminUid: string, key: string): Promise<any | null> {
  const cacheService = getAdminCacheService(adminUid);
  return cacheService.get(key);
}

/**
 * Helper para verificar se dados estão em cache
 */
export async function isCached(adminUid: string, key: string): Promise<boolean> {
  const cacheService = getAdminCacheService(adminUid);
  return cacheService.has(key);
}

/**
 * Helper para limpar cache de um admin
 */
export async function clearAdminCache(adminUid: string): Promise<void> {
  const cacheService = getAdminCacheService(adminUid);
  await cacheService.clear();
}
