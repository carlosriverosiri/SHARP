import type { APIRoute } from 'astro';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

const ANONYMITY_THRESHOLD = 5;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

type SurveyRow = {
  vardgivare_namn: string;
  helhetsbetyg: number;
  bemotande: number;
  information: number;
  lyssnad_pa: number;
  plan_framat: number;
  created_at: string;
};

type DeliveryDelayRow = {
  vardgivare_namn: string;
  besoksdatum: string;
  besoksstart_tid: string | null;
  forsta_sms_skickad_vid: string | null;
  svarad_vid: string | null;
};

function average(values: number[]) {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function calculateDelayHours(date: string, time: string | null, sentAt: string | null) {
  if (!time || !sentAt) return null;
  const visitStart = new Date(`${date}T${time}:00`);
  const sent = new Date(sentAt);
  if (Number.isNaN(visitStart.getTime()) || Number.isNaN(sent.getTime())) return null;
  return Math.max(0, (sent.getTime() - visitStart.getTime()) / (1000 * 60 * 60));
}

function bucketForDelay(delayHours: number) {
  if (delayHours <= 6) return '0-6h';
  if (delayHours <= 24) return '6-24h';
  if (delayHours <= 48) return '24-48h';
  return '48h+';
}

function summarizeDelayRows(rows: DeliveryDelayRow[]) {
  const measured = rows
    .map((row) => {
      const delayHours = calculateDelayHours(row.besoksdatum, row.besoksstart_tid, row.forsta_sms_skickad_vid);
      if (delayHours === null) return null;
      return { delayHours, answered: !!row.svarad_vid };
    })
    .filter(Boolean) as Array<{ delayHours: number; answered: boolean }>;

  const bucketMap = new Map<string, { sent: number; answered: number }>();
  for (const row of measured) {
    const key = bucketForDelay(row.delayHours);
    const current = bucketMap.get(key) || { sent: 0, answered: 0 };
    current.sent += 1;
    if (row.answered) current.answered += 1;
    bucketMap.set(key, current);
  }

  return {
    measuredCount: measured.length,
    averageDelayHours: average(measured.map((row) => row.delayHours)),
    buckets: Array.from(bucketMap.entries()).map(([bucket, values]) => ({
      bucket,
      sent: values.sent,
      answered: values.answered,
      responseRate: values.sent > 0 ? Number((values.answered / values.sent).toFixed(3)) : 0
    }))
  };
}

function startForPeriod(period: string) {
  const now = new Date();
  const days = period === 'week' ? 7 : period === 'quarter' ? 90 : 30;
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const previousFrom = new Date(from.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    label: period === 'week' ? 'Senaste 7 dagarna' : period === 'quarter' ? 'Senaste 90 dagarna' : 'Senaste 30 dagarna',
    from: from.toISOString(),
    to: now.toISOString(),
    previousFrom: previousFrom.toISOString(),
    previousTo: from.toISOString()
  };
}

function summarize(rows: SurveyRow[], delayRows: DeliveryDelayRow[]) {
  const sampleSize = rows.length;
  return {
    sampleSize,
    canShowDetails: sampleSize >= ANONYMITY_THRESHOLD,
    overallAverage: average(rows.map((row) => row.helhetsbetyg)),
    subscores: {
      bemotande: average(rows.map((row) => row.bemotande)),
      information: average(rows.map((row) => row.information)),
      lyssnadPa: average(rows.map((row) => row.lyssnad_pa)),
      planFramat: average(rows.map((row) => row.plan_framat))
    },
    delayMetrics: summarizeDelayRows(delayRows)
  };
}

export const GET: APIRoute = async ({ cookies, url }) => {
  if (!await arInloggad(cookies)) {
    return json({ success: false, error: 'Ej inloggad' }, 401);
  }

  const anvandare = await hamtaAnvandare(cookies);
  if (!anvandare) {
    return json({ success: false, error: 'Kunde inte hämta användare' }, 401);
  }

  const period = String(url.searchParams.get('period') || 'month');
  const providerFilter = url.searchParams.get('provider')?.trim() || '';
  const range = startForPeriod(period);

  try {
    let profile: { vardgivare_namn?: string | null } | null = null;
    try {
      const result = await supabaseAdmin
        .from('profiles')
        .select('vardgivare_namn')
        .eq('id', anvandare.id)
        .single();
      profile = result.data || null;
    } catch {
      profile = null;
    }

    const { data: currentRows, error: currentError } = await supabaseAdmin
      .from('enkat_svar')
      .select('vardgivare_namn, helhetsbetyg, bemotande, information, lyssnad_pa, plan_framat, created_at')
      .gte('created_at', range.from)
      .lte('created_at', range.to);

    if (currentError) {
      return json({ success: false, error: currentError.message || 'Kunde inte läsa enkätsvar' }, 500);
    }

    const { data: previousRows } = await supabaseAdmin
      .from('enkat_svar')
      .select('vardgivare_namn, helhetsbetyg, bemotande, information, lyssnad_pa, plan_framat, created_at')
      .gte('created_at', range.previousFrom)
      .lt('created_at', range.previousTo);

    const { data: currentDelayRows } = await supabaseAdmin
      .from('enkat_utskick')
      .select('vardgivare_namn, besoksdatum, besoksstart_tid, forsta_sms_skickad_vid, svarad_vid')
      .not('forsta_sms_skickad_vid', 'is', null)
      .gte('forsta_sms_skickad_vid', range.from)
      .lte('forsta_sms_skickad_vid', range.to);

    const current = (currentRows || []) as SurveyRow[];
    const previous = (previousRows || []) as SurveyRow[];
    const currentDelay = (currentDelayRows || []) as DeliveryDelayRow[];

    const groupByProvider = (rows: SurveyRow[]) => {
      const map = new Map<string, SurveyRow[]>();
      for (const row of rows) {
        const provider = row.vardgivare_namn || 'Okänd';
        const currentRows = map.get(provider) || [];
        currentRows.push(row);
        map.set(provider, currentRows);
      }
      return map;
    };

    const currentByProvider = groupByProvider(current);
    const previousByProvider = groupByProvider(previous);
    const delayByProvider = new Map<string, DeliveryDelayRow[]>();
    for (const row of currentDelay) {
      const provider = row.vardgivare_namn || 'Okänd';
      const currentRows = delayByProvider.get(provider) || [];
      currentRows.push(row);
      delayByProvider.set(provider, currentRows);
    }

    const providers = Array.from(currentByProvider.entries()).map(([providerName, rows]) => {
      const currentSummary = summarize(rows, delayByProvider.get(providerName) || []);
      const previousSummary = summarize(previousByProvider.get(providerName) || [], []);
      return {
        providerName,
        ...currentSummary,
        deltaVsPrevious: Number((currentSummary.overallAverage - previousSummary.overallAverage).toFixed(2))
      };
    }).sort((a, b) => a.providerName.localeCompare(b.providerName, 'sv'));

    if (anvandare.roll !== 'admin') {
      const ownProvider = profile?.vardgivare_namn?.trim();
      if (!ownProvider) {
        return json({
          success: true,
          data: {
            scope: 'self',
            configured: false,
            periodLabel: range.label,
            message: 'Du har ännu inte kopplat ditt konto till ett vårdgivarnamn. Gå till Min profil och välj ditt vårdgivarnamn först.'
          }
        });
      }

      const own = providers.find((item) => item.providerName === ownProvider);
      return json({
        success: true,
        data: own
          ? { scope: 'self', configured: true, periodLabel: range.label, ...own }
          : {
              scope: 'self',
              configured: true,
              periodLabel: range.label,
              providerName: ownProvider,
              sampleSize: 0,
              canShowDetails: false,
              message: 'Inga rapportdata hittades ännu för ditt vårdgivarnamn i vald period.'
            }
      });
    }

    const filtered = providerFilter
      ? providers.filter((item) => item.providerName === providerFilter)
      : providers;

    return json({
      success: true,
      data: {
        scope: 'admin',
        periodLabel: range.label,
        anonymityThreshold: ANONYMITY_THRESHOLD,
        availableProviders: providers.map((item) => item.providerName),
        providers: filtered,
        totals: {
          providerCount: filtered.length,
          answerCount: filtered.reduce((sum, item) => sum + item.sampleSize, 0)
        }
      }
    });
  } catch (error: any) {
    console.error('Kunde inte läsa rapportdata:', error);
    return json({
      success: false,
      error: 'Kunde inte läsa rapportdata.',
      details: { message: error?.message || 'Okänt fel' }
    }, 500);
  }
};
