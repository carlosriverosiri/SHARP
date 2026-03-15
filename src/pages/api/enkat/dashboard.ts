import type { APIRoute } from 'astro';
import { jsonResponse as json } from '../../../lib/enkat-api-helpers';
import { ANONYMITY_THRESHOLD, average, summarizeDelayRows, type DeliveryDelayRow } from '../../../lib/enkat-stats';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';
import { harMinstPortalRoll } from '../../../lib/portal-roles';
import { supabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

type SurveyRow = {
  vardgivare_namn: string;
  bokningstyp_normaliserad: string | null;
  helhetsbetyg: number;
  bemotande: number;
  information: number;
  lyssnad_pa: number;
  plan_framat: number;
  kommentar_bra: string | null;
  kommentar_forbattra: string | null;
  created_at: string;
};

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

    const { data: rows, error } = await supabaseAdmin
      .from('enkat_svar')
      .select('vardgivare_namn, bokningstyp_normaliserad, helhetsbetyg, bemotande, information, lyssnad_pa, plan_framat, kommentar_bra, kommentar_forbattra, created_at')
      .gte('created_at', fromDate)
      .order('created_at', { ascending: false });

    if (error) {
      return json({ success: false, error: error.message || 'Kunde inte läsa enkätsvar' }, 500);
    }

    const { data: sentLogs } = await supabaseAdmin
      .from('enkat_delivery_log')
      .select('status, typ, utskick_id, kampanj_id')
      .gte('created_at', fromDate);

    const { data: utskickRowsForDelay } = await supabaseAdmin
      .from('enkat_utskick')
      .select('id, vardgivare_namn, besoksdatum, besoksstart_tid, forsta_sms_skickad_vid, svarad_vid')
      .not('forsta_sms_skickad_vid', 'is', null)
      .gte('forsta_sms_skickad_vid', fromDate);

    const allRows = (rows || []) as SurveyRow[];
    const allLogs = sentLogs || [];
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
      const { data: utskickProviderRows } = await supabaseAdmin
        .from('enkat_utskick')
        .select('id, vardgivare_namn');

      const providerByUtskickId = new Map((utskickProviderRows || []).map((row: any) => [row.id, row.vardgivare_namn || 'Okänd']));

      for (const log of allLogs) {
        const provider = providerByUtskickId.get(log.utskick_id) || 'Okänd';
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

    if (!harMinstPortalRoll(anvandare.roll, 'admin')) {
      const myProviderName = profile?.vardgivare_namn?.trim();
      if (!myProviderName) {
        return json({
          success: true,
          data: {
            scope: 'self',
            configured: false,
            message: 'Du har ännu inte kopplat ditt konto till ett vårdgivarnamn. Gå till Min profil och välj ditt vårdgivarnamn först.'
          }
        });
      }

      const own = summaries.find((item) => item.providerName === myProviderName);
      return json({
        success: true,
        data: own
          ? { scope: 'self', configured: true, ...own }
          : {
              scope: 'self',
              configured: true,
              providerName: myProviderName,
              sampleSize: 0,
              canShowDetails: false,
              message: 'Inga enkätsvar hittades ännu för ditt vårdgivarnamn i vald period.'
            }
      });
    }

    const filtered = providerFilter
      ? summaries.filter((item) => item.providerName === providerFilter)
      : summaries;

    return json({
      success: true,
      data: {
        scope: 'admin',
        anonymityThreshold: ANONYMITY_THRESHOLD,
        availableProviders: summaries.map((item) => item.providerName),
        providers: filtered,
        totals: {
          providerCount: filtered.length,
          answerCount: filtered.reduce((sum, item) => sum + item.sampleSize, 0)
        }
      }
    });
  } catch (error: any) {
    console.error('Kunde inte skapa dashboarddata:', error);
    return json({
      success: false,
      error: 'Kunde inte läsa dashboarddata.',
      details: { message: error?.message || 'Okänt fel' }
    }, 500);
  }
};
