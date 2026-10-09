import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  base: "/family-wall/",
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: false,
  plugins: [react(), tailwindcss()],
  css: { postcss: { plugins: [] } },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "client/src"), "@shared": path.resolve(import.meta.dirname, "shared") } },
  build: { outDir: path.resolve(import.meta.dirname, "dist/public/family-wall"), emptyOutDir: false,
    rollupOptions: { input: path.resolve(import.meta.dirname, "client/family-wall.html") } },
});
