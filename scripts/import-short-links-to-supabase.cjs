const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function inferLinkType(category, item) {
  if (category === 'Frågeformulär') return 'form';
  if (category === 'Bokningar') return 'booking';
  if (item.isExternal) return 'external';
  return 'internal';
}

function buildSmsTemplate(category) {
  const templates = {
    Diagnoser: 'Hej! Läs mer om {namn}: {länk} /Södermalms Ortopedi',
    Operationer: 'Hej! Du är planerad för {namn}. Läs mer här: {länk} /Södermalms Ortopedi',
    Rehab: 'Hej! Efter din operation, läs igenom rehabinformationen: {länk} /Södermalms Ortopedi',
    'Frågeformulär': 'Hej! Vänligen fyll i detta formulär inför ditt besök: {länk} /Södermalms Ortopedi',
    Bokningar: 'Hej! Här är bokningslänken: {länk} /Södermalms Ortopedi',
    Info: 'Hej! Här finns information som kan vara bra att läsa: {länk} /Södermalms Ortopedi',
  };

  return templates[category] ?? 'Hej! Se denna länk: {länk} /Södermalms Ortopedi';
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  loadEnv(path.join(projectRoot, '.env'));

  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('PUBLIC_SUPABASE_URL och SUPABASE_SERVICE_ROLE_KEY krävs i .env');
  }

  const jsonPath = path.join(projectRoot, 'src', 'data', 'shortLinks.json');
  const shortLinks = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const rows = [];

  for (const [category, items] of Object.entries(shortLinks)) {
    if (category.startsWith('_') || !Array.isArray(items)) continue;

    items.forEach((item, index) => {
      rows.push({
        name: item.name,
        short_code: item.shortCode,
        target: item.target,
        category,
        is_external: Boolean(item.isExternal),
        link_type: inferLinkType(category, item),
        is_system: true,
        is_active: true,
        sort_order: (index + 1) * 10,
        sms_template: buildSmsTemplate(category),
        description: item._comment ?? null,
      });
    });
  }

  console.log(`Importerar ${rows.length} standardlänkar till kort_lankar...`);

  const { data, error } = await supabase
    .from('kort_lankar')
    .upsert(rows, { onConflict: 'short_code' })
    .select('short_code');

  if (error) {
    throw error;
  }

  console.log(`Klart. ${data?.length ?? rows.length} länkar importerades/uppdaterades.`);
}

main().catch((error) => {
  console.error('Import misslyckades:', error.message || error);
  process.exit(1);
});
