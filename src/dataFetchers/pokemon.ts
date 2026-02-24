export const pokemonCacheKeys = {
  list: (limit: number = 5) => `pokemon-list-${limit}`,
  detail: (id: string) => `pokemon-${id}`,
};

export type PokemonListItem = {
  name: string;
  url: string;
};

export type PokemonListResponse = {
  results: PokemonListItem[];
};

export type PokemonDetailResponse = {
  id: number;
  name: string;
  height: number;
  weight: number;
  sprites: {
    front_default: string | null;
  };
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

async function fetchJson<T>(url: string, signal?: AbortSignal) {
  const res = await fetch(url, { signal });

  if (!res.ok) {
    throw new HttpError(res.status, `Request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

// --- Data Fetchers ---
export function fetchPokemonList(limit: number = 5, signal?: AbortSignal) {
  return fetchJson<PokemonListResponse>(`https://pokeapi.co/api/v2/pokemon?limit=${limit}`, signal);
}

export function fetchPokemonDetail(id: string, signal?: AbortSignal) {
  return fetchJson<PokemonDetailResponse>(`https://pokeapi.co/api/v2/pokemon/${id}`, signal);
}
