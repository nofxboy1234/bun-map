import { useSyncExternalStore, useMemo, useState, useEffect, useCallback, useRef } from "react";
import type { SimpleCache } from "@/cache";
import { validateRouteSearch, type RouteConfig, type RouteMatch, type RouteSearch } from "./routes";

function isAbortError(err: unknown) {
  return err instanceof DOMException
    ? err.name === "AbortError"
    : (err as { name?: string })?.name === "AbortError";
}

export function useRouterUrlString() {
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener("popstate", callback);
    window.addEventListener("pushstate", callback);

    return () => {
      window.removeEventListener("popstate", callback);
      window.removeEventListener("pushstate", callback);
    };
  }, []);

  const getClientSnapshot = useCallback(() => window.location.href, []);

  // Uses useSyncExternalStore to subscribe to URL changes efficiently
  return useSyncExternalStore(subscribe, getClientSnapshot);
}

export function useMatchedRoute(
  urlString: string,
  matchRoute: (path: string) => RouteMatch | undefined,
) {
  const url = useMemo(() => new URL(urlString), [urlString]);
  const match = useMemo(() => matchRoute(url.pathname), [url.pathname, matchRoute]);
  const search = useMemo<RouteSearch>(
    () => validateRouteSearch(match?.route, url),
    [match?.route, url],
  );
  const route = match?.route;
  const params = useMemo(() => match?.params ?? {}, [match]);

  return {
    url,
    match,
    search,
    route,
    params,
  };
}

export function useNavigate() {
  return useCallback((path: string) => {
    const targetUrl = new URL(path, window.location.origin);
    if (
      targetUrl.pathname === window.location.pathname &&
      targetUrl.search === window.location.search
    ) {
      return;
    }

    window.history.pushState(null, "", path);
    window.dispatchEvent(new Event("pushstate"));
  }, []);
}

export function useRouteDataLoading(
  matchRoute: (path: string) => RouteMatch | undefined,
  match: RouteMatch | undefined,
  cache: SimpleCache,
  url: URL,
) {
  const [isNavigating, setIsNavigating] = useState(() => {
    const currentUrl = new URL(window.location.href);
    const currentMatch = matchRoute(currentUrl.pathname);
    return !!currentMatch?.route.loadData;
  });
  const loadSeqRef = useRef(0);
  const loadAbortRef = useRef<AbortController | null>(null);

  // Handle Initial Load and Popstate (Back/Forward)
  useEffect(() => {
    let cancelled = false;
    const currentSeq = ++loadSeqRef.current;
    loadAbortRef.current?.abort();
    loadAbortRef.current = null;

    if (!match?.route.loadData) {
      setIsNavigating(false);
      return () => {
        cancelled = true;
      };
    }

    const controller = new AbortController();
    loadAbortRef.current = controller;

    setIsNavigating(true);
    loadRouteData(match, cache, url, controller.signal)
      .catch((err) => {
        if (isAbortError(err)) {
          return;
        }
        console.error("Route data load failed", err);
      })
      .finally(() => {
        if (
          !cancelled &&
          currentSeq === loadSeqRef.current &&
          loadAbortRef.current === controller
        ) {
          setIsNavigating(false);
          loadAbortRef.current = null;
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
      if (loadAbortRef.current === controller) {
        loadAbortRef.current = null;
      }
    };
  }, [match, cache, url]);

  return isNavigating;
}

export async function loadRouteData(
  match: RouteMatch | undefined,
  cache: SimpleCache,
  url: URL,
  signal?: AbortSignal,
) {
  if (!match?.route.loadData) return;
  const search = validateRouteSearch(match.route, url);
  await match.route.loadData(cache, match.params, search, url, signal);
}

export type { RouteConfig, RouteMatch, RouteSearch };
