import { useState, useEffect, useRef, useSyncExternalStore, type DependencyList } from "react";
import { useCache } from "@/cache";

const effectDeps: DependencyList[] = [];

export function useEffectDepLogger(deps: DependencyList) {
  console.log(deps);
  effectDeps.push(deps);

  const prev = effectDeps[effectDeps.length - 2]!;
  const curr = effectDeps[effectDeps.length - 1]!;

  if (effectDeps.length > 1) {
    console.log(`key dep changed?: ${!Object.is(curr[0], prev[0])}`);
    console.log(`data dep changed?: ${!Object.is(curr[1], prev[1])}`);
    console.log(`fetcher dep changed?: ${!Object.is(curr[2], prev[2])}`);
    console.log(`cache dep changed?: ${!Object.is(curr[3], prev[3])}`);
  } else {
    console.log("key dep init");
    console.log("data dep init");
    console.log("fetcher dep init");
    console.log("cache dep init");
  }
}

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
  const fetchedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    console.log("useEffect");
    // If we have data, we're not loading (unless we want to implement background refresh)
    if (data) {
      setLoading(false);
      return;
    }

    if (fetchedKeyRef.current === key) return;
    fetchedKeyRef.current = key;

    setLoading(true);
    cache
      .fetch(key, fetcher)
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      console.log("useEffect cleanup");
    };
  }, [key, data, fetcher, cache]);

  useEffectDepLogger([key, data, fetcher, cache]);

  return { data, error, isLoading: loading };
}
