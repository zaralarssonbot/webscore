import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Always client-render with createRoot. On prerendered pages the static HTML
// paints first (fast first paint + crawlable for SEO), then React clears it and
// renders fresh. We deliberately do NOT hydrate: the prerender snapshot captures
// post-mount state (finished entrance animations, swapped-in WebGL canvas) that
// can't match the client's initial render, so hydrateRoot would only log
// recovery errors (#418/#423) before client-rendering anyway. createRoot gives
// the same result with a clean console and just a minimal flash.
createRoot(document.getElementById("root")!).render(<App />);
