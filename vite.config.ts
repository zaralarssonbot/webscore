import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("/three/") || id.includes("three/build")) return "vendor-three";
          if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils")) return "vendor-motion";
          // NOTE: recharts/d3 are intentionally NOT force-chunked. They are only
          // used by lazy /app routes; letting them bundle into that async chunk
          // (rather than a shared eager vendor chunk) avoids a cross-chunk React
          // TDZ — recharts runs React.createContext at module load, which must
          // not execute before the react vendor chunk initializes. See M5 notes.
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("react-router") || id.includes("react-dom") || id.includes("/react/") || id.includes("@tanstack")) return "vendor-react";
        },
      },
    },
  },
}));
