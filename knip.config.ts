const config = {
  workspaces: {
    ".": {
      entry: ["caido.config.ts"],
    },
    "packages/backend": {
      project: ["src/**/*.ts"],
      ignoreDependencies: ["caido"],
    },
    "packages/frontend": {
      entry: ["src/index.ts"],
      project: ["src/**/*.{ts,tsx,vue}"],
    },
  },
};

export default config;
