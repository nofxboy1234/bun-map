import { isAbortError } from "@/utils/errors";

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

type FetchRuntimeOptions = {
  staleTime: number;
  gcTime: number;
  signal?: AbortSignal;
  retryPolicy: RetryPolicy;
  dedupeMode: DedupeMode;
};

const DEFAULT_STALE_TIME_MS = 10_000;
const DEFAULT_RETRY_COUNT = 1;
const DEFAULT_RETRY_DELAY_MS = 300;

type DedupeMode = "signalAware" | "byKey";

type CacheFetchOptions = {
  staleTime?: number;
  gcTime?: number;
  signal?: AbortSignal;
  retry?: number;
  retryDelayMs?: number;
  dedupeMode?: DedupeMode;
};

function normalizeFetchOptions(options?: CacheFetchOptions): FetchRuntimeOptions {
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

function shouldReusePending<T>(pending: PendingEntry<T>, options: FetchRuntimeOptions) {
  if (options.dedupeMode === "byKey") {
    if (options.signal && pending.signal && pending.signal !== options.signal) {
      return false;
    }
    return true;
  }

  if (options.signal && pending.signal && pending.signal !== options.signal) {
    // `signalAware` mode intentionally bypasses dedupe for different AbortSignals
    // so independent cancellation scopes don't affect each other.
    return false;
  }

  return true;
}

class CacheKeyListeners {
  private listenersByKey = new Map<string, Set<() => void>>();

  subscribe(key: string, listener: () => void) {
    if (!this.listenersByKey.has(key)) {
      this.listenersByKey.set(key, new Set());
    }

    this.listenersByKey.get(key)!.add(listener);

    return () => {
      const listeners = this.listenersByKey.get(key);

      if (!listeners) {
        return;
      }

      listeners.delete(listener);

      if (listeners.size === 0) {
        this.listenersByKey.delete(key);
      }
    };
  }

  notify(key: string) {
    const listeners = this.listenersByKey.get(key);

    if (!listeners) {
      return;
    }

    listeners.forEach((listener) => listener());
  }
}

class CacheEntryTimers {
  private staleTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private gcTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private getCurrentEntry: (key: string) => CacheEntry<any> | undefined,
    private onStale: (key: string) => void,
    private onExpire: (key: string) => void,
  ) {}

  clear(key: string) {
    this.clearStaleTimer(key);
    this.clearGcTimer(key);
  }

  schedule(key: string, entry: CacheEntry<any>) {
    this.clear(key);

    const now = Date.now();
    const staleDelay = entry.staleAt - now;
    const gcDelay = entry.expiresAt - now;

    if (staleDelay > 0) {
      const timer = setTimeout(() => {
        const current = this.getCurrentEntry(key);

        if (!current || current.staleAt !== entry.staleAt) {
          return;
        }

        this.clearStaleTimer(key);
        this.onStale(key);
      }, staleDelay);
      this.staleTimers.set(key, timer);
    }

    if (gcDelay > 0) {
      const timer = setTimeout(() => {
        const current = this.getCurrentEntry(key);

        if (!current || current.expiresAt !== entry.expiresAt) {
          return;
        }

        this.clear(key);
        this.onExpire(key);
      }, gcDelay);
      this.gcTimers.set(key, timer);
    }
  }

  private clearStaleTimer(key: string) {
    const staleTimer = this.staleTimers.get(key);

    if (!staleTimer) {
      return;
    }

    clearTimeout(staleTimer);
    this.staleTimers.delete(key);
  }

  private clearGcTimer(key: string) {
    const gcTimer = this.gcTimers.get(key);

    if (!gcTimer) {
      return;
    }

    clearTimeout(gcTimer);
    this.gcTimers.delete(key);
  }
}

export {
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
};
