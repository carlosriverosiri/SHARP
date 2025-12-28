// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://sodermalmsortopedi.se',
  
  integrations: [
    tailwind(),
    sitemap({
      i18n: {
        defaultLocale: 'sv',
        locales: {
          sv: 'sv-SE',
          en: 'en-US',
        },
      },
      filter: (page) => !page.includes('/admin/'),
    }),
  ],
  
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