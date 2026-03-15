import type { APIRoute } from 'astro';
import { jsonResponse as json, getErrorMessage } from '../../../lib/enkat-api-helpers';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';
import { harMinstPortalRoll } from '../../../lib/portal-roles';
import { supabaseAdmin } from '../../../lib/supabase';
import { dekryptera } from '../../../lib/kryptering';
import { buildEnkatSmsMessage, sendEnkatSms } from '../../../lib/enkat-sms';

export const prerender = false;

type RemindRequestBody = {
  campaignId: string;
};

type RawRemindRequestBody = {
  campaignId?: unknown;
};

async function parseRemindRequest(request: Request): Promise<RemindRequestBody | Response> {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return json({ success: false, error: 'Ogiltig JSON i request.' }, 400);
  }

  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return json({ success: false, error: 'Request body måste vara ett JSON-objekt.' }, 400);
  }

  const body = rawBody as RawRemindRequestBody;
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId.trim() : '';

  if (!campaignId) {
    return json({ success: false, error: 'campaignId krävs' }, 400);
  }

  return { campaignId };
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!await arInloggad(cookies)) {
    return json({ success: false, error: 'Ej inloggad' }, 401);
  }

  const anvandare = await hamtaAnvandare(cookies);
  if (!anvandare) {
    return json({ success: false, error: 'Kunde inte hämta användare' }, 401);
  }

  const parsedBody = await parseRemindRequest(request);
  if (parsedBody instanceof Response) {
    return parsedBody;
  }

  try {
    const { campaignId } = parsedBody;

    let campaignQuery = supabaseAdmin
      .from('enkat_kampanjer')
      .select('id, skapad_av, namn, status, sms_mall, skicka_paminnelse, paminnelse_efter_timmar')
      .eq('id', campaignId);

    if (!harMinstPortalRoll(anvandare.roll, 'admin')) {
      campaignQuery = campaignQuery.eq('skapad_av', anvandare.id);
    }

    const { data: campaign, error: campaignError } = await campaignQuery.single();
    if (campaignError || !campaign) {
      return json({ success: false, error: 'Kampanjen hittades inte eller kan inte nås.' }, 404);
    }

    if (!campaign.skicka_paminnelse) {
      return json({ success: false, error: 'Påminnelser är inte aktiverade för kampanjen.' }, 400);
    }

    const { data: utskickRows, error: utskickError } = await supabaseAdmin
      .from('enkat_utskick')
      .select('id, unik_kod, vardgivare_namn, besoksdatum, bokningstyp_raw, bokningstyp_normaliserad, telefon_temp_krypterad, used, paminnelse_skickad_vid, expires_at')
      .eq('kampanj_id', campaign.id)
      .is('svarad_vid', null)
      .is('paminnelse_skickad_vid', null)
      .eq('used', false);

    if (utskickError) {
      return json({ success: false, error: utskickError.message || 'Kunde inte läsa utskicksrader' }, 500);
    }

    const eligibleRows = (utskickRows || []).filter((row) => !row.expires_at || new Date(row.expires_at) >= new Date());
    let sent = 0;
    let failed = 0;

    for (const row of eligibleRows) {
      let phone = '';
      try {
        phone = row.telefon_temp_krypterad ? dekryptera(row.telefon_temp_krypterad) : '';
      } catch {
        phone = '';
      }

      if (!phone) {
        failed += 1;
        await supabaseAdmin.from('enkat_delivery_log').insert({
          kampanj_id: campaign.id,
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
        campaign.sms_mall,
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
        await supabaseAdmin
          .from('enkat_utskick')
          .update({ paminnelse_skickad_vid: new Date().toISOString() })
          .eq('id', row.id);

        await supabaseAdmin.from('enkat_delivery_log').insert({
          kampanj_id: campaign.id,
          utskick_id: row.id,
          typ: 'paminnelse',
          status: 'sent',
          provider: '46elks',
          provider_response: smsResult.providerResponse
        });
      } else {
        failed += 1;
        await supabaseAdmin.from('enkat_delivery_log').insert({
          kampanj_id: campaign.id,
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

    return json({
      success: true,
      data: {
        campaignId: campaign.id,
        eligible: eligibleRows.length,
        sent,
        failed
      }
    });
  } catch (error: unknown) {
    console.error('Kunde inte skicka påminnelser:', error);
    return json({
      success: false,
      error: 'Kunde inte skicka påminnelser.',
      details: { message: getErrorMessage(error) }
    }, 500);
  }
};
