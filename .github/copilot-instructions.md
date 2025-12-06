<!-- .github/copilot-instructions.md - Project-specific guidance for AI coding agents -->

# SHARP — Copilot Instructions (concise)

This file contains focused, actionable guidance for AI coding agents working in this repository.

1) Project overview
- Framework: Astro (v5) with Tailwind CSS integration (`astro.config.mjs`, `tailwind.config.mjs`).
- Purpose: Static site for a medical clinic. Content is primarily Swedish and written directly in `.astro` pages under `src/pages/`.
- Rendering model: Static server-rendered HTML built by Astro. Pages may include small client-side scripts embedded in `.astro` files (vanilla JS). There are no React/Vue components in use.

2) Key directories & files to inspect
- `src/pages/` — route files; each `.astro` file becomes a route. Edit textual content here.
- `src/layouts/BaseLayout.astro` — global layout, contains the breadcrumb logic (reads `Astro.url.pathname`) and the site header/footer imports. Changing route names or formats affects breadcrumbs.
- `src/components/` — header/footer and small shared UI pieces. `Header.astro` contains inline mobile-menu JS that expects specific element IDs (`mobile-menu-toggle`, `mobile-menu`, `close-mobile-menu`).
- `src/styles/global.css` — global Tailwind/custom CSS.
- `public/` — static assets (logo, favicon). Pages reference these assets via absolute paths like `/logo.svg`.
- `package.json` — scripts: `npm run dev` (local dev), `npm run build`, `npm run preview`.

3) Conventions and patterns found in this repo
- Language/content: Swedish. Preserve tone and medical terminology when editing pages.
- Layout usage: Most pages wrap content with `<BaseLayout title="...">...</BaseLayout>`. Keep `title` prop and structured `schema` JSON-LD scripts present (they use `set:html` to inject JSON-LD).
- Breadcrumbs: Implemented in `BaseLayout.astro` by splitting `Astro.url.pathname` and formatting segments. Avoid renaming routes without checking breadcrumb output.
- Client JS: Small inline scripts exist in components (e.g., header mobile menu). If you refactor IDs or markup, update the inline scripts accordingly. Prefer minimal changes to the DOM structure to avoid breaking behavior.
- Assets: Use `/`-rooted paths for public assets (e.g., `/logo.svg`). Avoid moving images from `public/` unless updating all references.

4) Build / dev workflow (commands and tips)
- Install: `npm install` (root)
- Dev server: `npm run dev` — default port shown in README (Astro default: `localhost:4321`).
- Build: `npm run build` → output goes to `./dist/`.
- Preview built site: `npm run preview`.
- If editing Tailwind utility classes, the config already scans `./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}`.

5) Safety checks and quick validation after edits
- Run `npm run dev` and visit the affected page(s) to verify:
  - Breadcrumbs show expected path segments.
  - Header mobile menu opens/closes (test on small screen or responsive tool).
  - Images and favicon load from `/public`.
  - JSON-LD remains valid (browser devtools → Elements → check `application/ld+json`).
- Check for broken relative imports: pages use different import styles in the repo (e.g. `import BaseLayout from '../layouts/BaseLayout.astro'` in `index.astro`). Prefer the same style as the surrounding file and verify path resolution locally.

6) Editing guidance & do/don't examples
- Do: Update page text inside `src/pages/*.astro` and keep layout/structure intact. Example header of a page:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
const pageTitle = "...";
---
<BaseLayout title={pageTitle}> ... </BaseLayout>
```

- Do: Preserve `id` attributes used by inline JS (e.g. `mobile-menu-toggle`, `mobile-menu`).
- Don't: Move inline scripts out of `.astro` files into separate frameworks without testing; these are small DOM-driven scripts and assume specific markup.
- Don't: Change breadcrumb algorithm without testing. Breadcrumbs rely on hyphen-separated slugs and a formatting helper in `BaseLayout.astro`.

7) Examples of repo-specific artifacts to watch
- `BaseLayout.astro` — contains Swedish comments and a formatting helper `formatSegment()`; editing it changes site-wide behavior.
- `Header.astro` — contains the mobile menu script which manipulates classes and aria attributes. Keep `aria-expanded` usage consistent.
- `index.astro` — contains JSON-LD schema for a `MedicalClinic` as an example of structured data used throughout the site.

8) When to ask the human maintainer
- If a page import path seems wrong (e.g. excessive `../../..`), or you plan to reorganize `src/pages` directories, ask before mass renames.
- Before removing or changing public assets in `public/` (logos, icons, manifest).

9) Useful quick checks for PRs
- Run `npm run dev` and visually smoke-test modified pages.
- Confirm no broken client-side behavior in the header/mobile menu.
- Validate JSON-LD snippets with an online linter or `chrome://` tools.

If any part of the site layout, route structure, or asset usage is unclear, tell me what you want to change and I will inspect the affected files and propose a safe patch.
