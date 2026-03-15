import type { SupabaseClient } from '@supabase/supabase-js';

type QueueCampaign = {
  id: string;
  sms_mall: string | null;
};

type QueueUtskick = {
  id: string;
  kampanj_id: string;
  unik_kod: string;
  vardgivare_namn: string;
  besoksdatum: string;
  bokningstyp_raw: string | null;
  bokningstyp_normaliserad: string | null;
  telefon_temp_krypterad: string | null;
  forsta_sms_skickad_vid: string | null;
  expires_at: string | null;
};

type QueueLog = {
  id: string;
  kampanj_id: string;
  utskick_id: string | null;
  status: string;
  typ: string;
};

type EnkatSmsRow = {
  providerName: string;
  visitDate: string;
  bookingTypeRaw: string | null;
  bookingTypeNormalized: string | null;
};

type QueueProcessorOptions = {
  supabase: SupabaseClient;
  limit?: number;
  campaignId?: string;
  decryptPhone: (encrypted: string) => string;
  buildMessage: (template: string | null, row: EnkatSmsRow, code: string) => string;
  sendSms: (phone: string, message: string) => Promise<{ ok: boolean; providerResponse?: unknown; error?: string }>;
};

async function updateCampaignSummaries(supabase: SupabaseClient, campaignIds: string[]) {
  const uniqueCampaignIds = [...new Set(campaignIds.filter(Boolean))];
  for (const campaignId of uniqueCampaignIds) {
    const [sentResult, queuedResult] = await Promise.all([
      supabase
        .from('enkat_delivery_log')
        .select('id', { count: 'exact', head: true })
        .eq('kampanj_id', campaignId)
        .eq('typ', 'forsta_sms')
        .eq('status', 'sent'),
      supabase
        .from('enkat_delivery_log')
        .select('id', { count: 'exact', head: true })
        .eq('kampanj_id', campaignId)
        .eq('typ', 'forsta_sms')
        .eq('status', 'queued')
    ]);

    if (sentResult.error) console.error(`Fel vid räkning av skickade för kampanj ${campaignId}:`, sentResult.error.message);
    if (queuedResult.error) console.error(`Fel vid räkning av köade för kampanj ${campaignId}:`, queuedResult.error.message);

    const sentCount = sentResult.count ?? 0;
    const queuedCount = queuedResult.count ?? 0;
    const nextStatus = queuedCount > 0 ? 'skickar' : (sentCount > 0 ? 'klar' : 'fel');

    await supabase
      .from('enkat_kampanjer')
      .update({
        total_skickade: sentCount,
        status: nextStatus
      })
      .eq('id', campaignId);
  }
}

export async function processQueuedEnkatMessages({
  supabase,
  limit = 50,
  campaignId,
  decryptPhone,
  buildMessage,
  sendSms
}: QueueProcessorOptions) {
  let logsQuery = supabase
    .from('enkat_delivery_log')
    .select('id, kampanj_id, utskick_id, status, typ')
    .eq('typ', 'forsta_sms')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (campaignId) {
    logsQuery = logsQuery.eq('kampanj_id', campaignId);
  }

  const { data: logs, error: logsError } = await logsQuery;
  if (logsError) {
    throw new Error(logsError.message || 'Kunde inte hämta köade utskick');
  }

  const queueLogs = (logs || []) as QueueLog[];
  if (queueLogs.length === 0) {
    return { processed: 0, sent: 0, failed: 0 };
  }

  const utskickIds = queueLogs.map((item) => item.utskick_id).filter(Boolean);
  const campaignIds = [...new Set(queueLogs.map((item) => item.kampanj_id))];

  const [utskickResult, campaignResult] = await Promise.all([
    utskickIds.length > 0
      ? supabase
          .from('enkat_utskick')
          .select('id, kampanj_id, unik_kod, vardgivare_namn, besoksdatum, bokningstyp_raw, bokningstyp_normaliserad, telefon_temp_krypterad, forsta_sms_skickad_vid, expires_at')
          .in('id', utskickIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('enkat_kampanjer')
      .select('id, sms_mall')
      .in('id', campaignIds)
  ]);

  if (utskickResult.error) {
    throw new Error(`Kunde inte hämta utskicksrader: ${utskickResult.error.message}`);
  }
  if (campaignResult.error) {
    throw new Error(`Kunde inte hämta kampanjer: ${campaignResult.error.message}`);
  }

  const utskickById = new Map((utskickResult.data || []).map((row: QueueUtskick) => [row.id, row]));
  const campaignById = new Map((campaignResult.data || []).map((row: QueueCampaign) => [row.id, row]));

  let sent = 0;
  let failed = 0;

  for (const log of queueLogs) {
    const utskick = log.utskick_id ? utskickById.get(log.utskick_id) : null;
    const campaign = campaignById.get(log.kampanj_id);

    if (!utskick || !campaign) {
      failed += 1;
      await supabase
        .from('enkat_delivery_log')
        .update({
          status: 'failed',
          felkod: 'missing_row',
          felmeddelande: 'Kunde inte hitta kampanj eller utskicksrad'
        })
        .eq('id', log.id);
      continue;
    }

    if (utskick.forsta_sms_skickad_vid) {
      await supabase
        .from('enkat_delivery_log')
        .update({
          status: 'failed',
          felkod: 'already_sent',
          felmeddelande: 'Första SMS var redan registrerat som skickat'
        })
        .eq('id', log.id);
      failed += 1;
      continue;
    }

    if (utskick.expires_at && new Date(utskick.expires_at) < new Date()) {
      await supabase
        .from('enkat_delivery_log')
        .update({
          status: 'failed',
          felkod: 'expired',
          felmeddelande: 'Utskickskoden hann gå ut innan första SMS skickades'
        })
        .eq('id', log.id);
      failed += 1;
      continue;
    }

    let phone = '';
    try {
      phone = utskick.telefon_temp_krypterad ? decryptPhone(utskick.telefon_temp_krypterad) : '';
    } catch {
      phone = '';
    }

    if (!phone) {
      await supabase
        .from('enkat_delivery_log')
        .update({
          status: 'failed',
          felkod: 'missing_phone',
          felmeddelande: 'Kunde inte dekryptera telefonnummer'
        })
        .eq('id', log.id);
      failed += 1;
      continue;
    }

    const message = buildMessage(
      campaign.sms_mall,
      {
        providerName: utskick.vardgivare_namn,
        visitDate: utskick.besoksdatum,
        bookingTypeRaw: utskick.bokningstyp_raw,
        bookingTypeNormalized: utskick.bokningstyp_normaliserad
      },
      utskick.unik_kod
    );

    const smsResult = await sendSms(phone, message);
    if (smsResult.ok) {
      await Promise.all([
        supabase
          .from('enkat_utskick')
          .update({ forsta_sms_skickad_vid: new Date().toISOString() })
          .eq('id', utskick.id),
        supabase
          .from('enkat_delivery_log')
          .update({
            status: 'sent',
            provider_response: smsResult.providerResponse || null
          })
          .eq('id', log.id)
      ]);
      sent += 1;
    } else {
      await supabase
        .from('enkat_delivery_log')
        .update({
          status: 'failed',
          provider_response: smsResult.providerResponse || null,
          felkod: 'send_failed',
          felmeddelande: smsResult.error || 'Utskick misslyckades'
        })
        .eq('id', log.id);
      failed += 1;
    }
  }

  await updateCampaignSummaries(supabase, campaignIds);

  return {
    processed: queueLogs.length,
    sent,
    failed
  };
}
