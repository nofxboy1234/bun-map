import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/components/App";

const isDevelopment = !!import.meta.hot;
// Bun inlines only literal `process.env.BUN_PUBLIC_*` reads into client bundles.
const shouldUseStrictMode =
  isDevelopment &&
  ["1", "true"].includes((process.env.BUN_PUBLIC_REACT_STRICT_MODE_DEV ?? "").toLowerCase());
const elem = document.getElementById("root")!;

const app = shouldUseStrictMode ? (
  <StrictMode>
    <App />
  </StrictMode>
) : (
  <App />
);

if (import.meta.hot) {
  const root = (import.meta.hot.data.root ??= createRoot(elem));
  root.render(app);
} else {
  createRoot(elem).render(app);
}
