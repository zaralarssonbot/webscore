import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const root = document.getElementById("root")!;

// When the page was prerendered at build time (#root already has markup),
// hydrate it; otherwise (dev, or a non-prerendered build) mount fresh.
if (root.childNodes.length > 0) {
  hydrateRoot(root, <App />);
} else {
  createRoot(root).render(<App />);
}
