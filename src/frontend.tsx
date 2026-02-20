import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/components/App";

console.log(`frontend: ${process.env.BUN_PUBLIC_HELLO}`);
// console.log(`frontend: ${process.env.GOODBYE}`);

const elem = document.getElementById("root")!;

const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

if (import.meta.hot) {
  const root = (import.meta.hot.data.root ??= createRoot(elem));
  root.render(app);
} else {
  createRoot(elem).render(app);
}
