import {
  useSyncExternalStore,
  useMemo,
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { SimpleCache, globalCache } from "@/cache";
import type { RouteConfig, RouteMatch } from "./routes";

const SSR_BASE_URL = "http://localhost";

function getAbsoluteUrl(pathOrUrl?: string) {
  return new URL(pathOrUrl || "/", SSR_BASE_URL).href;
}

function isAbortError(err: unknown) {
  return err instanceof DOMException
    ? err.name === "AbortError"
    : (err as { name?: string })?.name === "AbortError";
}

type RouterContextType = {
  isNavigating: boolean;
  navigate: (path: string) => void;
  url: URL;
  route: RouteConfig | undefined;
  params: Record<string, string>;
};

const RouterContext = createContext<RouterContextType | null>(null);

export function RouterProvider({
  children,
  matchRoute,
  cache = globalCache,
  initialPath,
  staticMode = false,
}: {
  children: React.ReactNode;
  matchRoute: (path: string) => RouteMatch | undefined;
  cache?: SimpleCache;
  initialPath?: string;
  staticMode?: boolean;
}) {
  const initialUrlString = useMemo(() => {
    if (typeof window !== "undefined") {
      return window.location.href;
    }

    return getAbsoluteUrl(initialPath);
  }, [initialPath]);

  const subscribe = useCallback(
    (callback: () => void) => {
      if (staticMode || typeof window === "undefined") {
        return () => {};
      }

      window.addEventListener("popstate", callback);
      window.addEventListener("pushstate", callback);

      return () => {
        window.removeEventListener("popstate", callback);
        window.removeEventListener("pushstate", callback);
      };
    },
    [staticMode],
  );

  const getClientSnapshot = useCallback(() => {
    if (typeof window === "undefined") {
      return initialUrlString;
    }

    return window.location.href;
  }, [initialUrlString]);

  const getServerSnapshot = useCallback(() => initialUrlString, [initialUrlString]);

  const [isNavigating, setIsNavigating] = useState(() => {
    const currentUrl = new URL(initialUrlString);
    const currentMatch = matchRoute(currentUrl.pathname);
    return !!currentMatch?.route.loadData;
  });

  // Uses useSyncExternalStore to subscribe to URL changes efficiently
  const urlString = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  const url = useMemo(() => new URL(urlString), [urlString]);
  const match = useMemo(() => matchRoute(url.pathname), [url.pathname, matchRoute]);
  const loadSeqRef = useRef(0);
  const loadAbortRef = useRef<AbortController | null>(null);

  const navigate = useCallback(
    (path: string) => {
      if (staticMode || typeof window === "undefined") {
        return;
      }

      const targetUrl = new URL(path, window.location.origin);
      if (
        targetUrl.pathname === window.location.pathname &&
        targetUrl.search === window.location.search
      ) {
        return;
      }

      window.history.pushState(null, "", path);
      window.dispatchEvent(new Event("pushstate"));
    },
    [staticMode],
  );

  const value = useMemo(
    () => ({
      isNavigating,
      navigate,
      url,
      route: match?.route,
      params: match?.params || {},
    }),
    [isNavigating, url, match, navigate],
  );

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

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    const fallbackUrl = typeof window !== "undefined" ? window.location.href : getAbsoluteUrl("/");
    const url = new URL(fallbackUrl);
    return {
      url,
      path: url.pathname,
      query: url.searchParams,
      isNavigating: false,
      navigate: () => {},
      route: undefined,
      params: {},
    };
  }

  return {
    ...context,
    path: context.url.pathname,
    query: context.url.searchParams,
    route: context.route,
    params: context.params,
  };
}

export async function loadRouteData(
  match: RouteMatch | undefined,
  cache: SimpleCache,
  url: URL,
  signal?: AbortSignal,
) {
  if (!match?.route.loadData) return;
  await match.route.loadData(cache, match.params, url, signal);
}
