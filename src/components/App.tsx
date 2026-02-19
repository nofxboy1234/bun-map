import { RouterProvider } from "@/router";
import { matchRoute } from "@/router/routes";
import { CacheProvider, globalCache, type SimpleCache } from "@/cache";
import { useAppContentState } from "@/components/hooks";

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
    <div className="app-container">
      <header>
        <h1>⚡ Bun Router Demo</h1>
      </header>

      <div className="logo-container">
        <img src={logo} alt="Bun Logo" className="logo bun-logo" />
        <img src={reactLogo} alt="React Logo" className="logo react-logo" />
      </div>

      <button onClick={incrementCount}>Count</button>
      <div>{count}</div>
      <a href="/users/duke">Duke</a>

      <main>{content}</main>
    </div>
  );
}

export default App;
