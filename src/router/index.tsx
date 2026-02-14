import {
  useSyncExternalStore,
  useMemo,
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { SimpleCache, globalCache } from "@/cache";
import type { RouteConfig } from "./routes";

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

type RouterContextType = {
  isNavigating: boolean;
  navigate: (path: string) => Promise<void>;
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
  matchRoute: (path: string) => { route: RouteConfig; params: Record<string, string> } | undefined;
  cache?: SimpleCache;
}) {
  const [isNavigating, setIsNavigating] = useState(false);

  // Uses useSyncExternalStore to subscribe to URL changes efficiently
  const urlString = useSyncExternalStore(subscribe, getSnapshot);

  const url = useMemo(() => new URL(urlString), [urlString]);
  const match = useMemo(() => matchRoute(url.pathname), [url.pathname, matchRoute]);

  const navigate = useCallback(
    async (path: string) => {
      const targetUrl = new URL(path, window.location.origin);
      const targetMatch = matchRoute(targetUrl.pathname);

      setIsNavigating(true);
      try {
        if (targetMatch?.route.loadData) {
          await targetMatch.route.loadData(cache, targetMatch.params, targetUrl);
        }
      } finally {
        setIsNavigating(false);
      }

      window.history.pushState(null, "", path);
      window.dispatchEvent(historyEvent);
    },
    [matchRoute, cache],
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
    if (match?.route.loadData) {
      setIsNavigating(true);
      match.route.loadData(cache, match.params, url).finally(() => {
        setIsNavigating(false);
      });
    }
    // We only want this to run when the matched route or parameters change,
    // which happens on initial load, programmatic navigate(), or browser back/forward.
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
      navigate: async () => {},
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
