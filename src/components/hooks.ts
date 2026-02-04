import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { useCache } from "@/cache";

const effectDeps: any[] = [];

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
  }, [key, data, fetcher, cache]);

  console.log([key, data, fetcher, cache]);
  effectDeps.push([key, data, fetcher, cache]);

  if (effectDeps.length > 1) {
    console.log(
      `key dep changed?: ${!Object.is(effectDeps[effectDeps.length - 1][0], effectDeps[effectDeps.length - 2][0])}`,
    );
    console.log(
      `data dep changed?: ${!Object.is(effectDeps[effectDeps.length - 1][1], effectDeps[effectDeps.length - 2][1])}`,
    );
    console.log(
      `fetcher dep changed?: ${!Object.is(effectDeps[effectDeps.length - 1][2], effectDeps[effectDeps.length - 2][2])}`,
    );
    console.log(
      `cache dep changed?: ${!Object.is(effectDeps[effectDeps.length - 1][3], effectDeps[effectDeps.length - 2][3])}`,
    );
  }

  return { data, error, isLoading: loading };
}
