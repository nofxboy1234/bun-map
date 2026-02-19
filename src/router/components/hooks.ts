import { useCallback, useEffect, useMemo, useRef } from "react";
import { useCache } from "@/cache";
import { loadRouteData, useRouter } from "@/router";
import { matchRoute } from "@/router/routes";

function isAbortError(err: unknown) {
  return err instanceof DOMException
    ? err.name === "AbortError"
    : (err as { name?: string })?.name === "AbortError";
}

type UseLinkInteractionsOptions = {
  href: string;
  prefetchTimeout: number;
  prefetchOnHover: boolean;
};

export function useLinkInteractions({
  href,
  prefetchTimeout,
  prefetchOnHover,
}: UseLinkInteractionsOptions) {
  const { navigate, url } = useRouter();
  const cache = useCache();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefetchAbortRef = useRef<AbortController | null>(null);
  const preservePrefetchRef = useRef(false);

  const isActive = useMemo(
    () => url.pathname === href || (href !== "/" && url.pathname.startsWith(href)),
    [href, url.pathname],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (!preservePrefetchRef.current) {
        prefetchAbortRef.current?.abort();
        prefetchAbortRef.current = null;
      }
    };
  }, []);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.altKey ||
        event.ctrlKey ||
        event.shiftKey
      ) {
        return;
      }

      event.preventDefault();
      preservePrefetchRef.current = true;
      setTimeout(() => {
        preservePrefetchRef.current = false;
      }, 0);
      navigate(href);
    },
    [href, navigate],
  );

  const prefetchRouteData = useCallback(() => {
    const targetUrl = new URL(href, window.location.origin);
    const match = matchRoute(targetUrl.pathname);
    const controller = new AbortController();
    prefetchAbortRef.current = controller;
    loadRouteData(match, cache, targetUrl, controller.signal).catch((err) => {
      if (!isAbortError(err)) {
        console.error("Prefetch failed", err);
      }
    });
  }, [cache, href]);

  const handleMouseEnter = useCallback(() => {
    if (!prefetchOnHover) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    prefetchAbortRef.current?.abort();
    prefetchAbortRef.current = null;
    timerRef.current = setTimeout(() => {
      prefetchRouteData();
    }, prefetchTimeout);
  }, [prefetchOnHover, prefetchRouteData, prefetchTimeout]);

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (preservePrefetchRef.current) {
      return;
    }
    prefetchAbortRef.current?.abort();
    prefetchAbortRef.current = null;
  }, []);

  return {
    isActive,
    handleClick,
    handleMouseEnter,
    handleMouseLeave,
  };
}
