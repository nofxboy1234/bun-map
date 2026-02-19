import { Link } from "@/router/components/Link";
import { usePokemonListState } from "@/components/hooks";

export function PokemonList() {
  const { list, items, isLoading } = usePokemonListState();

  if (isLoading || !list) return <div className="loading">Loading list...</div>;

  return (
    <div className="list-container">
      <h2>Select a Pokemon</h2>
      <div className="grid">
        {items.map((item) => {
          return (
            <div key={item.id}>
              <Link href={`/pokemon/${item.id}`} className="list-item">
                {item.name}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
