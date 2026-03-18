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
  kommentar_bra: string | null;
  kommentar_forbattra: string | null;
  created_at: string;
};

type DeliveryLogRow = {
  status: string;
  typ: string;
  utskick_id: string | null;
};

type ProviderNameRow = {
  vardgivare_namn: string | null;
};

type UtskickProviderRow = {
  id: string;
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

function summarizeProvider(
  providerName: string,
  rows: SurveyRow[],
  sentCount: number,
  deliveredCount: number,
  reminderCount: number,
  delayRows: DeliveryDelayRow[]
) {
  const overall = average(rows.map((row) => row.helhetsbetyg));
  const bemotande = average(rows.map((row) => row.bemotande));
  const information = average(rows.map((row) => row.information));
  const lyssnadPa = average(rows.map((row) => row.lyssnad_pa));
  const planFramat = average(rows.map((row) => row.plan_framat));
  const sampleSize = rows.length;
  const responseRate = sentCount > 0 ? Number((sampleSize / sentCount).toFixed(3)) : 0;
  const highScoreShare = sampleSize > 0 ? Number((rows.filter((row) => row.helhetsbetyg >= 9).length / sampleSize).toFixed(3)) : 0;
  const lowScoreShare = sampleSize > 0 ? Number((rows.filter((row) => row.helhetsbetyg <= 6).length / sampleSize).toFixed(3)) : 0;
  const comments = rows
    .flatMap((row) => [
      row.kommentar_bra ? { type: 'bra', text: row.kommentar_bra, createdAt: row.created_at } : null,
      row.kommentar_forbattra ? { type: 'forbattra', text: row.kommentar_forbattra, createdAt: row.created_at } : null
    ])
    .filter(Boolean)
    .slice(0, 10);

  return {
    providerName,
    sampleSize,
    canShowDetails: sampleSize >= ANONYMITY_THRESHOLD,
    responseRate,
    deliveredCount,
    sentCount,
    reminderCount,
    overallAverage: overall,
    subscores: {
      bemotande,
      information,
      lyssnadPa,
      planFramat
    },
    highScoreShare,
    lowScoreShare,
    latestComments: sampleSize >= ANONYMITY_THRESHOLD ? comments : [],
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

  const days = Math.max(1, Math.min(365, Number(url.searchParams.get('days') || 90)));
  const providerFilter = url.searchParams.get('provider')?.trim() || '';
  const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { isAdmin, ownProviderName, effectiveProviderFilter } = await resolveEnkatProviderScope(anvandare, providerFilter);

    if (!isAdmin && !ownProviderName) {
      return json({
        success: true,
        data: {
          scope: 'self',
          configured: false,
          message: 'Du har ännu inte kopplat ditt konto till ett vårdgivarnamn. Gå till Min profil och välj ditt vårdgivarnamn först.'
        }
      });
    }

    let rowsQuery = supabaseAdmin
      .from('enkat_svar')
      .select('vardgivare_namn, helhetsbetyg, bemotande, information, lyssnad_pa, plan_framat, kommentar_bra, kommentar_forbattra, created_at')
      .gte('created_at', fromDate)
      .order('created_at', { ascending: false });

    if (effectiveProviderFilter) {
      rowsQuery = rowsQuery.eq('vardgivare_namn', effectiveProviderFilter);
    }

    const { data: rows, error } = await rowsQuery;

    if (error) {
      return json({ success: false, error: error.message || 'Kunde inte läsa enkätsvar' }, 500);
    }

    const { data: sentLogs, error: sentLogsError } = await supabaseAdmin
      .from('enkat_delivery_log')
      .select('status, typ, utskick_id')
      .gte('created_at', fromDate);

    if (sentLogsError) {
      throw sentLogsError;
    }

    let delayQuery = supabaseAdmin
      .from('enkat_utskick')
      .select('id, vardgivare_namn, besoksdatum, besoksstart_tid, forsta_sms_skickad_vid, svarad_vid')
      .not('forsta_sms_skickad_vid', 'is', null)
      .gte('forsta_sms_skickad_vid', fromDate);

    if (effectiveProviderFilter) {
      delayQuery = delayQuery.eq('vardgivare_namn', effectiveProviderFilter);
    }

    const { data: utskickRowsForDelay, error: delayError } = await delayQuery;

    if (delayError) {
      throw delayError;
    }

    let providerRows: ProviderNameRow[] = [];
    if (isAdmin) {
      const { data, error: providerError } = await supabaseAdmin
        .from('enkat_svar')
        .select('vardgivare_namn')
        .gte('created_at', fromDate);

      if (providerError) {
        throw providerError;
      }

      providerRows = data || [];
    }

    const allRows = (rows || []) as SurveyRow[];
    const allLogs = (sentLogs || []) as DeliveryLogRow[];
    const allDelayRows = (utskickRowsForDelay || []) as DeliveryDelayRow[];

    const byProvider = new Map<string, SurveyRow[]>();
    for (const row of allRows) {
      const provider = row.vardgivare_namn || 'Okänd';
      const current = byProvider.get(provider) || [];
      current.push(row);
      byProvider.set(provider, current);
    }

    const delayByProvider = new Map<string, DeliveryDelayRow[]>();
    for (const row of allDelayRows) {
      const provider = row.vardgivare_namn || 'Okänd';
      const current = delayByProvider.get(provider) || [];
      current.push(row);
      delayByProvider.set(provider, current);
    }

    const sentCountByProvider = new Map<string, { sent: number; delivered: number; reminder: number }>();
    if (allLogs.length > 0) {
      const utskickIds = [...new Set(
        allLogs
          .map((row) => row.utskick_id)
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
      )];

      const providerByUtskickId = new Map<string, string>();

      if (utskickIds.length > 0) {
        let utskickProviderQuery = supabaseAdmin
          .from('enkat_utskick')
          .select('id, vardgivare_namn')
          .in('id', utskickIds);

        if (effectiveProviderFilter) {
          utskickProviderQuery = utskickProviderQuery.eq('vardgivare_namn', effectiveProviderFilter);
        }

        const { data: utskickProviderRows, error: utskickProviderError } = await utskickProviderQuery;

        if (utskickProviderError) {
          throw utskickProviderError;
        }

        for (const row of (utskickProviderRows || []) as UtskickProviderRow[]) {
          providerByUtskickId.set(row.id, row.vardgivare_namn || 'Okänd');
        }
      }

      for (const log of allLogs) {
        if (!log.utskick_id) {
          continue;
        }

        const provider = providerByUtskickId.get(log.utskick_id);
        if (!provider) {
          continue;
        }

        const current = sentCountByProvider.get(provider) || { sent: 0, delivered: 0, reminder: 0 };
        if (log.status === 'sent') current.sent += 1;
        if (log.status === 'delivered') current.delivered += 1;
        if (log.typ === 'paminnelse' && log.status === 'sent') current.reminder += 1;
        sentCountByProvider.set(provider, current);
      }
    }

    const summaries = Array.from(byProvider.entries())
      .map(([providerName, providerRows]) => {
        const counts = sentCountByProvider.get(providerName) || { sent: 0, delivered: 0, reminder: 0 };
        return summarizeProvider(
          providerName,
          providerRows,
          counts.sent,
          counts.delivered,
          counts.reminder,
          delayByProvider.get(providerName) || []
        );
      })
      .sort((a, b) => a.providerName.localeCompare(b.providerName, 'sv'));

    if (!isAdmin) {
      const own = summaries.find((item) => item.providerName === ownProviderName);
      return json({
        success: true,
        data: own
          ? { scope: 'self', configured: true, ...own }
          : {
              scope: 'self',
              configured: true,
              providerName: ownProviderName,
              sampleSize: 0,
              canShowDetails: false,
              message: 'Inga enkätsvar hittades ännu för ditt vårdgivarnamn i vald period.'
            }
      });
    }

    const filtered = effectiveProviderFilter
      ? summaries.filter((item) => item.providerName === effectiveProviderFilter)
      : summaries;

    const availableProviders = uniqueProviderNames(providerRows);
    if (effectiveProviderFilter && !availableProviders.includes(effectiveProviderFilter)) {
      availableProviders.push(effectiveProviderFilter);
      availableProviders.sort((left, right) => left.localeCompare(right, 'sv'));
    }

    return json({
      success: true,
      data: {
        scope: 'admin',
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
    console.error('Kunde inte skapa dashboarddata:', error);
    return json({
      success: false,
      error: 'Kunde inte läsa dashboarddata.',
      details: { message: getErrorMessage(error) || 'Okänt fel' }
    }, 500);
  }
};
