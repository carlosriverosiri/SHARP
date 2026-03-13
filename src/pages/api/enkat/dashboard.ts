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
      return {
        delayHours,
        answered: !!row.svarad_vid
      };
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

    if (anvandare.roll !== 'admin') {
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
