import { useRouter } from "@/router";
import { Link } from "@/router/components/Link";
import { useData } from "@/components/hooks";
import type { PokemonDetailResponse } from "@/dataFetchers/pokemon";
import { pokemonCacheKeys } from "@/dataFetchers/pokemon";

export function PokemonDetail() {
  const { params } = useRouter();
  const id = params.id;

  const cacheKey = pokemonCacheKeys.detail(id!);
  const { data: pokemon, isLoading } = useData<PokemonDetailResponse>(cacheKey, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  if (isLoading || !pokemon) return <div className="loading">Loading details...</div>;

  return (
    <div className="card">
      <Link href="/" className="back-link">
        ← Back to List
      </Link>
      <h2>{pokemon.name}</h2>
      <img
        src={pokemon.sprites.front_default ?? undefined}
        alt={pokemon.name}
        className="pixel-art"
      />
      <div className="stats">
        <p>Height: {pokemon.height}</p>
        <p>Weight: {pokemon.weight}</p>
      </div>
    </div>
  );
}
