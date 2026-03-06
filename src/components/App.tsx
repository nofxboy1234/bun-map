import { RouterProvider } from "@/router";
import { matchRoute } from "@/router/routes";
import { CacheProvider, globalCache, type SimpleCache } from "@/cache";
import { useAppContentState } from "@/components/hooks";
import { Link } from "@/router/components/Link";

import "@/index.css";
import logo from "@/assets/logo.svg";
import reactLogo from "@/assets/react.svg";

type AppProps = {
  cache?: SimpleCache;
};

export function App({ cache = globalCache }: AppProps = {}) {
  return (
    <CacheProvider cache={cache}>
      <RouterProvider matchRoute={matchRoute} cache={cache}>
        <AppContent />
      </RouterProvider>
    </CacheProvider>
  );
}

function AppContent() {
  const { count, incrementCount, routeComponent } = useAppContentState();
  const Component = routeComponent;
  const content = Component ? <Component /> : <div>Not Found</div>;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Bun + React + TypeScript</p>
          <h1>Bun Router Demo</h1>
          <p className="app-subtitle">
            Client-side routes, cached loaders, and a local Dijkstra visualizer.
          </p>
        </div>

        <div className="app-header-actions">
          <button type="button" onClick={incrementCount}>
            Count {count}
          </button>
          <a href="/users/duke" className="ghost-link">
            Server route
          </a>
        </div>
      </header>

      <nav className="app-nav" aria-label="Main navigation">
        <Link href="/" className="app-nav-link">
          Pokemon
        </Link>
        <Link href="/dijkstra-demo" className="app-nav-link">
          Dijkstra Visualizer
        </Link>
      </nav>

      <div className="logo-container" aria-hidden="true">
        <img src={logo} alt="" className="logo bun-logo" />
        <img src={reactLogo} alt="" className="logo react-logo" />
      </div>

      <main className="app-main">{content}</main>
    </div>
  );
}

export default App;
