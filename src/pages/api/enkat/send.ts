import type { APIRoute, AstroCookies } from 'astro';
import crypto from 'node:crypto';
import { getErrorMessage, jsonResponse as json } from '../../../lib/enkat-api-helpers';
import { arInloggad, hamtaAnvandare, type Anvandare } from '../../../lib/auth';
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

type CreatedCampaignSummary = {
  id: string;
  status: string;
};

type PreparedPreview = {
  preview: EnkatPreviewTokenPayload;
  previewTokenHash: string;
};

type CampaignResolution =
  | { kind: 'existing'; campaign: ExistingCampaignSummary }
  | { kind: 'created'; campaign: CreatedCampaignSummary };

type OutboundInsertRow = {
  kampanj_id: string;
  unik_kod: string;
  patient_id_hash: string;
  telefon_temp_krypterad: string;
  vardgivare_namn: string;
  besoksdatum: string;
  besoksstart_tid: string | null;
  bokningstyp_raw: string | null;
  bokningstyp_normaliserad: string;
  created_at: string;
};

type InsertedUtskickRow = {
  id: string;
  unik_kod: string;
  vardgivare_namn: string;
  besoksdatum: string;
  bokningstyp_raw: string | null;
  bokningstyp_normaliserad: string;
  telefon_temp_krypterad: string;
};

type QueueSendSummary = {
  sent: number;
  failed: number;
};

/**
 * Små/medelstora kampanjer ska normalt skickas direkt i samma flöde.
 * Större volymer kan falla tillbaka på den schemalagda kön.
 */
