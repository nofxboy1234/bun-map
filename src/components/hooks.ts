import { useRef, useSyncExternalStore, type DependencyList } from "react";
import { useCache } from "@/cache";

export function useEffectDepLogger(deps: DependencyList, effectDepsHistory: DependencyList[]) {
  console.log(deps);
  effectDepsHistory.push(deps);

  const prev = effectDepsHistory[effectDepsHistory.length - 2]!;
  const curr = effectDepsHistory[effectDepsHistory.length - 1]!;

  if (effectDepsHistory.length > 1) {
    console.log(`key dep changed?: ${!Object.is(curr[0], prev[0])}`);
    console.log(`data dep changed?: ${!Object.is(curr[1], prev[1])}`);
  } else {
    console.log("key dep init");
    console.log("data dep init");
  }
}

/**
 * useData now acts as a passive consumer of the cache.
 * Data is expected to be pre-loaded by the Router or a Prefetch action.
 */
export function useData<T>(key: string) {
  const cache = useCache();
  const effectDepsHistoryRef = useRef<DependencyList[]>([]);

  // Subscribe to cache changes for this specific key
  const data = useSyncExternalStore(
    (notify: () => void) => cache.subscribe(key, notify),
    () => cache.get(key) as T | undefined,
    () => cache.get(key) as T | undefined, // Server snapshot
  );

  // Optional logging for debugging render cycles
  useEffectDepLogger([key, data], effectDepsHistoryRef.current);

  return {
    data,
    isLoading: !data,
    // Note: error handling should now ideally be handled at the router level
    // or by checking if data is missing after navigation completes.
  };
}
