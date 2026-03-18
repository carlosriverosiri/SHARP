import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const layoutsDir = fileURLToPath(new URL('.', import.meta.url));

describe('layout head slots', () => {
  it('requires a named head slot in every layout with a custom head', () => {
    const layoutFiles = readdirSync(layoutsDir).filter((file) => file.endsWith('.astro'));

    for (const file of layoutFiles) {
      const source = readFileSync(join(layoutsDir, file), 'utf8');
      if (!source.includes('<head>')) continue;

      expect(source, `${file} saknar <slot name="head" />`).toContain('<slot name="head" />');
    }
  });
});
