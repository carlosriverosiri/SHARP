import type { APIRoute } from 'astro';
import { getErrorMessage, jsonResponse as json } from '../../../lib/enkat-api-helpers';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';
import { harMinstPortalRoll } from '../../../lib/portal-roles';
import { supabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

type CampaignRow = {
  id: string;
  namn: string | null;
  status: string;
  total_importerade: number;
  total_giltiga: number;
  total_dubletter: number;
  total_ogiltiga: number;
  total_skickade: number;
  total_svar: number;
  skicka_paminnelse: boolean;
  paminnelse_efter_timmar: number | null;
  created_at: string;
  skapad_av: string;
};

type CampaignIdRow = {
  kampanj_id: string;
};

type ReminderStat = {
  remindersSent: number;
  unansweredEligible: number;
  queuedInitial: number;
};

function getEmptyReminderStat(): ReminderStat {
  return {
    remindersSent: 0,
    unansweredEligible: 0,
    queuedInitial: 0
  };
}

function incrementReminderStat(
  stats: Map<string, ReminderStat>,
  campaignId: string,
  field: keyof ReminderStat
) {
  const current = stats.get(campaignId) || getEmptyReminderStat();
  current[field] += 1;
  stats.set(campaignId, current);
}

export const GET: APIRoute = async ({ cookies }) => {
  if (!await arInloggad(cookies)) {
    return json({ success: false, error: 'Ej inloggad' }, 401);
  }

  const anvandare = await hamtaAnvandare(cookies);
  if (!anvandare) {
    return json({ success: false, error: 'Kunde inte hämta användare' }, 401);
  }

  try {
    let query = supabaseAdmin
      .from('enkat_kampanjer')
      .select('id, namn, status, total_importerade, total_giltiga, total_dubletter, total_ogiltiga, total_skickade, total_svar, skicka_paminnelse, paminnelse_efter_timmar, created_at, skapad_av')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!harMinstPortalRoll(anvandare.roll, 'admin')) {
      query = query.eq('skapad_av', anvandare.id);
    }

    const { data: campaigns, error } = await query;
    if (error) {
      return json({ success: false, error: error.message || 'Kunde inte läsa kampanjer' }, 500);
    }

    const campaignRows = (campaigns || []) as CampaignRow[];
    const campaignIds = campaignRows.map((item) => item.id);
    const reminderStats = new Map<string, ReminderStat>();

    if (campaignIds.length > 0) {
      const nowIso = new Date().toISOString();
      const [reminderSentResult, unansweredEligibleResult, queuedInitialResult] = await Promise.all([
        supabaseAdmin
          .from('enkat_utskick')
          .select('kampanj_id')
          .in('kampanj_id', campaignIds)
          .not('paminnelse_skickad_vid', 'is', null),
        supabaseAdmin
          .from('enkat_utskick')
          .select('kampanj_id')
          .in('kampanj_id', campaignIds)
          .eq('used', false)
          .is('paminnelse_skickad_vid', null)
          .gte('expires_at', nowIso),
        supabaseAdmin
          .from('enkat_delivery_log')
          .select('kampanj_id')
          .in('kampanj_id', campaignIds)
          .eq('typ', 'forsta_sms')
          .eq('status', 'queued')
      ]);

      if (reminderSentResult.error) {
        throw reminderSentResult.error;
      }
      if (unansweredEligibleResult.error) {
        throw unansweredEligibleResult.error;
      }
      if (queuedInitialResult.error) {
        throw queuedInitialResult.error;
      }

      for (const row of (reminderSentResult.data || []) as CampaignIdRow[]) {
        incrementReminderStat(reminderStats, row.kampanj_id, 'remindersSent');
      }

      for (const row of (unansweredEligibleResult.data || []) as CampaignIdRow[]) {
        incrementReminderStat(reminderStats, row.kampanj_id, 'unansweredEligible');
      }

      for (const row of (queuedInitialResult.data || []) as CampaignIdRow[]) {
        incrementReminderStat(reminderStats, row.kampanj_id, 'queuedInitial');
      }
    }

    return json({
      success: true,
      data: {
        campaigns: campaignRows.map((campaign) => {
          const reminder = reminderStats.get(campaign.id) || getEmptyReminderStat();
          const responseRate = campaign.total_skickade > 0
            ? Number((campaign.total_svar / campaign.total_skickade).toFixed(3))
            : 0;
          return {
            ...campaign,
            remindersSent: reminder.remindersSent,
            unansweredEligible: reminder.unansweredEligible,
            queuedInitial: reminder.queuedInitial,
            responseRate
          };
        })
      }
    });
  } catch (error: unknown) {
    console.error('Kunde inte läsa kampanjhistorik:', error);
    return json({
      success: false,
      error: 'Kunde inte läsa kampanjhistorik.',
      details: { message: getErrorMessage(error) || 'Okänt fel' }
    }, 500);
  }
};
