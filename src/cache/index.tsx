import { createContext, useContext } from "react";

// --- 1. The Simple Cache System ---

type CacheEntry<T> = {
  value: T;
  expiry: number;
};

type PendingEntry<T> = {
  promise: Promise<T>;
  signal?: AbortSignal;
};

export type SerializedCacheEntry = {
  value: unknown;
  expiry: number;
};

export type SerializedCache = Record<string, SerializedCacheEntry>;

function isAbortError(err: unknown) {
  return err instanceof DOMException
    ? err.name === "AbortError"
    : (err as { name?: string })?.name === "AbortError";
}

export class SimpleCache {
  private data = new Map<string, CacheEntry<any>>();
  private pending = new Map<string, PendingEntry<any>>();
  private keyListeners = new Map<string, Set<() => void>>();

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

  dehydrate(): SerializedCache {
    const now = Date.now();
    const snapshot: SerializedCache = {};

    for (const [key, entry] of this.data) {
      if (entry.expiry > now) {
        snapshot[key] = {
          value: entry.value,
          expiry: entry.expiry,
        };
      }
    }

    return snapshot;
  }

  hydrate(snapshot: SerializedCache | null | undefined) {
    if (!snapshot) return;

    const now = Date.now();
    for (const [key, entry] of Object.entries(snapshot)) {
      if (!entry || typeof entry.expiry !== "number" || entry.expiry <= now) {
        continue;
      }

      this.data.set(key, {
        value: entry.value,
        expiry: entry.expiry,
      });
    }
  }

  async fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: {
      ttl?: number;
      signal?: AbortSignal;
    },
  ): Promise<T> {
    const ttl = options?.ttl ?? 1000 * 10;

    if (this.has(key)) {
      return this.data.get(key)!.value;
    }

    const pending = this.pending.get(key);
    if (pending) {
      if (pending.signal?.aborted) {
        this.pending.delete(key);
      } else if (options?.signal && pending.signal && pending.signal !== options.signal) {
      } else {
        return pending.promise;
      }
    }

    const promise = fetcher()
      .then((value) => {
        this.data.set(key, { value, expiry: Date.now() + ttl });
        if (this.pending.get(key)?.promise === promise) {
          this.pending.delete(key);
        }
        this.notify(key);
        return value;
      })
      .catch((err) => {
        if (this.pending.get(key)?.promise === promise) {
          this.pending.delete(key);
        }
        // Let subscribers re-evaluate when an in-flight request is aborted.
        if (isAbortError(err)) {
          this.notify(key);
        }
        throw err;
      });

    this.pending.set(key, { promise, signal: options?.signal });
    return promise;
  }
}

// Global default cache for client-side usage (singleton)
export const globalCache = new SimpleCache();

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
