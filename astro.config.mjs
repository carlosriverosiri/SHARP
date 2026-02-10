// astro.config.mjs
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'fs';

// ============================================================================
// KORTLÄNKAR - Single Source of Truth
// ============================================================================
// Alla kortlänkar definieras i src/data/shortLinks.json
// Denna fil läser JSON-filen och genererar redirects automatiskt.
//
// FÖR ATT LÄGGA TILL NYA LÄNKAR:
//   1. Öppna src/data/shortLinks.json
//   2. Lägg till ny länk i rätt kategori
//   3. Pusha till GitHub
//   4. Klart! Både redirect och copy-links UI uppdateras automatiskt.
// ============================================================================

// Läs shortLinks.json och generera redirects dynamiskt
const shortLinksPath = new URL('./src/data/shortLinks.json', import.meta.url);
const shortLinksData = JSON.parse(readFileSync(shortLinksPath, 'utf-8'));

// Bygg redirects-objektet från JSON-datan
// Filtrerar bort metadata-nycklar som börjar med "_"
const redirects = {};
Object.entries(shortLinksData)
  .filter(([key]) => !key.startsWith('_'))  // Ignorera _comment, _description, etc.
  .forEach(([_category, items]) => {
    items.forEach(link => {
      // Ignorera _comment-fält i enskilda objekt
      if (link.shortCode && link.target) {
        redirects[link.shortCode] = link.target;
      }
    });
  });

// https://astro.build/config
export default defineConfig({
  site: 'https://sodermalmsortopedi.se',
  
  // Trailing slash: 'never' = /om-oss/ai-council (utan /)
  // Detta gör att /om-oss/ai-council/ redirectar till /om-oss/ai-council
  trailingSlash: 'never',

  // Dynamiskt genererade redirects från shortLinks.json
  redirects,

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
    // Minify HTML output
    assets: '_astro',
  },
  
  // Output configuration - Static by default, SSR för sidor med prerender = false
  output: 'static',
  
  // Netlify adapter för SSR (krävs för sidor med prerender = false)
  adapter: netlify(),

  // Image optimization defaults
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        limitInputPixels: false,
      },
    },
  },

  // Vite optimizations
  vite: {
    server: {
      open: true,  // Öppnar automatiskt i Chrome (eller default-webbläsare)
    },
    build: {
      // Minify CSS and JS
      cssMinify: true,
      // terser disabled
      // Better code splitting
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Separate vendor chunks for better caching
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
        },
      },
    },
    plugins: [tailwindcss()],
  },
});
