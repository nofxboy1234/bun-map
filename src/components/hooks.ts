import { useSyncExternalStore, useEffect } from "react";
import { useCache } from "@/cache";
import { useRouter } from "@/router";

/**
 * useData now acts as a passive consumer of the cache.
 * Data is expected to be pre-loaded by the Router or a Prefetch action.
 * It will also attempt to re-trigger loadData if it finds the cache entry is missing.
 */
export function useData<T>(key: string) {
  const cache = useCache();
  const { route, params, url } = useRouter();

  // Subscribe to cache changes for this specific key
  const data = useSyncExternalStore(
    (notify: () => void) => cache.subscribe(key, notify),
    () => cache.get(key) as T | undefined,
    () => cache.get(key) as T | undefined, // Server snapshot
  );

  useEffect(() => {
    // If data is missing and we have a current route with loadData, try to trigger it.
    // This handles cases where the cache might have expired.
    if (!data && route?.loadData) {
      route.loadData(cache, params, url).catch(() => {
        // Error handling could be added here
      });
    }
  }, [data, route, params, url, cache]);

  return {
    data,
    isLoading: !data,
    // Note: error handling should now ideally be handled at the router level
    // or by checking if data is missing after navigation completes.
  };
}
