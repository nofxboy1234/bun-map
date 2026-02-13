import { SimpleCache } from "@/cache";
import { fetchPokemonList, fetchPokemonDetail } from "@/dataFetchers/pokemon";
import { PokemonList } from "@/components/PokemonList";
import { PokemonDetail } from "@/components/PokemonDetail";

export type RouteConfig = {
  path: string;
  component: React.ComponentType;
  loadData?: (cache: SimpleCache, params: Record<string, string>, url: URL) => Promise<any>;
};

export const routes: RouteConfig[] = [
  {
    path: "/",
    component: PokemonList,
    loadData: (cache) => cache.fetch("pokemon-list", fetchPokemonList),
  },
  {
    path: "/pokemon/:id",
    component: PokemonDetail,
    loadData: (cache, params) => {
      const { id } = params;
      return cache.fetch(`pokemon-${id}`, () => fetchPokemonDetail(id));
    },
  },
];

function matchPath(routePath: string, currentPath: string) {
  const routeParts = routePath.split("/").filter(Boolean);
  const currentParts = currentPath.split("/").filter(Boolean);

  if (routeParts.length !== currentParts.length) return null;

  const params: Record<string, string> = {};

  for (let i = 0; i < routeParts.length; i++) {
    const routePart = routeParts[i]!;
    const currentPart = currentParts[i]!;

    if (routePart.startsWith(":")) {
      params[routePart.slice(1)] = currentPart;
    } else if (routePart !== currentPart) {
      return null;
    }
  }

  return params;
}

// Helper to find a matching route
export function matchRoute(
  pathname: string,
): { route: RouteConfig; params: Record<string, string> } | undefined {
  for (const route of routes) {
    // Exact match for root or static paths
    if (route.path === pathname) {
      return { route, params: {} };
    }

    // Param match
    const params = matchPath(route.path, pathname);
    if (params) {
      return { route, params };
    }
  }
  return undefined;
}
