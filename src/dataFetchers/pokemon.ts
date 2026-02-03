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
