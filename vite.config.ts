import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",
  plugins: [react()],
  esbuild: { keepNames: true },
  build: { target: "es2020" },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
} as any);
