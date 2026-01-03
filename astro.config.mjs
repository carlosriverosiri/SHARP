// astro.config.mjs
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://sodermalmsortopedi.se',

  // ============================================================================
  // KORTLÄNKAR - Redirects för SMS till patienter
  // ============================================================================
  // Dessa korta URLs omdirigerar till de fullständiga sidorna.
  // Perfekt för SMS där teckenbegränsning finns (max 255 tecken).
  // 
  // PREFIXER:
  //   /d/   = Diagnoser (diagnosis)
  //   /o/   = Operationer (operations)  
  //   /r/   = Rehab
  //   /ff/  = Frågeformulär (pre-visit questionnaires)
  //
  // UNDERHÅLL:
  //   1. Lägg till ny redirect här när du skapar en ny sida
  //   2. Uppdatera också länklistan i src/pages/kopiera-lankar.astro
  //   3. Redeploy
  // ============================================================================
  redirects: {
    // ------------------------------------
    // DIAGNOSER (/d/)
    // ------------------------------------
    '/d/ac': '/sjukdomar/axel/ac-ledsartros',
    '/d/imp': '/sjukdomar/axel/impingement',
    '/d/cuff': '/sjukdomar/axel/rotatorcuffruptur',
    '/d/frusen': '/sjukdomar/axel/frusen-skuldra',
    '/d/kalk': '/sjukdomar/axel/kalkaxel',
    '/d/instab': '/sjukdomar/axel/axelinstabilitet',
    '/d/slap': '/sjukdomar/axel/slap-skada',
    '/d/biceps': '/sjukdomar/axel/bicepstendinit',
    '/d/pts': '/sjukdomar/axel/parsonage-turner-syndrom',
    // Lägg till fler diagnoser här...

    // ------------------------------------
    // OPERATIONER (/o/)
    // ------------------------------------
    '/o/ac': '/operation/axel/lateral-klavikelresektion',
    '/o/sad': '/operation/axel/subakromiell-dekompression',
    '/o/cuff': '/operation/axel/rotatorcuff-rekonstruktion',
    '/o/kalk': '/operation/axel/kalkborttagning',
    '/o/stab': '/operation/axel/stabilisering',
    '/o/biceps': '/operation/axel/bicepstenodes',
    // Lägg till fler operationer här...

    // ------------------------------------
    // REHAB (/r/)
    // ------------------------------------
    '/r/ac': '/rehab/axel/ac-ledsartros',
    '/r/sad': '/rehab/axel/subakromiell-dekompression',
    '/r/cuff': '/rehab/axel/rotatorcuff',
    '/r/frusen': '/rehab/axel/frusen-skuldra',
    '/r/stab': '/rehab/axel/stabilisering',
    // Lägg till fler rehab här...

    // ------------------------------------
    // FRÅGEFORMULÄR (/ff/) - Externa URLs till journalsystemet
    // ------------------------------------
    // OBS: Dessa pekar till EXTERNA URLs (ditt journalsystem)
    // Byt ut URL:erna nedan mot de riktiga länkarna från journalsystemet
    '/ff/axel': 'https://exempel-journalsystem.se/form/axel-123',
    '/ff/armbage': 'https://exempel-journalsystem.se/form/armbage-456',
    '/ff/kna': 'https://exempel-journalsystem.se/form/kna-789',
    // Lägg till fler formulär här...
  },

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