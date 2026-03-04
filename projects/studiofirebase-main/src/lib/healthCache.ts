type Entry = { ts: number; data: unknown };
const store: Record<string, Entry> = {};

export async function withCache<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<{ cached: boolean; data: T; age: number }> {
  const now = Date.now();
  const existing = store[key];
  if (existing) {
    const ageMs = now - existing.ts;
    if (ageMs < ttlSeconds * 1000) {
      return { cached: true, data: existing.data as T, age: ageMs };
    }
  }
  const data = await compute();
  store[key] = { ts: now, data };
  return { cached: false, data, age: 0 };
}

export function cacheAge(key: string): number | null {
  const e = store[key];
  return e ? Date.now() - e.ts : null;
}
