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

let root;

if (elem.hasChildNodes()) {
  root = hydrateRoot(elem, app);
} else {
  root = createRoot(elem);
  root.render(app);
}
