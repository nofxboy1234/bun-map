import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useCache } from "@/cache";
import { loadRouteData, useRouter } from "@/router";
import {
  pokemonCacheKeys,
  type PokemonDetailResponse,
  type PokemonListResponse,
} from "@/dataFetchers/pokemon";
import { getPokemonListLimit } from "@/router/routes";
import { isAbortError } from "@/utils/errors";

/**
 * useData is primarily a cache consumer.
 * It can also trigger non-abortable load reconciliation when current-route data
 * is missing or stale so the UI does not get stuck loading.
 */
type UseDataOptions = {
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
};

const ROUTE_REVALIDATE_OPTIONS: UseDataOptions = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
};

function getRequiredRouteParam(params: Record<string, string>, key: string) {
  const value = params[key];
  if (!value) {
    throw new Error(`Missing required route param "${key}".`);
  }

  return value;
}

function toDisplayError(err: unknown) {
  if (err instanceof Error) {
    return err;
  }
  return new Error("Failed to load route data.");
}

export function useData<T>(key: string, options?: UseDataOptions) {
  const cache = useCache();
  const { route, params, search, url, isNavigating } = useRouter();
  const revalidateOnFocus = options?.revalidateOnFocus ?? false;
  const revalidateOnReconnect = options?.revalidateOnReconnect ?? false;
  const routeKey = route?.getCacheKey?.(params, search, url);
  const [error, setError] = useState<Error | null>(null);

  useSyncExternalStore(
    (notify: () => void) => cache.subscribe(key, notify),
    () => cache.getVersion(key),
  );
  const data = cache.get(key) as T | undefined;
  const isFetching = cache.isPending(key);
  const isStale = data !== undefined && cache.isStale(key);

  useEffect(() => {
    setError(null);
  }, [key]);

  useEffect(() => {
    if (data !== undefined && error) {
      setError(null);
    }
  }, [data, error]);

  const reconcileCurrentRoute = useCallback(() => {
    const staleOrMissing = data === undefined || isStale || cache.isStale(key);

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
        setError(toDisplayError(err));
        console.error("Route data reconciliation failed", {
          key,
          path: url.pathname,
          err,
        });
      });
    }
  }, [cache, data, isNavigating, isStale, key, params, route, routeKey, url]);

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
    isLoading: data === undefined && error === null,
    isFetching,
    isStale,
    error,
  };
}

export function useAppContentState() {
  const { route } = useRouter();
  const [count, setCount] = useState(0);

  const incrementCount = useCallback(() => {
    setCount((value) => value + 1);
  }, []);

  return {
    count,
    incrementCount,
    routeComponent: route?.component,
  };
}

type PokemonListItem = {
  id: string | undefined;
  name: string;
};

export function usePokemonListState() {
  const { search } = useRouter();
  const limit = getPokemonListLimit(search);
  const cacheKey = useMemo(() => pokemonCacheKeys.list(limit), [limit]);
  const {
    data: list,
    isLoading,
    error,
  } = useData<PokemonListResponse>(cacheKey, ROUTE_REVALIDATE_OPTIONS);

  const items = useMemo<PokemonListItem[]>(() => {
    if (!list) {
      return [];
    }

    return list.results.map((pokemon) => ({
      id: pokemon.url.split("/").filter(Boolean).pop(),
      name: pokemon.name,
    }));
  }, [list]);

  return {
    list,
    items,
    isLoading,
    error,
  };
}

export function usePokemonDetailState() {
  const { params } = useRouter();
  const id = getRequiredRouteParam(params, "id");
  const cacheKey = useMemo(() => pokemonCacheKeys.detail(id), [id]);
  const {
    data: pokemon,
    isLoading,
    error,
  } = useData<PokemonDetailResponse>(cacheKey, ROUTE_REVALIDATE_OPTIONS);

  return {
    pokemon,
    isLoading,
    error,
  };
}
