import { useSyncExternalStore } from "react";
import { useCache } from "@/cache";

/**
 * useData now acts as a passive consumer of the cache.
 * Data is expected to be pre-loaded by the Router or a Prefetch action.
 */
export function useData<T>(key: string) {
  const cache = useCache();

  // Subscribe to cache changes for this specific key
  const data = useSyncExternalStore(
    (notify: () => void) => cache.subscribe(key, notify),
    () => cache.get(key) as T | undefined,
    () => cache.get(key) as T | undefined, // Server snapshot
  );

  return {
    data,
    isLoading: !data,
    // Note: error handling should now ideally be handled at the router level
    // or by checking if data is missing after navigation completes.
  };
}
