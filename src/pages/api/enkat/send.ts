import type { APIRoute } from 'astro';
import crypto from 'crypto';
import { getErrorMessage, jsonResponse as json } from '../../../lib/enkat-api-helpers';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';
import { kryptera, dekryptera } from '../../../lib/kryptering';
import { buildEnkatSmsMessage, sendEnkatSms } from '../../../lib/enkat-sms';
import { processQueuedEnkatMessages } from '../../../lib/enkat-queue';
import {
  hashEnkatPreviewToken,
  verifyEnkatPreviewToken,
  type EnkatPreviewTokenPayload
} from '../../../lib/enkat-preview-token';

export const prerender = false;

type SendRequestBody = {
  campaignName: string | null;
  smsTemplate: string | null;
  sendNow: boolean;
  scheduledSendAt: string | null;
  sendReminder: boolean;
  reminderAfterHours: number;
  previewToken: string;
};

type RawSendRequestBody = {
  campaignName?: unknown;
  smsTemplate?: unknown;
  sendNow?: unknown;
  scheduledSendAt?: unknown;
  sendReminder?: unknown;
  reminderAfterHours?: unknown;
  previewToken?: unknown;
};

type ExistingCampaignSummary = {
  id: string;
  status: string;
  total_giltiga: number;
  total_skickade: number;
};

function hashPatientId(patientId: string) {
  return crypto.createHash('sha256').update(patientId).digest('hex');
}

function generateSurveyCode() {
  return crypto.randomBytes(18).toString('base64url');
}

function isUniquePreviewTokenHashViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { code?: string; message?: string };
  return maybeError.code === '23505' && maybeError.message?.includes('preview_token_hash') === true;
}

async function parseSendRequest(request: Request): Promise<SendRequestBody | Response> {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return json({ success: false, error: 'Ogiltig JSON i request.' }, 400);
  }

  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return json({ success: false, error: 'Request body måste vara ett JSON-objekt.' }, 400);
  }

  const body = rawBody as RawSendRequestBody;
  const campaignName = typeof body.campaignName === 'string' ? body.campaignName.trim() || null : null;
  const smsTemplate = typeof body.smsTemplate === 'string' ? body.smsTemplate.trim() || null : null;
  const scheduledSendAt = typeof body.scheduledSendAt === 'string' ? body.scheduledSendAt.trim() || null : null;
  const sendNow = body.sendNow !== false;
  const sendReminder = body.sendReminder !== false;
  const reminderAfterHours = Number(body.reminderAfterHours ?? 48);
  const previewToken = typeof body.previewToken === 'string' ? body.previewToken.trim() : '';

  if (!previewToken) {
    return json({ success: false, error: 'previewToken krävs. Läs filen igen och skapa en ny preview.' }, 400);
  }

  if (!Number.isInteger(reminderAfterHours) || reminderAfterHours < 1) {
    return json({ success: false, error: 'Påminnelse måste anges som minst 1 timme.' }, 400);
  }

  return {
    campaignName,
    smsTemplate,
    sendNow,
    scheduledSendAt,
    sendReminder,
    reminderAfterHours,
    previewToken
  };
}

async function findExistingCampaignByPreviewTokenHash(previewTokenHash: string): Promise<ExistingCampaignSummary | null> {
  const { data, error } = await supabaseAdmin
    .from('enkat_kampanjer')
    .select('id, status, total_giltiga, total_skickade')
    .eq('preview_token_hash', previewTokenHash)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Kunde inte läsa befintlig enkätkampanj.');
  }

  return data;
}

function buildExistingCampaignResponse(campaign: ExistingCampaignSummary) {
  return {
    campaignId: campaign.id,
    status: campaign.status,
    totalValid: campaign.total_giltiga,
    totalQueued: campaign.total_giltiga,
    totalSent: campaign.total_skickade,
    totalFailed: 0,
    alreadyCreated: true
  };
}

async function cleanupCampaign(campaignId: string) {
  await supabaseAdmin
    .from('enkat_kampanjer')
    .delete()
    .eq('id', campaignId);
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!await arInloggad(cookies)) {
    return json({ success: false, error: 'Ej inloggad' }, 401);
  }

  const anvandare = await hamtaAnvandare(cookies);
  if (!anvandare) {
    return json({ success: false, error: 'Kunde inte hämta användare' }, 401);
  }

  const parsedBody = await parseSendRequest(request);
  if (parsedBody instanceof Response) {
    return parsedBody;
  }

  try {
    const {
      campaignName,
      smsTemplate,
      sendNow,
      scheduledSendAt,
      sendReminder,
      reminderAfterHours,
      previewToken
    } = parsedBody;

    let preview: EnkatPreviewTokenPayload;
    try {
      preview = verifyEnkatPreviewToken(previewToken, anvandare.id);
    } catch (error) {
      return json({ success: false, error: getErrorMessage(error) }, 400);
    }

    const previewTokenHash = hashEnkatPreviewToken(previewToken);
    const existingCampaign = await findExistingCampaignByPreviewTokenHash(previewTokenHash);
    if (existingCampaign) {
      return json({
        success: true,
        data: buildExistingCampaignResponse(existingCampaign)
      });
    }

    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('enkat_kampanjer')
      .insert({
        skapad_av: anvandare.id,
        namn: campaignName,
        status: sendNow ? 'skickar' : 'redo',
        csv_filnamn: preview.fileName,
        preview_token_hash: previewTokenHash,
        total_importerade: preview.totalRows,
        total_giltiga: preview.validRows,
        total_dubletter: preview.duplicateRows,
        total_ogiltiga: preview.invalidRows,
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

    if (campaignError && isUniquePreviewTokenHashViolation(campaignError)) {
      const duplicateCampaign = await findExistingCampaignByPreviewTokenHash(previewTokenHash);
      if (duplicateCampaign) {
        return json({
          success: true,
          data: buildExistingCampaignResponse(duplicateCampaign)
        });
      }
    }

    if (campaignError || !campaign) {
      return json({ success: false, error: campaignError?.message || 'Kunde inte skapa kampanj' }, 500);
    }

    const now = new Date().toISOString();
    const outboundRows = preview.selectedRows.map((row) => {
      const unikKod = generateSurveyCode();
      return {
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
      await cleanupCampaign(campaign.id);
      return json({ success: false, error: utskickError?.message || 'Kunde inte skapa utskicksrader' }, 500);
    }

    const { error: deliveryLogError } = await supabaseAdmin
      .from('enkat_delivery_log')
      .insert(insertedRows.map((row) => ({
        kampanj_id: campaign.id,
        utskick_id: row.id,
        typ: 'forsta_sms',
        status: 'queued',
        provider: '46elks'
      })));

    if (deliveryLogError) {
      await cleanupCampaign(campaign.id);
      return json({ success: false, error: deliveryLogError.message || 'Kunde inte skapa leveranslogg för utskicken' }, 500);
    }

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
        totalValid: preview.validRows,
        totalQueued: preview.validRows,
        totalSent: sentCount,
        totalFailed: failedCount
      }
    }, 201);
  } catch (error: unknown) {
    console.error('Enkätkampanj kunde inte skapas:', error);
    return json({
      success: false,
      error: 'Kunde inte skapa enkätkampanjen.',
      details: { message: getErrorMessage(error) }
    }, 500);
  }
};
