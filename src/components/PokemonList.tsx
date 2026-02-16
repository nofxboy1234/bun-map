import { Link } from "@/router/components/Link";
import { useData } from "@/components/hooks";
import { pokemonCacheKeys } from "@/dataFetchers/pokemon";

export function PokemonList() {
  const cacheKey = pokemonCacheKeys.list;
  const { data: list, isLoading } = useData<any>(cacheKey);

  if (isLoading || !list) return <div className="loading">Loading list...</div>;

  return (
    <div className="list-container">
      <h2>Select a Pokemon</h2>
      <div className="grid">
        {list.results.map((p: any) => {
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
