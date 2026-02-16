import { useRouter, RouterProvider } from "@/router";
import { matchRoute } from "@/router/routes";
import { useState } from "react";
import { CacheProvider, globalCache, type SimpleCache } from "@/cache";
import "@/index.css";
import logo from "@/assets/logo.svg";
import reactLogo from "@/assets/react.svg";

function normalizeAssetPath(path: string) {
  // In SSR runtime, Bun can return absolute filesystem paths for imported assets.
  // Map those to public asset URLs so browser requests are valid.
  if (path.includes("/src/assets/")) {
    const fileName = path.split("/").pop();
    return fileName ? `/assets/${fileName}` : path;
  }

  return path;
}

const bunLogoPath = normalizeAssetPath(logo);
const reactLogoPath = normalizeAssetPath(reactLogo);

type AppProps = {
  cache?: SimpleCache;
  initialPath?: string;
  staticMode?: boolean;
};

export function App({ cache = globalCache, initialPath, staticMode = false }: AppProps = {}) {
  return (
    <CacheProvider cache={cache}>
      <RouterProvider
        matchRoute={matchRoute}
        cache={cache}
        initialPath={initialPath}
        staticMode={staticMode}
      >
        <AppContent />
      </RouterProvider>
    </CacheProvider>
  );
}

function AppContent() {
  const { route } = useRouter();
  const [num, setNum] = useState(0);

  let content;

  if (route) {
    const Component = route.component;

    content = <Component />;
  } else {
    content = <div>Not Found</div>;
  }

  return (
    <div className="app-container">
      <header>
        <h1>⚡ Bun Router Demo</h1>
      </header>

      <div className="logo-container">
        <img src={bunLogoPath} alt="Bun Logo" className="logo bun-logo" />
        <img src={reactLogoPath} alt="React Logo" className="logo react-logo" />
      </div>

      <button onClick={() => setNum(num + 1)}>Count</button>
      <div>{num}</div>
      <a href="/users/duke">Duke</a>
      <main>{content}</main>
    </div>
  );
}

export default App;
