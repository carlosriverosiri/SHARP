import type { APIRoute } from 'astro';
import crypto from 'crypto';
import { jsonResponse as json } from '../../../lib/enkat-api-helpers';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';
import { kryptera, dekryptera } from '../../../lib/kryptering';
import { buildEnkatSmsMessage, sendEnkatSms } from '../../../lib/enkat-sms';
import { processQueuedEnkatMessages } from '../../../lib/enkat-queue';

export const prerender = false;

type PreviewRow = {
  patientId: string;
  phone: string;
  providerName: string;
  visitDate: string;
  visitStartTime: string | null;
  bookingTypeRaw: string | null;
  bookingTypeNormalized: string;
};

function hashPatientId(patientId: string) {
  return crypto.createHash('sha256').update(patientId).digest('hex');
}

function generateSurveyCode() {
  return crypto.randomBytes(18).toString('base64url');
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!await arInloggad(cookies)) {
    return json({ success: false, error: 'Ej inloggad' }, 401);
  }

  const anvandare = await hamtaAnvandare(cookies);
  if (!anvandare) {
    return json({ success: false, error: 'Kunde inte hämta användare' }, 401);
  }

  try {
    const body = await request.json();
    const campaignName = String(body.campaignName || '').trim() || null;
    const smsTemplate = String(body.smsTemplate || '').trim() || null;
    const sendNow = body.sendNow !== false;
    const scheduledSendAt = body.scheduledSendAt ? String(body.scheduledSendAt) : null;
    const sendReminder = body.sendReminder !== false;
    const reminderAfterHours = Number(body.reminderAfterHours || 48);
    const rows = Array.isArray(body.rows) ? body.rows as PreviewRow[] : [];

    if (rows.length === 0) {
      return json({ success: false, error: 'Det finns inga valda rader att skapa kampanj från.' }, 400);
    }

    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('enkat_kampanjer')
      .insert({
        skapad_av: anvandare.id,
        namn: campaignName,
        status: sendNow ? 'skickar' : 'redo',
        total_importerade: rows.length,
        total_giltiga: rows.length,
        total_skickade: 0,
        total_svar: 0,
        global_bokningstyp: null,
        sms_mall: smsTemplate,
        skicka_paminnelse: sendReminder,
        paminnelse_efter_timmar: reminderAfterHours,
        skicka_nu: sendNow,
        planerad_skicktid: scheduledSendAt
      })
      .select('id, status')
      .single();

    if (campaignError || !campaign) {
      return json({ success: false, error: campaignError?.message || 'Kunde inte skapa kampanj' }, 500);
    }

    const now = new Date().toISOString();
    const outboundRows = rows.map((row) => {
      const unikKod = generateSurveyCode();
      return {
        source: row,
        insertRow: {
          kampanj_id: campaign.id,
          unik_kod: unikKod,
          patient_id_hash: hashPatientId(row.patientId),
          telefon_temp_krypterad: kryptera(row.phone),
          vardgivare_namn: row.providerName,
          besoksdatum: row.visitDate,
          besoksstart_tid: row.visitStartTime,
          bokningstyp_raw: row.bookingTypeRaw,
          bokningstyp_normaliserad: row.bookingTypeNormalized,
          created_at: now
        }
      };
    });

    const { data: insertedRows, error: utskickError } = await supabaseAdmin
      .from('enkat_utskick')
      .insert(outboundRows.map((row) => row.insertRow))
      .select('id, unik_kod, vardgivare_namn, besoksdatum, bokningstyp_raw, bokningstyp_normaliserad, telefon_temp_krypterad');

    if (utskickError || !insertedRows) {
      await supabaseAdmin.from('enkat_kampanjer').delete().eq('id', campaign.id);
      return json({ success: false, error: utskickError?.message || 'Kunde inte skapa utskicksrader' }, 500);
    }

    await supabaseAdmin
      .from('enkat_delivery_log')
      .insert(insertedRows.map((row) => ({
        kampanj_id: campaign.id,
        utskick_id: row.id,
        typ: 'forsta_sms',
        status: 'queued',
        provider: '46elks'
      })));

    let sentCount = 0;
    let failedCount = 0;

    if (sendNow) {
      const queueResult = await processQueuedEnkatMessages({
        supabase: supabaseAdmin,
        campaignId: campaign.id,
        limit: 25,
        decryptPhone: dekryptera,
        buildMessage: (template, row, code) => buildEnkatSmsMessage(template, row, code),
        sendSms: sendEnkatSms
      });

      sentCount = queueResult.sent;
      failedCount = queueResult.failed;
    }

    return json({
      success: true,
      data: {
        campaignId: campaign.id,
        status: sendNow ? (failedCount > 0 && sentCount === 0 ? 'fel' : 'skickar') : campaign.status,
        totalValid: rows.length,
        totalQueued: rows.length,
        totalSent: sentCount,
        totalFailed: failedCount
      }
    }, 201);
  } catch (error: any) {
    console.error('Enkätkampanj kunde inte skapas:', error);
    return json({
      success: false,
      error: 'Kunde inte skapa enkätkampanjen.',
      details: { message: error?.message || 'Okänt fel' }
    }, 500);
  }
};
