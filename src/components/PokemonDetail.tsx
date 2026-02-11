import { useRouter } from "@/router";
import { Link } from "@/router/components/Link";
import { useData } from "@/components/hooks";
import { Hello } from "@/components/Hello";

export function PokemonDetail() {
  const { params } = useRouter();
  const id = params.id;

  if (!id) return <div>Missing ID</div>;

  const cacheKey = `pokemon-${id}`;
  const { data: pokemon, isLoading } = useData<any>(cacheKey);

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
      <Hello />
    </div>
  );
}
