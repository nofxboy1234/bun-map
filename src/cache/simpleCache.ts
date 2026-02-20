import { isAbortError } from "@/utils/errors";
import {
  CacheEntryTimers,
  CacheKeyListeners,
  isTransientError,
  normalizeFetchOptions,
  shouldReusePending,
  sleep,
  type CacheEntry,
  type CacheFetchOptions,
  type DedupeMode,
  type FetchRuntimeOptions,
  type PendingEntry,
  type RetryPolicy,
} from "./simpleCacheInternals";

export type { CacheFetchOptions, DedupeMode } from "./simpleCacheInternals";

/**
 * Recommended helper for route-driven loads: dedupe by cache key so concurrent
 * loaders/prefetchers for the same key share one network request when they
 * belong to the same cancellation scope.
 *
 * For truly independent cancellation scopes, pass `dedupeMode: "signalAware"`
 * directly to `cache.fetch(...)`.
 */
export function routeFetchOptions(options: CacheFetchOptions = {}): CacheFetchOptions {
  return {
    ...options,
    dedupeMode: options.dedupeMode ?? "byKey",
  };
}

export class SimpleCache {
  private data = new Map<string, CacheEntry<any>>();
  private pending = new Map<string, PendingEntry<any>>();
  private generations = new Map<string, number>();
  private versions = new Map<string, number>();
  private listeners = new CacheKeyListeners();
  private timers = new CacheEntryTimers(
    (key) => this.data.get(key),
    (key) => this.notify(key),
    (key) => this.expireEntry(key),
  );

  subscribe(key: string, listener: () => void) {
    return this.listeners.subscribe(key, listener);
  }

  getVersion(key: string) {
    return this.versions.get(key) ?? 0;
  }

  private bumpVersion(key: string) {
    this.versions.set(key, this.getVersion(key) + 1);
  }

  private notify(key: string) {
    this.bumpVersion(key);
    this.listeners.notify(key);
  }

  private clearTimers(key: string) {
    this.timers.clear(key);
  }

  private getGeneration(key: string) {
    return this.generations.get(key) ?? 0;
  }

  private bumpGeneration(key: string) {
    this.generations.set(key, this.getGeneration(key) + 1);
  }

  private clearPendingIfCurrent(key: string, promise: Promise<unknown>) {
    if (this.pending.get(key)?.promise === promise) {
      this.pending.delete(key);
    }
  }

  private scheduleTimers(key: string, entry: CacheEntry<any>) {
    this.timers.schedule(key, entry);
  }

  private expireEntry(key: string) {
    this.data.delete(key);
    this.notify(key);
  }

  private setEntry<T>(key: string, value: T, staleTime: number, gcTime: number) {
    const now = Date.now();
    const entry = {
      value,
      staleAt: now + staleTime,
      expiresAt: now + gcTime,
    };

    this.data.set(key, entry);
    this.scheduleTimers(key, entry);
  }

  private getEntry(key: string) {
    const entry = this.data.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.data.delete(key);
      this.clearTimers(key);
      // Notify asynchronously to avoid triggering re-renders during current render.
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

  invalidate(keyOrPredicate: string | ((key: string) => boolean)) {
    const keys =
      typeof keyOrPredicate === "string"
        ? [keyOrPredicate]
        : [...this.data.keys(), ...this.pending.keys()].filter((key) => keyOrPredicate(key));

    for (const key of new Set(keys)) {
      this.bumpGeneration(key);
      this.data.delete(key);
      this.pending.delete(key);
      this.clearTimers(key);
      this.notify(key);
    }
  }

  async fetch<T>(key: string, fetcher: () => Promise<T>, options?: CacheFetchOptions): Promise<T> {
    const resolvedOptions = normalizeFetchOptions(options);
    const now = Date.now();
    const entry = this.getEntry(key);

    if (entry) {
      if (now <= entry.staleAt) {
        return entry.value;
      }

      void this.fetchFresh(key, fetcher, resolvedOptions);
      return entry.value;
    }

    return this.fetchFresh(key, fetcher, resolvedOptions);
  }

  private async fetchFresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: FetchRuntimeOptions,
  ): Promise<T> {
    const generation = this.getGeneration(key);
    const pending = this.pending.get(key);

    if (pending) {
      if (pending.signal?.aborted) {
        this.pending.delete(key);
      } else if (shouldReusePending(pending, options)) {
        return pending.promise;
      }
    }

    const promise = this.runWithRetry(fetcher, options.retryPolicy, options.signal)
      .then((value) => {
        if (generation === this.getGeneration(key)) {
          this.setEntry(key, value, options.staleTime, options.gcTime);
        }

        this.clearPendingIfCurrent(key, promise);
        this.notify(key);

        return value;
      })
      .catch((err) => {
        this.clearPendingIfCurrent(key, promise);
        this.notify(key);
        throw err;
      });

    this.pending.set(key, { promise, signal: options.signal });
    this.notify(key);

    return promise;
  }

  private async runWithRetry<T>(
    fetcher: () => Promise<T>,
    retryPolicy: RetryPolicy,
    signal?: AbortSignal,
  ) {
    let attempt = 0;

    while (true) {
      try {
        return await fetcher();
      } catch (err) {
        if (isAbortError(err)) {
          throw err;
        }

        if (!isTransientError(err) || attempt >= retryPolicy.retry) {
          throw err;
        }

        attempt += 1;
        await sleep(retryPolicy.retryDelayMs * attempt, signal);
      }
    }
  }
}
