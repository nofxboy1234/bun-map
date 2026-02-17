import { createContext, useContext } from "react";

type CacheEntry<T> = {
  value: T;
  staleAt: number;
  expiresAt: number;
};

type PendingEntry<T> = {
  promise: Promise<T>;
  signal?: AbortSignal;
};

function isAbortError(err: unknown) {
  return err instanceof DOMException
    ? err.name === "AbortError"
    : (err as { name?: string })?.name === "AbortError";
}

export class SimpleCache {
  private data = new Map<string, CacheEntry<any>>();
  private pending = new Map<string, PendingEntry<any>>();
  private keyListeners = new Map<string, Set<() => void>>();
  private staleTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private gcTimers = new Map<string, ReturnType<typeof setTimeout>>();

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

  private clearTimers(key: string) {
    const staleTimer = this.staleTimers.get(key);
    if (staleTimer) {
      clearTimeout(staleTimer);
      this.staleTimers.delete(key);
    }

    const gcTimer = this.gcTimers.get(key);
    if (gcTimer) {
      clearTimeout(gcTimer);
      this.gcTimers.delete(key);
    }
  }

  private scheduleTimers(key: string, entry: CacheEntry<any>) {
    this.clearTimers(key);

    const now = Date.now();
    const staleDelay = entry.staleAt - now;
    if (staleDelay > 0) {
      const timer = setTimeout(() => {
        const current = this.data.get(key);
        if (!current || current.staleAt !== entry.staleAt) {
          return;
        }
        this.notify(key);
        this.staleTimers.delete(key);
      }, staleDelay);
      this.staleTimers.set(key, timer);
    }

    const gcDelay = entry.expiresAt - now;
    if (gcDelay > 0) {
      const timer = setTimeout(() => {
        const current = this.data.get(key);
        if (!current || current.expiresAt !== entry.expiresAt) {
          return;
        }
        this.data.delete(key);
        this.clearTimers(key);
        this.notify(key);
      }, gcDelay);
      this.gcTimers.set(key, timer);
    }
  }

  private getEntry(key: string) {
    const entry = this.data.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.data.delete(key);
      this.clearTimers(key);
      // Notify asynchronously to avoid triggering re-renders during current render
      queueMicrotask(() => this.notify(key));
      return undefined;
    }

    return entry;
  }

  get(key: string) {
    return this.getEntry(key)?.value;
  }

  isStale(key: string) {
    const entry = this.getEntry(key);
    if (!entry) return true;
    return Date.now() > entry.staleAt;
  }

  isPending(key: string) {
    return this.pending.has(key);
  }

  async fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: {
      staleTime?: number;
      gcTime?: number;
      signal?: AbortSignal;
    },
  ): Promise<T> {
    const staleTime = options?.staleTime ?? 1000 * 10;
    const gcTime = Math.max(options?.gcTime ?? staleTime * 6, staleTime);
    const now = Date.now();
    const entry = this.getEntry(key);

    if (entry) {
      if (now <= entry.staleAt) {
        return entry.value;
      }

      void this.fetchFresh(key, fetcher, { staleTime, gcTime, signal: options?.signal });
      return entry.value;
    }

    return this.fetchFresh(key, fetcher, { staleTime, gcTime, signal: options?.signal });
  }

  private async fetchFresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      staleTime: number;
      gcTime: number;
      signal?: AbortSignal;
    },
  ): Promise<T> {
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
        const now = Date.now();
        const entry = {
          value,
          staleAt: now + options.staleTime,
          expiresAt: now + options.gcTime,
        };
        this.data.set(key, entry);
        this.scheduleTimers(key, entry);
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
