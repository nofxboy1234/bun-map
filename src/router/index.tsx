import { useSyncExternalStore, useMemo, createContext, useContext } from "react";

const historyEvent = typeof window !== "undefined" ? new Event("pushstate") : null;

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("popstate", callback);
  window.addEventListener("pushstate", callback);

  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("pushstate", callback);
  };
}

function getSnapshot() {
  return window.location.href;
}

// Context to pass the server URL during SSR
const ServerContext = createContext<string | null>(null);

export function ServerRouter({ url, children }: { url: string; children: React.ReactNode }) {
  return <ServerContext.Provider value={url}>{children}</ServerContext.Provider>;
}

export function useRouter() {
  const serverUrl = useContext(ServerContext);

  // On server, return the context value. On client (during hydration), this should technically match window.location.
  const getServerSnapshot = () => serverUrl || "http://localhost/";

  // Uses useSyncExternalStore to subscribe to URL changes efficiently
  const urlString = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const url = useMemo(() => new URL(urlString), [urlString]);

  const navigate = (path: string) => {
    if (typeof window === "undefined") return;

    window.history.pushState(null, "", path);
    if (historyEvent) window.dispatchEvent(historyEvent);
  };

  const replace = (path: string) => {
    if (typeof window === "undefined") return;

    window.history.replaceState(null, "", path);
    if (historyEvent) window.dispatchEvent(historyEvent);
  };

  return {
    url,
    path: url.pathname,
    query: url.searchParams,
    navigate,
    replace,
  };
}
