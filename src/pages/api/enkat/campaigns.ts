import type { APIRoute } from 'astro';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
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

    if (anvandare.roll !== 'admin') {
      query = query.eq('skapad_av', anvandare.id);
    }

    const { data: campaigns, error } = await query;
    if (error) {
      return json({ success: false, error: error.message || 'Kunde inte läsa kampanjer' }, 500);
    }

    const campaignIds = (campaigns || []).map((item) => item.id);
    let reminderStats = new Map<string, { remindersSent: number; unansweredEligible: number; queuedInitial: number }>();

    if (campaignIds.length > 0) {
      const { data: utskickRows } = await supabaseAdmin
        .from('enkat_utskick')
        .select('id, kampanj_id, used, paminnelse_skickad_vid, expires_at')
        .in('kampanj_id', campaignIds);

      for (const row of utskickRows || []) {
        const current = reminderStats.get(row.kampanj_id) || { remindersSent: 0, unansweredEligible: 0, queuedInitial: 0 };
        if (row.paminnelse_skickad_vid) current.remindersSent += 1;
        const isExpired = row.expires_at ? new Date(row.expires_at) < new Date() : false;
        if (!row.used && !row.paminnelse_skickad_vid && !isExpired) {
          current.unansweredEligible += 1;
        }
        reminderStats.set(row.kampanj_id, current);
      }

      const { data: deliveryLogs } = await supabaseAdmin
        .from('enkat_delivery_log')
        .select('kampanj_id, typ, status')
        .in('kampanj_id', campaignIds);

      for (const log of deliveryLogs || []) {
        if (log.typ !== 'forsta_sms' || log.status !== 'queued') continue;
        const current = reminderStats.get(log.kampanj_id) || { remindersSent: 0, unansweredEligible: 0, queuedInitial: 0 };
        current.queuedInitial += 1;
        reminderStats.set(log.kampanj_id, current);
      }
    }

    return json({
      success: true,
      data: {
        campaigns: (campaigns || []).map((campaign) => {
          const reminder = reminderStats.get(campaign.id) || { remindersSent: 0, unansweredEligible: 0, queuedInitial: 0 };
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
  } catch (error: any) {
    console.error('Kunde inte läsa kampanjhistorik:', error);
    return json({
      success: false,
      error: 'Kunde inte läsa kampanjhistorik.',
      details: { message: error?.message || 'Okänt fel' }
    }, 500);
  }
};
