import { useRef } from "react";
import { useRouter } from "@/router";
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

  const isActive = url.pathname === href || (href !== "/" && url.pathname.startsWith(href));

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(href);
  };

  const handleMouseEnter = () => {
    if (prefetchOnHover) {
      timerRef.current = setTimeout(() => {
        const targetUrl = new URL(href, window.location.origin);
        const match = matchRoute(targetUrl.pathname);
        if (match?.route.loadData) {
          match.route.loadData(cache, match.params, targetUrl).catch(() => {});
        }
      }, prefetchTimeout);
    }
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  return (
    <a
      href={href}
      className={`${className} ${isActive ? "active" : ""}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </a>
  );
}
