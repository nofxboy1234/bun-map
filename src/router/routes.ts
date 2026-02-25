import { routeFetchOptions, SimpleCache } from "@/cache";
import { fetchPokemonList, fetchPokemonDetail, pokemonCacheKeys } from "@/dataFetchers/pokemon";
import { PokemonList } from "@/components/PokemonList";
import { PokemonDetail } from "@/components/PokemonDetail";

export type RouteSearch = Record<string, unknown>;

export type RouteConfig = {
  path: string;
  component: React.ComponentType;
  validateParams?: (params: Record<string, string>) => Record<string, string>;
  validateSearch?: (search: URLSearchParams) => RouteSearch;
  getCacheKey?: (params: Record<string, string>, search: RouteSearch, url: URL) => string;
  loadData?: (
    cache: SimpleCache,
    params: Record<string, string>,
    search: RouteSearch,
    url: URL,
    signal?: AbortSignal,
  ) => Promise<unknown>;
};

export type RouteMatch = {
  route: RouteConfig;
  params: Record<string, string>;
};

const DEFAULT_LIST_LIMIT = 5;

export function getPokemonListLimit(search: RouteSearch) {
  return typeof search.limit === "number" ? search.limit : DEFAULT_LIST_LIMIT;
}

export const routes: RouteConfig[] = [
  {
    path: "/",
    validateSearch: (search) => {
      const rawLimit = search.get("limit");
      const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : Number.NaN;
      const limit =
        Number.isFinite(parsedLimit) && parsedLimit >= 1 && parsedLimit <= 50
          ? parsedLimit
          : DEFAULT_LIST_LIMIT;
      return { limit };
    },
    getCacheKey: (_params, search) => pokemonCacheKeys.list(getPokemonListLimit(search)),
    component: PokemonList,
    loadData: (cache, _params, search, _url, signal) =>
      cache.fetch(
        pokemonCacheKeys.list(getPokemonListLimit(search)),
        () => fetchPokemonList(getPokemonListLimit(search), signal),
        routeFetchOptions({
          signal,
          staleTime: 30_000,
          gcTime: 45_000,
        }),
      ),
  },
  {
    path: "/pokemon/:id",
    validateParams: (params) => {
      const id = params.id;

      if (!id || !/^\d+$/.test(id) || Number(id) < 1) {
        throw new Error("Invalid pokemon id");
      }

      return { id };
    },
    getCacheKey: (params) => pokemonCacheKeys.detail(params.id!),
    component: PokemonDetail,
    loadData: (cache, params, _search, _url, signal) => {
      const { id } = params;
      return cache.fetch(
        pokemonCacheKeys.detail(id!),
        () => fetchPokemonDetail(id!, signal),
        routeFetchOptions({
          signal,
          staleTime: 60_000,
          gcTime: 90_000,
        }),
      );
    },
  },
];

type ParamRouteEntry = {
  route: RouteConfig;
  parts: string[];
};

const staticRouteMap = new Map<string, RouteConfig>();
const paramRouteEntries: ParamRouteEntry[] = [];

for (const route of routes) {
  if (route.path.includes(":")) {
    paramRouteEntries.push({
      route,
      parts: route.path.split("/").filter(Boolean),
    });

    continue;
  }

  staticRouteMap.set(route.path, route);
}

function matchStatic(staticRoute: RouteConfig): RouteMatch | undefined {
  return withValidatedParams(staticRoute, {});
}

function withValidatedParams(
  route: RouteConfig,
  params: Record<string, string>,
): RouteMatch | undefined {
  try {
    return { route, params: route.validateParams?.(params) ?? params };
  } catch {
    return undefined;
  }
}

function matchDynamic(pathname: string): RouteMatch | undefined {
  const currentParts = pathname.split("/").filter(Boolean);

  for (const entry of paramRouteEntries) {
    if (entry.parts.length !== currentParts.length) {
      continue;
    }

    const params: Record<string, string> = {};
    let matched = true;

    for (let i = 0; i < entry.parts.length; i++) {
      const routePart = entry.parts[i]!;
      const currentPart = currentParts[i]!;

      if (routePart.startsWith(":")) {
        params[routePart.slice(1)] = currentPart;
      } else if (routePart !== currentPart) {
        matched = false;
        break;
      }
    }

    if (matched) {
      const match = withValidatedParams(entry.route, params);
      if (match) {
        return match;
      }
    }
  }

  return undefined;
}

// Helper to find a matching route
export function matchRoute(pathname: string): RouteMatch | undefined {
  // Static route lookup is O(1); dynamic route matching scans only param routes.
  const staticRoute = staticRouteMap.get(pathname);
  return staticRoute ? matchStatic(staticRoute) : matchDynamic(pathname);
}

export function validateRouteSearch(route: RouteConfig | undefined, url: URL): RouteSearch {
  if (!route?.validateSearch) {
    return Object.fromEntries(url.searchParams.entries());
  }

  return route.validateSearch(url.searchParams);
}
