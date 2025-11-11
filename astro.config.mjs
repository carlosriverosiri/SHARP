// astro.config.mjs
import { defineConfig } from 'astro/config';

// 1. Importera den officiella integrationen
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  // 2. Lägg till integrationen här
  integrations: [tailwind()]
});