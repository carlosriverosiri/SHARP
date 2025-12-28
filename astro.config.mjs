// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind()],
  
  // Performance optimizations
  compressHTML: true,
  
  build: {
    // Inline small CSS for faster initial render
    inlineStylesheets: 'auto',
  },
  
  // Image optimization defaults
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        limitInputPixels: false,
      },
    },
  },
  
  vite: {
    build: {
      // Better code splitting
      cssCodeSplit: true,
      // Minify CSS
      cssMinify: true,
    },
  },
});