import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { App } from "@/components/App";
import "@/index.css";

const elem = document.getElementById("root")!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

if (elem.hasChildNodes()) {
  hydrateRoot(elem, app);
} else {
  createRoot(elem).render(app);
}
