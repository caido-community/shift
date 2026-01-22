---
globs: *.vue
alwaysApply: false
---

# Components

1. Use Primevue components for all UI components.
2. Use `<script setup lang="ts">` for all components.

## Structure

Use the following layout for every component to keep imports and growth consistent:

```text
ComponentName/
  ├─ index.ts           # Re-export (single public entry)
  ├─ Container.vue      # Main component implementation
  ├─ useForm.ts         # Optional: composable when logic grows (e.g. forms)
  └─ DependentComponent.vue
```

ComponentName/index.ts
```ts
export { default as ComponentName } from "./Container.vue";
```

When a child piece becomes complex or needs its own hook, use the same pattern as the parent:

```text
ComponentName/
  └─ DependentComponent/
       ├─ index.ts
       └─ Container.vue
```
