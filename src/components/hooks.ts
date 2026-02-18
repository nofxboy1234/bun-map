import { useCallback, useEffect, useSyncExternalStore } from "react";
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
type UseDataOptions = {
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
};

export function useData<T>(key: string, options?: UseDataOptions) {
  const cache = useCache();
  const { route, params, search, url, isNavigating } = useRouter();
  const revalidateOnFocus = options?.revalidateOnFocus ?? false;
  const revalidateOnReconnect = options?.revalidateOnReconnect ?? false;
  const routeKey = route?.getCacheKey?.(params, search, url);

  // Subscribe to cache changes for this specific key
  const data = useSyncExternalStore(
    (notify: () => void) => cache.subscribe(key, notify),
    () => cache.get(key) as T | undefined,
  );
  const isFetching = useSyncExternalStore(
    (notify: () => void) => cache.subscribe(key, notify),
    () => cache.isPending(key),
  );
  const isStale = data !== undefined && cache.isStale(key);

  const reconcileCurrentRoute = useCallback(() => {
    const hasData = cache.get(key) !== undefined;
    const staleOrMissing = !hasData || cache.isStale(key);

    if (
      !isNavigating &&
      routeKey === key &&
      route?.loadData &&
      !cache.isPending(key) &&
      staleOrMissing
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
  }, [cache, isNavigating, key, params, route, routeKey, url]);

  useEffect(() => {
    reconcileCurrentRoute();
  }, [reconcileCurrentRoute]);

  useEffect(() => {
    if ((!revalidateOnFocus && !revalidateOnReconnect) || !route?.loadData || routeKey !== key) {
      return;
    }

    const maybeRevalidate = () => {
      reconcileCurrentRoute();
    };

    const onVisibilityChange = () => {
      if (revalidateOnFocus && document.visibilityState === "visible") {
        maybeRevalidate();
      }
    };

    const onOnline = () => {
      if (revalidateOnReconnect) {
        maybeRevalidate();
      }
    };

    if (revalidateOnFocus) {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }
    if (revalidateOnReconnect) {
      window.addEventListener("online", onOnline);
    }

    return () => {
      if (revalidateOnFocus) {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
      if (revalidateOnReconnect) {
        window.removeEventListener("online", onOnline);
      }
    };
  }, [
    key,
    revalidateOnFocus,
    revalidateOnReconnect,
    reconcileCurrentRoute,
    route?.loadData,
    routeKey,
  ]);

  return {
    data,
    isLoading: !data,
    isFetching,
    isStale,
  };
}
