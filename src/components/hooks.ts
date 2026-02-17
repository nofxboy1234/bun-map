import { useEffect, useSyncExternalStore } from "react";
import { useCache } from "@/cache";
import { loadRouteData, useRouter } from "@/router";

function isAbortError(err: unknown) {
  return err instanceof DOMException
    ? err.name === "AbortError"
    : (err as { name?: string })?.name === "AbortError";
}

/**
 * useData is primarily a cache consumer.
 * It can also trigger non-abortable load reconciliation when current-route data
 * is missing or stale so the UI does not get stuck loading.
 */
export function useData<T>(key: string) {
  const cache = useCache();
  const { route, params, url, isNavigating } = useRouter();
  const routeKey = route?.getCacheKey?.(params, url);

  // Subscribe to cache changes for this specific key
  const data = useSyncExternalStore(
    (notify: () => void) => cache.subscribe(key, notify),
    () => cache.get(key) as T | undefined,
    () => cache.get(key) as T | undefined,
  );
  const isStale = data !== undefined && cache.isStale(key);

  useEffect(() => {
    if (
      !isNavigating &&
      routeKey === key &&
      route?.loadData &&
      !cache.isPending(key) &&
      (data === undefined || isStale)
    ) {
      loadRouteData({ route, params }, cache, url).catch((err) => {
        if (isAbortError(err)) {
          return;
        }
        console.error("Route data reconciliation failed", {
          key,
          path: url.pathname,
          err,
        });
      });
    }
  }, [cache, data, isNavigating, isStale, key, params, route, routeKey, url]);

  return {
    data,
    isLoading: !data,
    isStale,
  };
}
