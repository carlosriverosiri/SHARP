import type { APIRoute } from 'astro';
import { jsonResponse as json, getErrorMessage } from '../../../lib/enkat-api-helpers';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';
import { harMinstPortalRoll } from '../../../lib/portal-roles';
import { supabaseAdmin } from '../../../lib/supabase';
import { dekryptera } from '../../../lib/kryptering';
import { dispatchEnkatReminders } from '../../../lib/enkat-remind-runner';

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
  if (!await arInloggad(cookies, request)) {
    return json({ success: false, error: 'Ej inloggad' }, 401);
  }

  const anvandare = await hamtaAnvandare(cookies, request);
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
      .select('id, skapad_av, skicka_paminnelse')
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

    const result = await dispatchEnkatReminders(supabaseAdmin, dekryptera, { campaignId });

    return json({
      success: true,
      data: {
        campaignId: campaign.id,
        eligible: result.eligible,
        sent: result.sent,
        failed: result.failed
      }
    });
  } catch (error: unknown) {
    console.error('Kunde inte skicka påminnelser:', error);
    return json(
      {
        success: false,
        error: 'Kunde inte skicka påminnelser.',
        details: { message: getErrorMessage(error) }
      },
      500
    );
  }
};
