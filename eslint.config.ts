import { defaultConfig } from "@caido/eslint-config";
import globals from "globals";

export default [
  ...defaultConfig({
    compat: false,
  }),
  {
    files: ["packages/frontend/**/*.{ts,vue}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
];
