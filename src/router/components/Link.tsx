import { useEffect, useRef } from "react";
import { loadRouteData, useRouter } from "@/router";
import { matchRoute } from "@/router/routes";
import { useCache } from "@/cache";

type LinkProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
  prefetchTimeout?: number; // Configurable hover delay
  prefetchOnHover?: boolean; // Enable/disable hover prefetching
};

export function Link({
  href,
  className,
  children,
  prefetchTimeout = 50,
  prefetchOnHover = true,
}: LinkProps) {
  const { navigate, url } = useRouter();
  const cache = useCache();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefetchAbortRef = useRef<AbortController | null>(null);

  const isActive = url.pathname === href || (href !== "/" && url.pathname.startsWith(href));

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      prefetchAbortRef.current?.abort();
      prefetchAbortRef.current = null;
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) {
      return;
    }

    e.preventDefault();
    navigate(href);
  };

  const handleMouseEnter = () => {
    if (prefetchOnHover) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      prefetchAbortRef.current?.abort();
      prefetchAbortRef.current = null;
      timerRef.current = setTimeout(() => {
        const targetUrl = new URL(href, window.location.origin);
        const match = matchRoute(targetUrl.pathname);
        const controller = new AbortController();
        prefetchAbortRef.current = controller;
        loadRouteData(match, cache, targetUrl, controller.signal).catch((err) => {
          const isAbortError =
            err instanceof DOMException
              ? err.name === "AbortError"
              : (err as { name?: string })?.name === "AbortError";
          if (!isAbortError) {
            console.error("Prefetch failed", err);
          }
        });
      }, prefetchTimeout);
    }
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    prefetchAbortRef.current?.abort();
    prefetchAbortRef.current = null;
  };

  return (
    <a
      href={href}
      className={[className, isActive ? "active" : ""].filter(Boolean).join(" ")}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </a>
  );
}
