/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/components/App";

const isDevelopment = !!import.meta.hot;
// Bun inlines only literal `process.env.BUN_PUBLIC_*` reads into client bundles.
const useStrictModeInDevelopment =
  isDevelopment &&
  ["1", "true"].includes((process.env.BUN_PUBLIC_REACT_STRICT_MODE_DEV ?? "").toLowerCase());
const shouldUseStrictMode = !isDevelopment || useStrictModeInDevelopment;
const elem = document.getElementById("root")!;
const app = shouldUseStrictMode ? (
  <StrictMode>
    <App />
  </StrictMode>
) : (
  <App />
);

if (import.meta.hot) {
  // With hot module reloading, `import.meta.hot.data` is persisted.
  const root = (import.meta.hot.data.root ??= createRoot(elem));
  root.render(app);
} else {
  // The hot module reloading API is not available in production.
  createRoot(elem).render(app);
}
