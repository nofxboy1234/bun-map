import { Link } from "@/router/components/Link";
import { useData } from "@/components/hooks";
import type { PokemonListResponse } from "@/dataFetchers/pokemon";
import { pokemonCacheKeys } from "@/dataFetchers/pokemon";
import { useRouter } from "@/router";
import { getPokemonListLimit } from "@/router/routes";

export function PokemonList() {
  const { search } = useRouter();
  const limit = getPokemonListLimit(search);
  const cacheKey = pokemonCacheKeys.list(limit);
  const { data: list, isLoading } = useData<PokemonListResponse>(cacheKey, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  if (isLoading || !list) return <div className="loading">Loading list...</div>;

  return (
    <div className="list-container">
      <h2>Select a Pokemon</h2>
      <div className="grid">
        {list.results.map((p) => {
          const id = p.url.split("/").filter(Boolean).pop();

          return (
            <div key={id}>
              <Link href={`/pokemon/${id}`} className="list-item">
                {p.name}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
