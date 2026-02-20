import { Link } from "@/router/components/Link";
import { usePokemonDetailState } from "@/components/hooks";

export function PokemonDetail() {
  const { pokemon, isLoading, error } = usePokemonDetailState();

  if (error) {
    return <div className="loading">Failed to load details: {error.message}</div>;
  }

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
