import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from https://bdzion.github.io/canada-food-system-observatory/
// The base path must match, or the built page loads blank on GitHub Pages.
export default defineConfig({
  base: "/canada-food-system-observatory/",
  plugins: [react()],
  build: { sourcemap: false, chunkSizeWarningLimit: 900 },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
