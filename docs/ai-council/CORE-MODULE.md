## Core‑modul (Astro + Next.js‑kompatibel)

Målet: frikoppla AI‑logik från UI så att AI Council kan köras som egen app eller flyttas till Next.js utan omskrivning.

### Föreslagen struktur
- `src/lib/ai-core/`
  - `index.ts` – publika API: `runQuery`, `runSynthesis`, `estimateCost`
  - `types.ts` – gemensamma typer (model, response, cost, trace)
  - `providers/` – adapter per modell (OpenAI, Anthropic, Google, Grok)
  - `pipeline/` – stegvis orkestrering (round1 → deliberation → synthesis)
  - `streaming/` – gemensam streaming‑abstraktion
  - `metrics/` – kostnad, duration, token‑summering
  - `storage/` – session‑/draft‑format (ren data, ingen DOM)

### Designprinciper
- **UI‑agnostisk:** inget DOM eller framework‑specifikt i `ai-core`.
- **Enhetligt response‑format:** en `ModelResponse`‑shape för alla providers.
- **Trace/telemetri:** alltid samma fält för `duration`, `cost`, `tokens`.
- **Dependency‑injection:** adapters skickas in, så att test/POC blir enkel.

### Minimal API (för UI‑lagret)
```ts
type CoreOptions = {
  prompt: string;
  context: string;
  models: string[];
  synthesisModel?: string;
  deliberation?: boolean;
  files?: Array<{ name: string; content: string }>;
};

type CoreResult = {
  round1: Record<string, ModelResponse>;
  round2?: Record<string, ModelResponse>;
  synthesis?: ModelResponse;
  totals: { durationMs: number; costUsd: number; tokensIn: number; tokensOut: number };
};

export async function runQuery(options: CoreOptions): Promise<CoreResult>;
```

### Var vi är nu (i kodbasen)
- Mycket logik är redan modulariserad i `src/lib/ai-council/`.
- Nästa steg är att flytta **provider‑logik** och **cost/metrics** till en ren core‑modul.

---

## Automatisk dokumentation (rekommendationer)

Om du vill ha auto‑genererad dokumentation:
- **TypeDoc** för TypeScript‑API i `src/lib/ai-council`/`src/lib/ai-core`.
- **Markdown‑export** till `docs/ai-council/api/` för enkel publicering.
- Starta smått: dokumentera bara `types.ts` + `run-query` + adapters.

Exempelkommando (när vi väl sätter upp det):
```
npx typedoc --out docs/ai-council/api src/lib/ai-core
```
