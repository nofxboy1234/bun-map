import {
  useSyncExternalStore,
  useMemo,
  createContext,
  useContext,
  useState,
  useEffect,
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

// Context to pass the server URL during SSR
const ServerContext = createContext<string | null>(null);

export function RouterProvider({
  children,
  matchRoute,
  cache = globalCache,
}: {
  children: React.ReactNode;
  matchRoute: (path: string) => { route: RouteConfig; params: Record<string, string> } | undefined;
  cache?: SimpleCache;
}) {
  const serverUrl = useContext(ServerContext);
  const [isNavigating, setIsNavigating] = useState(false);

  // Uses useSyncExternalStore to subscribe to URL changes efficiently
  const urlString = useSyncExternalStore(subscribe, getSnapshot, () => {
    if (serverUrl) return serverUrl;
    if (typeof window !== "undefined" && (window as any).__SSR_URL__) {
      return (window as any).__SSR_URL__;
    }
    return "http://localhost/";
  });

  const url = useMemo(() => new URL(urlString), [urlString]);
  const match = useMemo(() => matchRoute(url.pathname), [url.pathname, matchRoute]);

  const navigate = async (path: string) => {
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
  };

  const value = useMemo(
    () => ({
      isNavigating,
      navigate,
      url,
      route: match?.route,
      params: match?.params || {},
    }),
    [isNavigating, url, match],
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

    handleNavigation();

    window.addEventListener("popstate", handleNavigation);
    return () => window.removeEventListener("popstate", handleNavigation);
  }, [cache, matchRoute]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function ServerRouter({ url, children }: { url: string; children: React.ReactNode }) {
  return <ServerContext.Provider value={url}>{children}</ServerContext.Provider>;
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    // Fallback for SSR or when Provider is missing
    const serverUrl = useContext(ServerContext);
    const initialUrl =
      serverUrl ||
      (typeof window !== "undefined" ? (window as any).__SSR_URL__ : null) ||
      "http://localhost/";

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
