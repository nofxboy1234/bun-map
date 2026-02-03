import { useRef } from "react";
import { useRouter } from "@/router";

type LinkProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
  prefetch?: () => Promise<any>;
  prefetchTimeout?: number; // Configurable hover delay
  prefetchOnHover?: boolean; // Enable/disable hover prefetching
};

export function Link({
  href,
  className,
  children,
  prefetch,
  prefetchTimeout = 50,
  prefetchOnHover = true,
}: LinkProps) {
  const { navigate } = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (prefetch) {
      try {
        await prefetch();
      } catch (err) {
        console.error("Prefetch failed", err);
      }
    }
    navigate(href);
  };

  const handleMouseEnter = () => {
    if (prefetch && prefetchOnHover) {
      timerRef.current = setTimeout(() => {
        prefetch().catch(() => {});
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
      className={className}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </a>
  );
}
