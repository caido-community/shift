import path from "path";

import tailwindCaido from "@caido/tailwindcss";
import { defineConfig } from "@caido-community/dev";
import vue from "@vitejs/plugin-vue";
import prefixwrap from "postcss-prefixwrap";
import tailwindcss from "tailwindcss";
// @ts-expect-error no declared types at this time
import tailwindPrimeui from "tailwindcss-primeui";

// @ts-expect-error no types
import tailwindConfig from "./packages/frontend/tailwind.config.js";

const id = "shift";
export default defineConfig({
  id,
  name: "Shift",
  description: "Delegate your work to Shift",
  version: "1.0.7",
  author: {
    name: "Caido Labs Inc.",
    email: "dev@caido.io",
    url: "https://caido.io",
  },
  plugins: [
    {
      kind: "frontend",
      id: "shift-frontend",
      root: "packages/frontend",
      vite: {
        plugins: [vue()],
        build: {
          rollupOptions: {
            external: [
              "@caido/frontend-sdk",
              "@codemirror/state",
              "@codemirror/view",
              "@codemirror/autocomplete",
              "@codemirror/commands",
              "@codemirror/lint",
              "@codemirror/search",
              "@codemirror/language",
              "@lezer/common",
              "@lezer/highlight",
              "@lezer/lr",
              "vue"
            ],
          },
        },
        resolve: {
          alias: [
            {
              find: "@",
              replacement: path.resolve(__dirname, "packages/frontend/src"),
            },
          ],
        },
        css: {
          postcss: {
            plugins: [
              prefixwrap(`#plugin--${id}`),

              tailwindcss({
                ...tailwindConfig,
                corePlugins: {
                  ...tailwindConfig.corePlugins,
                  preflight: false,
                },
                content: [
                  ...tailwindConfig.content,
                  "./packages/frontend/src/**/*.{vue,ts}",
                  "./node_modules/@caido/primevue/dist/primevue.mjs",
                ],
                plugins: [
                  ...(tailwindConfig.plugins || []),
                  tailwindPrimeui,
                  tailwindCaido,
                ],
              }),
            ],
          },
        },
      },
    },
  ],
});
