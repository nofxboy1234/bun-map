import { RouterProvider } from "@/router";
import { matchRoute } from "@/router/routes";
import { CacheProvider, globalCache, type SimpleCache } from "@/cache";
import { useAppContentState } from "@/components/hooks";
import { Link } from "@/router/components/Link";

import "@/index.css";

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
  const { routeComponent } = useAppContentState();
  const Component = routeComponent;
  const content = Component ? <Component /> : <div>Not Found</div>;

  return (
    <div className="app-container">
      <header className="site-header">
        <h1>Chainsaw Man Hunter Console</h1>
        <nav className="main-nav">
          <Link href="/" className="nav-link">
            Hunter Maps
          </Link>
          <Link href="/pokemon" className="nav-link">
            Pokemon Demo
          </Link>
        </nav>
      </header>

      <main>{content}</main>
    </div>
  );
}

export default App;
