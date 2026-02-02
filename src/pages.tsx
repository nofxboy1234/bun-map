import { useState, useEffect, useRef } from "react";
import { useRouter, Link, useCache } from "./simple-router";

// --- Helpers ---
// A hook to safely get data from cache, or fetch it if missing (e.g. on page reload).
export function useData<T>(key: string, fetcher: () => Promise<T>) {
  const cache = useCache();
  const [data, setData] = useState<T | undefined>(cache.get(key));
  const fetchedRef = useRef(false);

  useEffect(() => {
    // If we already have data (from prefetch), do nothing.
    if (data) return;

    // Prevent double-fetching in StrictMode
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    cache.fetch(key, fetcher).then((newData) => {
      setData(newData);
    });
  }, [key, data, fetcher, cache]);

  return data;
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

  const pokemon = useData(cacheKey, () => fetchPokemonDetail(id));

  if (!pokemon) return <div className="loading">Loading details...</div>;

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
  const list = useData(cacheKey, fetchPokemonList);

  if (!list) return <div className="loading">Loading list...</div>;

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
              prefetch={() => cache.fetch(detailKey, () => fetchPokemonDetail(id), 1000 * 15)}
            >
              {p.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
