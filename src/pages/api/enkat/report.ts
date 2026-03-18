import type { APIRoute } from 'astro';
import { getErrorMessage, jsonResponse as json } from '../../../lib/enkat-api-helpers';
import { resolveEnkatProviderScope } from '../../../lib/enkat-provider-scope';
import { ANONYMITY_THRESHOLD, average, summarizeDelayRows, type DeliveryDelayRow } from '../../../lib/enkat-stats';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

type SurveyRow = {
  vardgivare_namn: string;
  helhetsbetyg: number;
  bemotande: number;
  information: number;
  lyssnad_pa: number;
  plan_framat: number;
};

type ProviderNameRow = {
  vardgivare_namn: string | null;
};

function uniqueProviderNames(rows: ProviderNameRow[]): string[] {
  return [...new Set(
    rows
      .map((row) => row.vardgivare_namn?.trim())
      .filter((value): value is string => Boolean(value))
  )]
    .sort((left, right) => left.localeCompare(right, 'sv'));
}

function groupByProvider(rows: SurveyRow[]) {
  const map = new Map<string, SurveyRow[]>();
  for (const row of rows) {
    const provider = row.vardgivare_namn || 'Okänd';
    const currentRows = map.get(provider) || [];
    currentRows.push(row);
    map.set(provider, currentRows);
  }
  return map;
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
    const { isAdmin, ownProviderName, effectiveProviderFilter } = await resolveEnkatProviderScope(anvandare, providerFilter);

    if (!isAdmin && !ownProviderName) {
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

    let currentRowsQuery = supabaseAdmin
      .from('enkat_svar')
      .select('vardgivare_namn, helhetsbetyg, bemotande, information, lyssnad_pa, plan_framat')
      .gte('created_at', range.from)
      .lte('created_at', range.to);

    if (effectiveProviderFilter) {
      currentRowsQuery = currentRowsQuery.eq('vardgivare_namn', effectiveProviderFilter);
    }

    const { data: currentRows, error: currentError } = await currentRowsQuery;

    if (currentError) {
      return json({ success: false, error: currentError.message || 'Kunde inte läsa enkätsvar' }, 500);
    }

    let previousRowsQuery = supabaseAdmin
      .from('enkat_svar')
      .select('vardgivare_namn, helhetsbetyg, bemotande, information, lyssnad_pa, plan_framat')
      .gte('created_at', range.previousFrom)
      .lt('created_at', range.previousTo);

    if (effectiveProviderFilter) {
      previousRowsQuery = previousRowsQuery.eq('vardgivare_namn', effectiveProviderFilter);
    }

    const { data: previousRows, error: previousError } = await previousRowsQuery;

    if (previousError) {
      throw previousError;
    }

    let currentDelayRowsQuery = supabaseAdmin
      .from('enkat_utskick')
      .select('vardgivare_namn, besoksdatum, besoksstart_tid, forsta_sms_skickad_vid, svarad_vid')
      .not('forsta_sms_skickad_vid', 'is', null)
      .gte('forsta_sms_skickad_vid', range.from)
      .lte('forsta_sms_skickad_vid', range.to);

    if (effectiveProviderFilter) {
      currentDelayRowsQuery = currentDelayRowsQuery.eq('vardgivare_namn', effectiveProviderFilter);
    }

    const { data: currentDelayRows, error: currentDelayError } = await currentDelayRowsQuery;

    if (currentDelayError) {
      throw currentDelayError;
    }

    let providerRows: ProviderNameRow[] = [];
    if (isAdmin) {
      const { data, error: providerError } = await supabaseAdmin
        .from('enkat_svar')
        .select('vardgivare_namn')
        .gte('created_at', range.from)
        .lte('created_at', range.to);

      if (providerError) {
        throw providerError;
      }

      providerRows = data || [];
    }

    const current = (currentRows || []) as SurveyRow[];
    const previous = (previousRows || []) as SurveyRow[];
    const currentDelay = (currentDelayRows || []) as DeliveryDelayRow[];

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

    if (!isAdmin) {
      const own = providers.find((item) => item.providerName === ownProviderName);
      return json({
        success: true,
        data: own
          ? { scope: 'self', configured: true, periodLabel: range.label, ...own }
          : {
              scope: 'self',
              configured: true,
              periodLabel: range.label,
              providerName: ownProviderName,
              sampleSize: 0,
              canShowDetails: false,
              message: 'Inga rapportdata hittades ännu för ditt vårdgivarnamn i vald period.'
            }
      });
    }

    const filtered = effectiveProviderFilter
      ? providers.filter((item) => item.providerName === effectiveProviderFilter)
      : providers;

    const availableProviders = uniqueProviderNames(providerRows);
    if (effectiveProviderFilter && !availableProviders.includes(effectiveProviderFilter)) {
      availableProviders.push(effectiveProviderFilter);
      availableProviders.sort((left, right) => left.localeCompare(right, 'sv'));
    }

    return json({
      success: true,
      data: {
        scope: 'admin',
        periodLabel: range.label,
        anonymityThreshold: ANONYMITY_THRESHOLD,
        availableProviders,
        providers: filtered,
        totals: {
          providerCount: filtered.length,
          answerCount: filtered.reduce((sum, item) => sum + item.sampleSize, 0)
        }
      }
    });
  } catch (error: unknown) {
    console.error('Kunde inte läsa rapportdata:', error);
    return json({
      success: false,
      error: 'Kunde inte läsa rapportdata.',
      details: { message: getErrorMessage(error) || 'Okänt fel' }
    }, 500);
  }
};
