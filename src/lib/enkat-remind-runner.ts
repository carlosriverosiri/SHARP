import type { SupabaseClient } from '@supabase/supabase-js';
import { buildEnkatSmsMessage, sendEnkatSms } from './enkat-sms';
import { isReminderSendDue } from './enkat-reminder-time';

export type EnkatReminderDispatchResult = {
  eligible: number;
  sent: number;
  failed: number;
};

type CampaignSmsRow = {
  id: string;
  sms_mall: string | null;
  skicka_paminnelse: boolean;
};

type UtskickReminderRow = {
  id: string;
  kampanj_id: string;
  unik_kod: string;
  vardgivare_namn: string;
  besoksdatum: string;
  bokningstyp_raw: string | null;
  bokningstyp_normaliserad: string | null;
  telefon_temp_krypterad: string | null;
  used: boolean;
  forsta_sms_skickad_vid: string | null;
  expires_at: string | null;
};

/**
 * Skickar högst en påminnelse per utskickrad (DB: paminnelse_skickad_vid).
 * Tid: nästa kalenderdag kl 16:00 Europe/Stockholm efter forsta_sms_skickad_vid.
 */
export async function dispatchEnkatReminders(
  supabase: SupabaseClient,
  decryptPhone: (encrypted: string) => string,
  options: { campaignId?: string; now?: Date } = {}
): Promise<EnkatReminderDispatchResult> {
  const now = options.now ?? new Date();

  let campaignQuery = supabase
    .from('enkat_kampanjer')
    .select('id, sms_mall, skicka_paminnelse')
    .eq('skicka_paminnelse', true);

  if (options.campaignId) {
    campaignQuery = campaignQuery.eq('id', options.campaignId);
  }

  const { data: campaigns, error: campaignError } = await campaignQuery;
  if (campaignError) {
    throw new Error(campaignError.message || 'Kunde inte läsa kampanjer för påminnelse.');
  }

  const campaignList = (campaigns || []) as CampaignSmsRow[];
  const campaignMap = new Map(campaignList.map((c) => [c.id, c]));
  const campaignIds = campaignList.map((c) => c.id);

  if (campaignIds.length === 0) {
    return { eligible: 0, sent: 0, failed: 0 };
  }

  let utskickQuery = supabase
    .from('enkat_utskick')
    .select(
      'id, kampanj_id, unik_kod, vardgivare_namn, besoksdatum, bokningstyp_raw, bokningstyp_normaliserad, telefon_temp_krypterad, used, forsta_sms_skickad_vid, expires_at'
    )
    .in('kampanj_id', campaignIds)
    .is('svarad_vid', null)
    .is('paminnelse_skickad_vid', null)
    .eq('used', false)
    .not('forsta_sms_skickad_vid', 'is', null);

  if (options.campaignId) {
    utskickQuery = utskickQuery.eq('kampanj_id', options.campaignId);
  }

  const { data: rawRows, error: utskickError } = await utskickQuery;
  if (utskickError) {
    throw new Error(utskickError.message || 'Kunde inte läsa utskick för påminnelse.');
  }

  const eligibleRows = ((rawRows || []) as UtskickReminderRow[]).filter((row) => {
    if (row.expires_at && new Date(row.expires_at) < now) return false;
    return isReminderSendDue(row.forsta_sms_skickad_vid, now);
  });

  let sent = 0;
  let failed = 0;

  for (const row of eligibleRows) {
    const campaign = campaignMap.get(row.kampanj_id);
    if (!campaign) continue;

    let phone = '';
    try {
      phone = row.telefon_temp_krypterad ? decryptPhone(row.telefon_temp_krypterad) : '';
    } catch {
      phone = '';
    }

    if (!phone) {
      failed += 1;
      await supabase.from('enkat_delivery_log').insert({
        kampanj_id: row.kampanj_id,
        utskick_id: row.id,
        typ: 'paminnelse',
        status: 'failed',
        provider: '46elks',
        felkod: 'missing_phone',
        felmeddelande: 'Kunde inte dekryptera eller hitta telefonnummer för påminnelse'
      });
      continue;
    }

    const message = buildEnkatSmsMessage(
      campaign.sms_mall ?? null,
      {
        providerName: row.vardgivare_namn,
        visitDate: row.besoksdatum,
        bookingTypeRaw: row.bokningstyp_raw,
        bookingTypeNormalized: row.bokningstyp_normaliserad
      },
      row.unik_kod,
      { reminder: true }
    );

    const smsResult = await sendEnkatSms(phone, message);
    if (smsResult.ok) {
      sent += 1;
      await supabase
        .from('enkat_utskick')
        .update({ paminnelse_skickad_vid: new Date().toISOString() })
        .eq('id', row.id);

      await supabase.from('enkat_delivery_log').insert({
        kampanj_id: row.kampanj_id,
        utskick_id: row.id,
        typ: 'paminnelse',
        status: 'sent',
        provider: '46elks',
        provider_response: smsResult.providerResponse
      });
    } else {
      failed += 1;
      await supabase.from('enkat_delivery_log').insert({
        kampanj_id: row.kampanj_id,
        utskick_id: row.id,
        typ: 'paminnelse',
        status: 'failed',
        provider: '46elks',
        provider_response: smsResult.providerResponse || null,
        felkod: 'send_failed',
        felmeddelande: smsResult.error || 'Påminnelseutskick misslyckades'
      });
    }
  }

  return {
    eligible: eligibleRows.length,
    sent,
    failed
  };
}
