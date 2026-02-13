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
  const { route, params, url, isNavigating } = useRouter();

  // Subscribe to cache changes for this specific key
  const data = useSyncExternalStore(
    (notify: () => void) => cache.subscribe(key, notify),
    () => cache.get(key) as T | undefined,
    () => cache.get(key) as T | undefined,
  );

  useEffect(() => {
    // If data is missing and we have a current route with loadData, try to trigger it.
    // We only do this if we are not currently navigating, to avoid refetching
    // the old route's data just before it unmounts (e.g. if it expired).
    if (!isNavigating && !data && route?.loadData && !cache.isPending(key)) {
      route.loadData(cache, params, url).catch(() => {
        // Error handling could be added here
      });
    }
  }, [data, route, params, url, cache, key, isNavigating]);

  return {
    data,
    isLoading: !data,
  };
}
