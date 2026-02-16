export const pokemonCacheKeys = {
  list: "pokemon-list",
  detail: (id: string) => `pokemon-${id}`,
};

// --- Data Fetchers ---
export const fetchPokemonList = async (signal?: AbortSignal) => {
  const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=5", { signal });
  return res.json();
};

export const fetchPokemonDetail = async (id: string, signal?: AbortSignal) => {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`, { signal });
  return res.json();
};