const INITIAL_ENKAT_SEND_LIMIT = 50;

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
  const previewToken = typeof body.previewToken === 'string' ? body.previewToken.trim() : '';

  if (!previewToken) {
    return json({ success: false, error: 'previewToken krävs. Läs filen igen och skapa en ny preview.' }, 400);
  }

  return {
    campaignName,
    smsTemplate,
    sendNow,
    scheduledSendAt,
    sendReminder,
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

async function requireAuthenticatedUser(
  cookies: AstroCookies,
  request: Request
): Promise<Anvandare | Response> {
  if (!await arInloggad(cookies, request)) {
    return json({ success: false, error: 'Ej inloggad' }, 401);
  }

  const anvandare = await hamtaAnvandare(cookies, request);
  return anvandare ?? json({ success: false, error: 'Kunde inte hämta användare' }, 401);
}

function preparePreview(previewToken: string, userId: string): PreparedPreview | Response {
  try {
    return {
      preview: verifyEnkatPreviewToken(previewToken, userId),
      previewTokenHash: hashEnkatPreviewToken(previewToken)
    };
  } catch (error) {
    return json({ success: false, error: getErrorMessage(error) }, 400);
  }
}

function buildCampaignInsertPayload(
  anvandareId: string,
  previewTokenHash: string,
  preview: EnkatPreviewTokenPayload,
  body: SendRequestBody
) {
  return {
    skapad_av: anvandareId,
    namn: body.campaignName,
    status: body.sendNow ? 'skickar' : 'redo',
    csv_filnamn: preview.fileName,
    preview_token_hash: previewTokenHash,
    total_importerade: preview.totalRows,
    total_giltiga: preview.validRows,
    total_dubletter: preview.duplicateRows,
    total_ogiltiga: preview.invalidRows,
    total_skickade: 0,
    total_svar: 0,
    global_bokningstyp: null,
    sms_mall: body.smsTemplate,
    skicka_paminnelse: body.sendReminder,
    paminnelse_efter_timmar: null,
    skicka_nu: body.sendNow,
    planerad_skicktid: body.scheduledSendAt
  };
}

async function createOrReuseCampaign(
  anvandareId: string,
  previewTokenHash: string,
  preview: EnkatPreviewTokenPayload,
  body: SendRequestBody
): Promise<CampaignResolution> {
  const existingCampaign = await findExistingCampaignByPreviewTokenHash(previewTokenHash);
  if (existingCampaign) {
    return {
      kind: 'existing',
      campaign: existingCampaign
    };
  }

  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from('enkat_kampanjer')
    .insert(buildCampaignInsertPayload(anvandareId, previewTokenHash, preview, body))
    .select('id, status')
    .single();

  if (campaignError && isUniquePreviewTokenHashViolation(campaignError)) {
    const duplicateCampaign = await findExistingCampaignByPreviewTokenHash(previewTokenHash);
    if (duplicateCampaign) {
      return {
        kind: 'existing',
        campaign: duplicateCampaign
      };
    }
  }

  if (campaignError || !campaign) {
    throw new Error(campaignError?.message || 'Kunde inte skapa kampanj');
  }

  return {
    kind: 'created',
    campaign
  };
}

function buildOutboundInsertRows(campaignId: string, preview: EnkatPreviewTokenPayload): OutboundInsertRow[] {
  const createdAt = new Date().toISOString();

  return preview.selectedRows.map((row) => ({
    kampanj_id: campaignId,
    unik_kod: generateSurveyCode(),
    patient_id_hash: hashPatientId(row.patientId),
    telefon_temp_krypterad: kryptera(row.phone),
    vardgivare_namn: row.providerName,
    besoksdatum: row.visitDate,
    besoksstart_tid: row.visitStartTime,
    bokningstyp_raw: row.bookingTypeRaw,
    bokningstyp_normaliserad: row.bookingTypeNormalized,
    created_at: createdAt
  }));
}

async function insertOutboundRows(campaignId: string, preview: EnkatPreviewTokenPayload): Promise<InsertedUtskickRow[]> {
  const { data, error } = await supabaseAdmin
    .from('enkat_utskick')
    .insert(buildOutboundInsertRows(campaignId, preview))
    .select('id, unik_kod, vardgivare_namn, besoksdatum, bokningstyp_raw, bokningstyp_normaliserad, telefon_temp_krypterad');

  if (error || !data) {
    throw new Error(error?.message || 'Kunde inte skapa utskicksrader');
  }

  return data as InsertedUtskickRow[];
}

async function insertOutboundRowsWithCleanup(campaignId: string, preview: EnkatPreviewTokenPayload): Promise<InsertedUtskickRow[]> {
  try {
    return await insertOutboundRows(campaignId, preview);
  } catch (error) {
    await cleanupCampaign(campaignId);
    throw error;
  }
}

async function createDeliveryLogs(campaignId: string, rows: InsertedUtskickRow[]): Promise<void> {
  const { error } = await supabaseAdmin
    .from('enkat_delivery_log')
    .insert(rows.map((row) => ({
      kampanj_id: campaignId,
      utskick_id: row.id,
      typ: 'forsta_sms',
      status: 'queued',
      provider: '46elks'
    })));

  if (error) {
    throw new Error(error.message || 'Kunde inte skapa leveranslogg för utskicken');
  }
}

async function createDeliveryLogsWithCleanup(campaignId: string, rows: InsertedUtskickRow[]): Promise<void> {
  try {
    await createDeliveryLogs(campaignId, rows);
  } catch (error) {
    await cleanupCampaign(campaignId);
    throw error;
  }
}

async function processQueueIfNeeded(sendNow: boolean, campaignId: string): Promise<QueueSendSummary> {
  if (!sendNow) {
    return { sent: 0, failed: 0 };
  }

  const queueResult = await processQueuedEnkatMessages({
    supabase: supabaseAdmin,
    campaignId,
    limit: INITIAL_ENKAT_SEND_LIMIT,
    decryptPhone: dekryptera,
    buildMessage: (template, row, code) => buildEnkatSmsMessage(template, row, code),
    sendSms: sendEnkatSms
  });

  return {
    sent: queueResult.sent,
    failed: queueResult.failed
  };
}

function resolveCampaignStatus(sendNow: boolean, fallbackStatus: string, sentCount: number, failedCount: number): string {
  if (!sendNow) {
    return fallbackStatus;
  }

  if (failedCount > 0 && sentCount === 0) {
    return 'fel';
  }

  return 'skickar';
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const anvandare = await requireAuthenticatedUser(cookies, request);
  if (anvandare instanceof Response) {
    return anvandare;
  }

  const parsedBody = await parseSendRequest(request);
  if (parsedBody instanceof Response) {
    return parsedBody;
  }

  try {
    const preparedPreview = preparePreview(parsedBody.previewToken, anvandare.id);
    if (preparedPreview instanceof Response) {
      return preparedPreview;
    }

    const campaignResolution = await createOrReuseCampaign(
      anvandare.id,
      preparedPreview.previewTokenHash,
      preparedPreview.preview,
      parsedBody
    );

    if (campaignResolution.kind === 'existing') {
      return json({
        success: true,
        data: buildExistingCampaignResponse(campaignResolution.campaign)
      });
    }

    const campaign = campaignResolution.campaign;
    const insertedRows = await insertOutboundRowsWithCleanup(campaign.id, preparedPreview.preview);
    await createDeliveryLogsWithCleanup(campaign.id, insertedRows);
    const queueResult = await processQueueIfNeeded(parsedBody.sendNow, campaign.id);

    return json({
      success: true,
      data: {
        campaignId: campaign.id,
        status: resolveCampaignStatus(parsedBody.sendNow, campaign.status, queueResult.sent, queueResult.failed),
        totalValid: preparedPreview.preview.validRows,
        totalQueued: preparedPreview.preview.validRows,
        totalSent: queueResult.sent,
        totalFailed: queueResult.failed
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
