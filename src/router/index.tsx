import { useMemo, createContext, useContext } from "react";
import { SimpleCache, globalCache } from "@/cache";
import type { RouteConfig, RouteMatch, RouteSearch } from "./routes";
import { useMatchedRoute, useNavigate, useRouteDataLoading, useRouterUrlString } from "./hooks";

type RouterContextType = {
  isNavigating: boolean;
  navigate: (path: string) => void;
  url: URL;
  route: RouteConfig | undefined;
  params: Record<string, string>;
  search: RouteSearch;
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
  const urlString = useRouterUrlString();
  const { url, match, search, route, params } = useMatchedRoute(urlString, matchRoute);
  const isNavigating = useRouteDataLoading(matchRoute, match, cache, url);
  const navigate = useNavigate();

  const value = useMemo(
    () => ({
      isNavigating,
      navigate,
      url,
      route,
      params,
      search,
    }),
    [isNavigating, navigate, params, route, search, url],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const context = useContext(RouterContext);

  if (!context) {
    const fallbackUrl = window.location.href;
    const url = new URL(fallbackUrl);

    return {
      url,
      path: url.pathname,
      query: url.searchParams,
      isNavigating: false,
      navigate: () => {},
      route: undefined,
      params: {},
      search: {},
    };
  }

  return {
    ...context,
    path: context.url.pathname,
    query: context.url.searchParams,
    route: context.route,
    params: context.params,
    search: context.search,
  };
}
export { loadRouteData } from "./hooks";
