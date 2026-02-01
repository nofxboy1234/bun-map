/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { App } from "./App";

if (import.meta.hot) {
  console.log("🔥 [HMR] Data on load:", import.meta.hot.data);
  import.meta.hot.accept();
  import.meta.hot.dispose((_data) => {
    console.log("♻️ [HMR] Disposing module...");
  });
}

const elem = document.getElementById("root")!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

console.log("#### frontend ####");

let root;

if (import.meta.hot && import.meta.hot.data.root) {
  console.log("🔥 [HMR] Reusing existing root (frontend 1)");
  root = import.meta.hot.data.root;
  root.render(app);
} else {
  console.log("🌱 [INIT] Creating new root (frontend 2)");

  if (elem.hasChildNodes()) {
    console.log("💧 [HYDRATE] Hydrating server-rendered content (frontend a)");
    root = hydrateRoot(elem, app);
  } else {
    console.log("🚀 [RENDER] Client-side render (frontend b)");
    root = createRoot(elem);
    root.render(app);
  }

  if (import.meta.hot) {
    console.log("💾 [HMR] Saving root to data (frontend c)");
    import.meta.hot.data.root = root;
  }
}
