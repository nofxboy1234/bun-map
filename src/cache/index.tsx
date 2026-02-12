import { createContext, useContext } from "react";

// --- 1. The Simple Cache System ---

type CacheEntry<T> = {
  value: T;
  expiry: number;
};

export class SimpleCache {
  private data = new Map<string, CacheEntry<any>>();
  private pending = new Map<string, Promise<any>>();
  private keyListeners = new Map<string, Set<() => void>>();

  constructor(initialData?: Record<string, CacheEntry<any>>) {
    if (initialData) {
      this.restore(initialData);
    }
  }

  subscribe(key: string, listener: () => void) {
    if (!this.keyListeners.has(key)) {
      this.keyListeners.set(key, new Set());
    }
    this.keyListeners.get(key)!.add(listener);

    return () => {
      const listeners = this.keyListeners.get(key);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.keyListeners.delete(key);
        }
      }
    };
  }

  private notify(key: string) {
    const listeners = this.keyListeners.get(key);
    if (listeners) {
      listeners.forEach((l) => l());
    }
  }

  get(key: string) {
    const entry = this.data.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiry) {
      this.data.delete(key);
      // Notify asynchronously to avoid triggering re-renders during current render
      queueMicrotask(() => this.notify(key));
      return undefined;
    }

    return entry.value;
  }

  has(key: string) {
    const entry = this.data.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiry) {
      this.data.delete(key);
      queueMicrotask(() => this.notify(key));
      return false;
    }

    return true;
  }

  isPending(key: string) {
    return this.pending.has(key);
  }

  async fetch<T>(key: string, fetcher: () => Promise<T>, ttl = 1000 * 10): Promise<T> {
    if (this.has(key)) {
      return this.data.get(key)!.value;
    }

    if (this.pending.has(key)) return this.pending.get(key);

    const promise = fetcher()
      .then((value) => {
        this.data.set(key, { value, expiry: Date.now() + ttl });
        this.pending.delete(key);
        this.notify(key);
        return value;
      })
      .catch((err) => {
        this.pending.delete(key);
        throw err;
      });

    this.pending.set(key, promise);
    return promise;
  }

  invalidate(key: string) {
    this.data.delete(key);
    this.notify(key);
  }

  snapshot() {
    return Object.fromEntries(this.data);
  }

  restore(data: Record<string, CacheEntry<any>>) {
    Object.entries(data).forEach(([key, entry]) => {
      this.data.set(key, entry);
      this.notify(key);
    });
  }
}

// Global default cache for client-side usage (singleton)
export const globalCache = AutoHydratedCache();

function AutoHydratedCache() {
  const cache = new SimpleCache();

  if (typeof window !== "undefined" && (window as any).__INITIAL_DATA__) {
    cache.restore((window as any).__INITIAL_DATA__);
  }

  return cache;
}

const CacheContext = createContext<SimpleCache>(globalCache);

export function CacheProvider({
  cache,
  children,
}: {
  cache: SimpleCache;
  children: React.ReactNode;
}) {
  return <CacheContext.Provider value={cache}>{children}</CacheContext.Provider>;
}

export function useCache() {
  return useContext(CacheContext);
}
