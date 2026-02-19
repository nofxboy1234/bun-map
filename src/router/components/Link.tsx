import { useLinkInteractions } from "./hooks";

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
  const { isActive, handleClick, handleMouseEnter, handleMouseLeave } = useLinkInteractions({
    href,
    prefetchTimeout,
    prefetchOnHover,
  });

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
