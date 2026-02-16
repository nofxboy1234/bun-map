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
}: {
  children: React.ReactNode;
  matchRoute: (path: string) => RouteMatch | undefined;
  cache?: SimpleCache;
}) {
  const [isNavigating, setIsNavigating] = useState(() => {
    const currentUrl = new URL(getSnapshot());
    const currentMatch = matchRoute(currentUrl.pathname);
    return !!currentMatch?.route.loadData;
  });

  // Uses useSyncExternalStore to subscribe to URL changes efficiently
  const urlString = useSyncExternalStore(subscribe, getSnapshot);

  const url = useMemo(() => new URL(urlString), [urlString]);
  const match = useMemo(() => matchRoute(url.pathname), [url.pathname, matchRoute]);
  const loadSeqRef = useRef(0);

  const navigate = useCallback((path: string) => {
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

    if (!match?.route.loadData) {
      setIsNavigating(false);
      return () => {
        cancelled = true;
      };
    }

    setIsNavigating(true);
    loadRouteData(match, cache, url)
      .catch((err) => {
        console.error("Route data load failed", err);
      })
      .finally(() => {
        if (!cancelled && currentSeq === loadSeqRef.current) {
          setIsNavigating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [match, cache, url]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    const initialUrl = window.location.href;

    const url = new URL(initialUrl);
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

export async function loadRouteData(match: RouteMatch | undefined, cache: SimpleCache, url: URL) {
  if (!match?.route.loadData) return;
  await match.route.loadData(cache, match.params, url);
}
