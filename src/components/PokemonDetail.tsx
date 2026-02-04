import { useRouter } from "@/router";
import { Link } from "@/router/components/Link";
import { fetchPokemonDetail } from "@/dataFetchers/pokemon";
import { useData } from "@/components/hooks";

export function PokemonDetail() {
  const { query } = useRouter();
  const id = query.get("id");

  if (!id) return <div>Missing ID</div>;

  const cacheKey = `pokemon-${id}`;
  const { data: pokemon, error, isLoading } = useData(cacheKey, () => fetchPokemonDetail(id));

  if (error) return <div className="error">Error: {error.message}</div>;
  if (isLoading || !pokemon) return <div className="loading">Loading details...</div>;

  return (
    <div className="card">
      <Link href="/" className="back-link">
        ← Back to List
      </Link>
      <h2>{pokemon.name}</h2>
      <img src={pokemon.sprites.front_default} alt={pokemon.name} className="pixel-art" />
      <div className="stats">
        <p>Height: {pokemon.height}</p>
        <p>Weight: {pokemon.weight}</p>
      </div>
    </div>
  );
}
