import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "packages/frontend/src"),
    },
  },
  test: {
    include: ["packages/**/src/**/*.spec.ts"],
  },
});
