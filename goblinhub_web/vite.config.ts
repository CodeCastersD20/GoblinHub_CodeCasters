/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("chart.js") || id.includes("react-chartjs-2")) {
              return "vendor-charts";
            }
            if (
              id.includes("leaflet") ||
              id.includes("mapbox") ||
              id.includes("react-map")
            ) {
              return "vendor-maps";
            }
            if (id.includes("react-dom") || id.includes("react-router")) {
              return "vendor-react";
            }
            return "vendor";
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});