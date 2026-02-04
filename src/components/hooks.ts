import { useState, useEffect, useRef, useSyncExternalStore, type DependencyList } from "react";
import { useCache } from "@/cache";

export function useEffectDepLogger(deps: DependencyList, effectDepsHistory: DependencyList[]) {
  console.log(deps);
  effectDepsHistory.push(deps);

  const prev = effectDepsHistory[effectDepsHistory.length - 2]!;
  const curr = effectDepsHistory[effectDepsHistory.length - 1]!;

  if (effectDepsHistory.length > 1) {
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
  const effectDepsHistoryRef = useRef<DependencyList[]>([]);

  // 1. Subscribe to cache changes using useSyncExternalStore
  const data = useSyncExternalStore(
    (notify: () => void) => cache.subscribe(notify),
    () => cache.get(key),
    () => cache.get(key), // Server snapshot
  );

  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(!data);
  const fetchedKeyRef = useRef<string | null>(null);

  useEffectDepLogger([key, data, fetcher, cache], effectDepsHistoryRef.current);

  useEffect(() => {
    console.log("* useEffect *");
    // If we have data, we're not loading (unless we want to implement background refresh)
    if (data) {
      console.log("has data: not fetching");
      setLoading(false);
      return;
    }

    if (fetchedKeyRef.current === key) {
      console.log("fetch in progress: not fetching");
      return;
    }

    console.log("no data: fetching!");
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
      console.log("* useEffect cleanup *");
    };
  }, [key, data, fetcher, cache]);

  return { data, error, isLoading: loading };
}
