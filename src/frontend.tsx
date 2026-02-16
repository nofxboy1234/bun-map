/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { App } from "@/components/App";
import { globalCache, type SerializedCache } from "@/cache";

const initialCache = (window as Window & { __INITIAL_CACHE__?: SerializedCache }).__INITIAL_CACHE__;
if (initialCache) {
  globalCache.hydrate(initialCache);
  delete (window as Window & { __INITIAL_CACHE__?: SerializedCache }).__INITIAL_CACHE__;
}

const elem = document.getElementById("root")!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

const hasServerMarkup = elem.hasChildNodes();

if (import.meta.hot) {
  // With hot module reloading, `import.meta.hot.data` is persisted.
  const existingRoot = import.meta.hot.data.root as
    | ReturnType<typeof hydrateRoot>
    | ReturnType<typeof createRoot>
    | undefined;
  if (existingRoot) {
    existingRoot.render(app);
  } else {
    if (hasServerMarkup) {
      import.meta.hot.data.root = hydrateRoot(elem, app);
    } else {
      const root = createRoot(elem);
      import.meta.hot.data.root = root;
      root.render(app);
    }
  }
} else {
  if (hasServerMarkup) {
    hydrateRoot(elem, app);
  } else {
    createRoot(elem).render(app);
  }
}
