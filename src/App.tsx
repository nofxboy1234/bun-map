import React, { useState, useEffect, useRef } from "react";
import { useRouter, Link, useCache } from "./simple-router";
import "./index.css";

// --- Helpers ---
// A hook to safely get data from cache, or fetch it if missing (e.g. on page reload).
// This matches the "subscription initialization" pattern.
function useData<T>(key: string, fetcher: () => Promise<T>) {
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

// --- Components ---

function PokemonDetail() {
  const { query } = useRouter();
  const id = query.get("id");
  const cacheKey = `pokemon-${id}`;

  // If we navigated via Link, this is instant (Sync).
  // If we reloaded, it fetches (Async).
  const pokemon = useData(cacheKey, async () => {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    return res.json();
  });

  if (!pokemon) return <div className="loading">Loading details...</div>;

  return (
    <div className="card">
      <Link href="/" className="back-link">← Back to List</Link>
      <h2>{pokemon.name}</h2>
      <img 
        src={pokemon.sprites.front_default} 
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

function PokemonList() {
  const cache = useCache();
  const cacheKey = "pokemon-list";
  const list = useData(cacheKey, async () => {
    const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=5");
    return res.json();
  });

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
              // This makes the next screen render instantly with data.
              prefetch={() => cache.fetch(detailKey, async () => {
                const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
                return res.json();
              })}
            >
              {p.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function App() {
  const { path } = useRouter();

  // Simple Switch Router
  let content;
  if (path === "/" || path === "/ssr") {
    content = <PokemonList />;
  } else if (path === "/pokemon") {
    content = <PokemonDetail />;
  } else {
    content = <div>Not Found</div>;
  }

  return (
    <div className="app-container">
      <header>
        <h1>⚡ Bun Router Demo</h1>
      </header>
      <main>{content}</main>
    </div>
  );
}

export default App;
