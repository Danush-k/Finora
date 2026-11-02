/**
 * Finora High-Performance Client Cache
 * 
 * Provides instantaneous Stale-While-Revalidate (SWR) data access across routes.
 * Enables React components to mount with pre-populated data on Frame 1,
 * eliminating the "waits 1 second to become normal" layout shifts, skeleton flashes,
 * and component resizing during page transitions.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

class ApiCache {
  private memory = new Map<string, CacheEntry<any>>();
  private readonly defaultTtlMs = 4 * 60 * 1000; // 4 minutes

  constructor() {
    // Restore non-sensitive keys from sessionStorage if available
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem("finora_api_cache_v1");
        if (raw) {
          const parsed = JSON.parse(raw);
          const now = Date.now();
          Object.entries(parsed).forEach(([k, v]: [string, any]) => {
            if (v && v.timestamp && now - v.timestamp < (v.ttlMs || this.defaultTtlMs)) {
              this.memory.set(k, v);
            }
          });
        }
      } catch {
        // Ignore storage read error
      }
    }
  }

  private persistSession() {
    if (typeof window === "undefined") return;
    try {
      const obj: Record<string, any> = {};
      const now = Date.now();
      this.memory.forEach((v, k) => {
        // Only persist dashboard, chart, and settings to avoid large storage usage
        if (
          (k.includes("dashboard") ||
            k.includes("calendar") ||
            k.includes("budget") ||
            k.includes("debt-lent") ||
            k.includes("transactions") ||
            k.includes("settings") ||
            k.includes("rules")) &&
          now - v.timestamp < v.ttlMs
        ) {
          obj[k] = v;
        }
      });
      sessionStorage.setItem("finora_api_cache_v1", JSON.stringify(obj));
    } catch {
      // Ignore storage write error
    }
  }

  /**
   * Synchronous get for React useState(() => apiCache.get('key') || defaultVal)
   * This guarantees ZERO layout shift on Frame 1!
   */
  get<T>(key: string): T | null {
    const entry = this.memory.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttlMs;
    // Even if slightly expired, return cached data for SWR (stale-while-revalidate)
    return entry.data as T;
  }

  /**
   * Check if cache entry is fresh (not stale)
   */
  isFresh(key: string): boolean {
    const entry = this.memory.get(key);
    if (!entry) return false;
    return Date.now() - entry.timestamp < entry.ttlMs;
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, ttlMs: number = this.defaultTtlMs): void {
    if (data === undefined || data === null) return;
    this.memory.set(key, {
      data,
      timestamp: Date.now(),
      ttlMs,
    });
    this.persistSession();
  }

  /**
   * Invalidate cache matching a string prefix or pattern
   */
  invalidate(pattern?: string | RegExp): void {
    if (!pattern) {
      this.memory.clear();
    } else if (typeof pattern === "string") {
      Array.from(this.memory.keys()).forEach((k) => {
        if (k.startsWith(pattern) || k.includes(pattern)) {
          this.memory.delete(k);
        }
      });
    } else if (pattern instanceof RegExp) {
      Array.from(this.memory.keys()).forEach((k) => {
        if (pattern.test(k)) {
          this.memory.delete(k);
        }
      });
    }
    this.persistSession();
  }
}

export const apiCache = new ApiCache();
