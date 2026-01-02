// astro.config.mjs
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://sodermalmsortopedi.se',

  integrations: [
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
    server: {
      open: true,  // <-- Detta öppnar automatiskt i Chrome (eller default-webbläsare)
    },
    build: {
      // Better code splitting
      cssCodeSplit: true,
      // Minify CSS
      cssMinify: true,
    },
    plugins: [tailwindcss()],
  },
});