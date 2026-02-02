import { useSyncExternalStore, useMemo } from "react";

// --- 1. The Simple Cache System ---
// A native Map to store data. Simple, synchronous access.
const dataCache = new Map<string, any>();
const pendingRequests = new Map<string, Promise<any>>();

export const Cache = {
  get: (key: string) => dataCache.get(key),

  // Fetches data if not in cache, returning a Promise.
  // Deduplicates requests using a pending map.
  async fetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    if (dataCache.has(key)) return dataCache.get(key);
    if (pendingRequests.has(key)) return pendingRequests.get(key);

    const promise = fetcher().then((data) => {
      dataCache.set(key, data);
      pendingRequests.delete(key);
      return data;
    });

    pendingRequests.set(key, promise);
    return promise;
  },

  // Synchronously checks if we have data (useful for conditional rendering)
  has: (key: string) => dataCache.has(key),
};

// --- 2. The Client-Side Router ---
// Native event dispatcher for history changes
const historyEvent = new Event("pushstate");

function subscribe(callback: () => void) {
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

export function useRouter() {
  // Uses useSyncExternalStore to subscribe to URL changes efficiently
  const urlString = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const url = useMemo(() => new URL(urlString), [urlString]);

  const navigate = (path: string) => {
    window.history.pushState(null, "", path);
    window.dispatchEvent(historyEvent);
  };

  const replace = (path: string) => {
    window.history.replaceState(null, "", path);
    window.dispatchEvent(historyEvent);
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
