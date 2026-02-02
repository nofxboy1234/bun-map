import { useSyncExternalStore, useMemo, createContext, useContext } from "react";

// --- 1. The Simple Cache System ---

type CacheEntry<T> = {
  value: T;
  expiry: number;
};

export class SimpleCache {
  private data = new Map<string, CacheEntry<any>>();
  private pending = new Map<string, Promise<any>>();

  constructor(initialData?: Record<string, CacheEntry<any>>) {
    if (initialData) {
      this.restore(initialData);
    }
  }

  get(key: string) {
    const entry = this.data.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiry) {
      this.data.delete(key);
      return undefined;
    }

    return entry.value;
  }

  has(key: string) {
    // Returns true only if data exists AND is valid
    const entry = this.data.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiry) {
      this.data.delete(key);
      return false;
    }
    return true;
  }

  // ttl: Time to live in milliseconds (default: 5 minutes)
  async fetch<T>(key: string, fetcher: () => Promise<T>, ttl = 1000 * 60 * 5): Promise<T> {
    // Check for valid cached data
    if (this.has(key)) {
      return this.data.get(key)!.value;
    }

    // Deduplicate concurrent requests
    if (this.pending.has(key)) return this.pending.get(key);

    const promise = fetcher().then((value) => {
      this.data.set(key, { value, expiry: Date.now() + ttl });
      this.pending.delete(key);
      return value;
    });

    this.pending.set(key, promise);
    return promise;
  }

  invalidate(key: string) {
    this.data.delete(key);
  }

  snapshot() {
    return Object.fromEntries(this.data);
  }

  restore(data: Record<string, CacheEntry<any>>) {
    Object.entries(data).forEach(([key, entry]) => {
      this.data.set(key, entry);
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
// Wraps navigation and optional data prefetching
type LinkProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
  prefetch?: () => Promise<any>; // Optional "fetch-then-navigate" logic
};

export function Link({ href, className, children, prefetch }: LinkProps) {
  const { navigate } = useRouter();

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();

    // If there's a prefetch function, wait for it before navigating.
    // This implements the "Fetch-then-Render" pattern.
    if (prefetch) {
      try {
        await prefetch();
      } catch (err) {
        console.error("Prefetch failed", err);
        // Optionally handle error or navigate anyway
      }
    }

    navigate(href);
  };

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
