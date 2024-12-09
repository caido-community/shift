import type { Config } from 'tailwindcss'
import tailwindCaido from '@caido/tailwindcss';
import tailwindPrimeui from 'tailwindcss-primeui';

export default {
  content: [
    './src/**/*.{vue,ts}',
    './node_modules/@caido/primevue/dist/primevue.mjs'
  ],
  // Check the [data-mode="dark"] attribute on the <html> element to determine the mode
  // This attribute is set in the Caido core application
  darkMode: ["selector", '[data-mode="dark"]'],
  plugins: [
    // This plugin injects the necessary Tailwind classes for PrimeVue components
    tailwindPrimeui,

    // This plugin injects the necessary Tailwind classes for the Caido theme
    tailwindCaido,
  ],
} satisfies Config
