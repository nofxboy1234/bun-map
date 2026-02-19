type CacheEntry<T> = {
  value: T;
  staleAt: number;
  expiresAt: number;
};

type PendingEntry<T> = {
  promise: Promise<T>;
  signal?: AbortSignal;
};

type RetryPolicy = {
  retry: number;
  retryDelayMs: number;
};

type FetchFreshOptions = {
  staleTime: number;
  gcTime: number;
  signal?: AbortSignal;
  retryPolicy: RetryPolicy;
  dedupeMode: DedupeMode;
};

const DEFAULT_STALE_TIME_MS = 10_000;
const DEFAULT_RETRY_COUNT = 1;
const DEFAULT_RETRY_DELAY_MS = 300;

export type DedupeMode = "signalAware" | "byKey";

export type CacheFetchOptions = {
  staleTime?: number;
  gcTime?: number;
  signal?: AbortSignal;
  retry?: number;
  retryDelayMs?: number;
  dedupeMode?: DedupeMode;
};

/**
 * Recommended helper for route-driven loads: dedupe by cache key so concurrent
 * loaders/prefetchers for the same key share one network request.
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

function normalizeFetchOptions(options?: CacheFetchOptions): FetchFreshOptions {
  const staleTime = options?.staleTime ?? DEFAULT_STALE_TIME_MS;

  return {
    staleTime,
    gcTime: Math.max(options?.gcTime ?? staleTime * 6, staleTime),
    signal: options?.signal,
    retryPolicy: {
      retry: Math.max(options?.retry ?? DEFAULT_RETRY_COUNT, 0),
      retryDelayMs: Math.max(options?.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS, 0),
    },
    dedupeMode: options?.dedupeMode ?? "signalAware",
  };
}

function isAbortError(err: unknown) {
  return err instanceof DOMException
    ? err.name === "AbortError"
    : (err as { name?: string })?.name === "AbortError";
}

function getErrorStatus(err: unknown) {
  const status = (err as { status?: unknown })?.status;
  return typeof status === "number" ? status : null;
}

function isTransientError(err: unknown) {
  if (isAbortError(err)) {
    return false;
  }

  if (err instanceof TypeError) {
    // Network errors from fetch are usually surfaced as TypeError.
    return true;
  }

  const status = getErrorStatus(err);
  if (status === null) {
    return false;
  }

  return status === 408 || status === 429 || status >= 500;
}

function sleep(ms: number, signal?: AbortSignal) {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const id = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(id);
      reject(new DOMException("The operation was aborted.", "AbortError"));
    };

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

function shouldReusePending<T>(pending: PendingEntry<T>, options: FetchFreshOptions) {
  if (options.dedupeMode === "byKey") {
    return true;
  }

  if (options.signal && pending.signal && pending.signal !== options.signal) {
    // `signalAware` mode intentionally bypasses dedupe for different AbortSignals
    // so independent cancellation scopes don't affect each other.
    return false;
  }

  return true;
}

export class SimpleCache {
  private data = new Map<string, CacheEntry<any>>();
  private pending = new Map<string, PendingEntry<any>>();
  private keyListeners = new Map<string, Set<() => void>>();
  private staleTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private gcTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private generations = new Map<string, number>();

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
      listeners.forEach((listener) => listener());
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
    this.clearTimers(key);

    const now = Date.now();
    const staleDelay = entry.staleAt - now;
    const gcDelay = entry.expiresAt - now;

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
    options: FetchFreshOptions,
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
