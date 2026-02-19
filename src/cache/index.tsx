import { createContext, useContext } from "react";
import { SimpleCache } from "./simpleCache";

export {
  SimpleCache,
  routeFetchOptions,
  type CacheFetchOptions,
  type DedupeMode,
} from "./simpleCache";

// Global default cache for client-side usage (singleton)
export const globalCache = new SimpleCache();

const CacheContext = createContext<SimpleCache>(globalCache);

export function CacheProvider({
  cache,
  children,
}: {
  cache: SimpleCache;
  children: React.ReactNode;
}) {
  return <CacheContext.Provider value={cache}>{children}</CacheContext.Provider>;
}

export function useCache() {
  return useContext(CacheContext);
}
