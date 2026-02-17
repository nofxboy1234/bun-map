/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/components/App";

const elem = document.getElementById("root")!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

if (import.meta.hot) {
  // With hot module reloading, `import.meta.hot.data` is persisted.
  const existingRoot = import.meta.hot.data.root as ReturnType<typeof createRoot> | undefined;
  if (existingRoot) {
    existingRoot.render(app);
  } else {
    const root = createRoot(elem);
    import.meta.hot.data.root = root;
    root.render(app);
  }
} else {
  createRoot(elem).render(app);
}
