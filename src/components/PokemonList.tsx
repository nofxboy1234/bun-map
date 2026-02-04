import { Link } from "@/router/components/Link";
import { useCache } from "@/cache";
import { fetchPokemonDetail, fetchPokemonList } from "@/dataFetchers/pokemon";
import { useData } from "@/components/hooks";

export function PokemonList() {
  const cache = useCache();
  const cacheKey = "pokemon-list";
  const { data: list, error, isLoading } = useData(cacheKey, fetchPokemonList);

  if (error) return <div className="error">Error: {error.message}</div>;
  if (isLoading || !list) return <div className="loading">Loading list...</div>;

  return (
    <div className="list-container">
      <h2>Select a Pokemon!!!</h2>
      <div className="grid">
        {list.results.map((p: any) => {
          const id = p.url.split("/").filter(Boolean).pop();
          const detailKey = `pokemon-${id}`;

          return (
            <Link
              key={id}
              href={`/pokemon?id=${id}`}
              className="list-item"
              // The Magic: Fetch details BEFORE navigating.
              prefetch={() => cache.fetch(detailKey, () => fetchPokemonDetail(id))}
            >
              {p.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
