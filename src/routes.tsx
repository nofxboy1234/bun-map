import { SimpleCache } from "./simple-router";
import { PokemonList, PokemonDetail, fetchPokemonList, fetchPokemonDetail } from "./pages";

export type RouteConfig = {
  path: string;
  component: React.ComponentType;
  loadData?: (cache: SimpleCache, url: URL) => Promise<any>;
};

export const routes: RouteConfig[] = [
  {
    path: "/",
    component: PokemonList,
    loadData: (cache) => cache.fetch("pokemon-list", fetchPokemonList),
  },
  {
    path: "/ssr",
    component: PokemonList,
    loadData: (cache) => cache.fetch("pokemon-list", fetchPokemonList),
  },
  {
    path: "/pokemon",
    component: PokemonDetail,
    loadData: (cache, url) => {
      const id = url.searchParams.get("id");
      if (id) {
        return cache.fetch(`pokemon-${id}`, () => fetchPokemonDetail(id));
      }
      return Promise.resolve();
    },
  },
];

// Helper to find a matching route
export function matchRoute(pathname: string): RouteConfig | undefined {
  return routes.find((r) => r.path === pathname);
}
