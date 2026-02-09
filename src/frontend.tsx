/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { App } from "@/components/App";

const elem = document.getElementById("root")!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

let root;

if (import.meta.hot && import.meta.hot.data.root) {
  root = import.meta.hot.data.root;
  root.render(app);
} else {
  if (elem.hasChildNodes()) {
    root = hydrateRoot(elem, app);
  } else {
    root = createRoot(elem);
    root.render(app);
  }

  if (import.meta.hot) {
    import.meta.hot.data.root = root;
  }
}
