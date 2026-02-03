import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter, Link, useCache } from "./simple-router";

// --- Helpers ---
export function useData<T>(key: string, fetcher: () => Promise<T>) {
  const cache = useCache();

  // 1. Subscribe to cache changes using useSyncExternalStore
  const data = useSyncExternalStore(
    (notify: () => void) => cache.subscribe(notify),
    () => cache.get(key),
    () => cache.get(key), // Server snapshot
  );

  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(!data);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // If we have data, we're not loading (unless we want to implement background refresh)
    if (data) {
      setLoading(false);
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    setLoading(true);
    cache
      .fetch(key, fetcher)
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [key, data, fetcher, cache]);

  return { data, error, isLoading: loading };
}

// --- Data Fetchers ---
// Exported so routes.tsx can use them for server-side prefetching
export const fetchPokemonList = async () => {
  const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=5");
  return res.json();
};

export const fetchPokemonDetail = async (id: string) => {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  return res.json();
};

// --- Components ---

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

export function PokemonList() {
  const cache = useCache();
  const cacheKey = "pokemon-list";
  const { data: list, error, isLoading } = useData(cacheKey, fetchPokemonList);

  if (error) return <div className="error">Error: {error.message}</div>;
  if (isLoading || !list) return <div className="loading">Loading list...</div>;

  return (
    <div className="list-container">
      <h2>Select a Pokemon</h2>
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
              prefetch={() => cache.fetch(detailKey, () => fetchPokemonDetail(id), 1000 * 5)}
            >
              {p.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
