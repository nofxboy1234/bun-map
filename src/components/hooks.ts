import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { useCache } from "@/cache";

export function useData<T>(key: string, fetcher: () => Promise<T>) {
  const cache = useCache();

  // 1. Subscribe to cache changes using useSyncExternalStore
  const data = useSyncExternalStore(
    (notify: () => void) => cache.subscribe(notify),
    () => cache.get(key),
    () => cache.get(key), // Server snapshot
  );

  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(!data);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // If we have data, we're not loading (unless we want to implement background refresh)
    if (data) {
      setLoading(false);
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    setLoading(true);
    cache
      .fetch(key, fetcher)
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [key, data, fetcher, cache]);

  return { data, error, isLoading: loading };
}
