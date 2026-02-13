import {
  useSyncExternalStore,
  useMemo,
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { SimpleCache, globalCache } from "@/cache";
import type { RouteConfig } from "./routes";

const historyEvent = typeof window !== "undefined" ? new Event("pushstate") : null;

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};

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
  const isFirstRender = useRef(true);

  // Uses useSyncExternalStore to subscribe to URL changes efficiently
  const urlString = useSyncExternalStore(subscribe, getSnapshot, () => "http://localhost/");

  const url = useMemo(() => new URL(urlString), [urlString]);
  const match = useMemo(() => matchRoute(url.pathname), [url.pathname, matchRoute]);

  const navigate = useCallback(
    async (path: string) => {
      if (typeof window === "undefined") return;

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
      if (historyEvent) window.dispatchEvent(historyEvent);
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
    const handleNavigation = async () => {
      const currentUrl = new URL(window.location.href);
      const currentMatch = matchRoute(currentUrl.pathname);

      if (currentMatch?.route.loadData) {
        setIsNavigating(true);
        try {
          await currentMatch.route.loadData(cache, currentMatch.params, currentUrl);
        } finally {
          setIsNavigating(false);
        }
      }
    };

    if (isFirstRender.current) {
      isFirstRender.current = false;
    } else {
      handleNavigation();
    }

    window.addEventListener("popstate", handleNavigation);
    return () => window.removeEventListener("popstate", handleNavigation);
  }, [cache, matchRoute]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    const initialUrl = typeof window !== "undefined" ? window.location.href : "http://localhost/";

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
