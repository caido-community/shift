import { resolve } from "path";
import {defineConfig} from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "tailwindcss";
import prefixwrap from "postcss-prefixwrap";
import manifest from "../../manifest.json" with { type: "json" };

export default defineConfig({
  plugins: [
    vue(),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "frontend",
      fileName: () => "script.js",
      formats: ["es"],
    },
    outDir: "../../dist/frontend",
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  resolve: {
    alias: [
      {
        find: "@",
        replacement: resolve(__dirname, "src"),
      },
    ],
  },
  define: { 'process.env.NODE_ENV': '"production"' },
  css: {
    postcss: {
      plugins: [
        // This plugin injects the necessary Tailwind classes
        tailwindcss(),

        // This plugin wraps the root element in a unique ID
        // This is necessary to prevent styling conflicts between plugins
        prefixwrap(`#plugin--${manifest.id}`),
      ],
    },
  },
});
