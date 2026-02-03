import { useSyncExternalStore, useMemo, createContext, useContext, useRef } from "react";

// --- 1. The Simple Cache System ---

type CacheEntry<T> = {
  value: T;
  expiry: number;
};

export class SimpleCache {
  private data = new Map<string, CacheEntry<any>>();
  private pending = new Map<string, Promise<any>>();
  private listeners = new Set<() => void>();

  constructor(initialData?: Record<string, CacheEntry<any>>) {
    if (initialData) {
      this.restore(initialData);
    }
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  get(key: string) {
    const entry = this.data.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiry) {
      this.data.delete(key);
      this.notify();
      return undefined;
    }

    return entry.value;
  }

  has(key: string) {
    const entry = this.data.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiry) {
      this.data.delete(key);
      this.notify();
      return false;
    }

    return true;
  }

  async fetch<T>(key: string, fetcher: () => Promise<T>, ttl = 1000 * 60 * 5): Promise<T> {
    if (this.has(key)) {
      return this.data.get(key)!.value;
    }

    if (this.pending.has(key)) return this.pending.get(key);

    const promise = fetcher()
      .then((value) => {
        this.data.set(key, { value, expiry: Date.now() + ttl });
        this.pending.delete(key);
        this.notify();
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
    this.notify();
  }

  snapshot() {
    return Object.fromEntries(this.data);
  }

  restore(data: Record<string, CacheEntry<any>>) {
    Object.entries(data).forEach(([key, entry]) => {
      this.data.set(key, entry);
    });
    this.notify();
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

// For backward compatibility / direct usage outside React
export const Cache = globalCache;

// --- 2. The Client-Side Router ---
// Native event dispatcher for history changes
// Safe for SSR: Check if window exists before creating Event
const historyEvent = typeof window !== "undefined" ? new Event("pushstate") : null;

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("popstate", callback);
  window.addEventListener("pushstate", callback);

  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("pushstate", callback);
  };
}

function getSnapshot() {
  return window.location.href;
}

// Context to pass the server URL during SSR
const ServerContext = createContext<string | null>(null);

export function ServerRouter({ url, children }: { url: string; children: React.ReactNode }) {
  return <ServerContext.Provider value={url}>{children}</ServerContext.Provider>;
}

export function useRouter() {
  const serverUrl = useContext(ServerContext);

  // On server, return the context value. On client (during hydration), this should technically match window.location.
  const getServerSnapshot = () => serverUrl || "http://localhost/";

  // Uses useSyncExternalStore to subscribe to URL changes efficiently
  const urlString = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const url = useMemo(() => new URL(urlString), [urlString]);

  const navigate = (path: string) => {
    if (typeof window === "undefined") return;

    window.history.pushState(null, "", path);
    if (historyEvent) window.dispatchEvent(historyEvent);
  };

  const replace = (path: string) => {
    if (typeof window === "undefined") return;

    window.history.replaceState(null, "", path);
    if (historyEvent) window.dispatchEvent(historyEvent);
  };

  return {
    url,
    path: url.pathname,
    query: url.searchParams,
    navigate,
    replace,
  };
}

// --- 3. Link Component ---
type LinkProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
  prefetch?: () => Promise<any>;
  prefetchTimeout?: number; // Configurable hover delay
  prefetchOnHover?: boolean; // Enable/disable hover prefetching
};

export function Link({
  href,
  className,
  children,
  prefetch,
  prefetchTimeout = 50,
  prefetchOnHover = true,
}: LinkProps) {
  const { navigate } = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (prefetch) {
      try {
        await prefetch();
      } catch (err) {
        console.error("Prefetch failed", err);
      }
    }
    navigate(href);
  };

  const handleMouseEnter = () => {
    if (prefetch && prefetchOnHover) {
      timerRef.current = setTimeout(() => {
        prefetch().catch(() => {});
      }, prefetchTimeout);
    }
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  return (
    <a
      href={href}
      className={className}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </a>
  );
}
