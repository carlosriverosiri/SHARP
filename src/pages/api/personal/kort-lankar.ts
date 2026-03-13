import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';
import shortLinksData from '../../../data/shortLinks.json';

export const prerender = false;

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
const LINK_TYPES = ['internal', 'external', 'form', 'booking'] as const;

type LinkType = (typeof LINK_TYPES)[number];

type LinkPayload = {
  id?: string;
  name?: string;
  short_code?: string;
  target?: string;
  category?: string;
  is_external?: boolean;
  link_type?: LinkType;
  is_system?: boolean;
  is_active?: boolean;
  sort_order?: number;
  sms_template?: string | null;
  description?: string | null;
};

type ShortLinkSeedItem = {
  name?: string;
  shortCode?: string;
  target?: string;
  isExternal?: boolean;
  _comment?: string;
};

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isLinkType(value: unknown): value is LinkType {
  return typeof value === 'string' && LINK_TYPES.includes(value as LinkType);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined;
}

function asNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeShortCode(value: string): string {
  return value.startsWith('/') ? value : `/${value}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Okänt fel';
}

function escapeSupabaseSearch(term: string): string {
  return term.replace(/[%_,]/g, ' ').trim();
}

function inferLinkType(category: string | undefined, isExternal: boolean | undefined, requestedType: LinkType | undefined): LinkType {
  if (requestedType) return requestedType;
  if (category === 'Frågeformulär') return 'form';
  if (category === 'Bokningar') return 'booking';
  if (isExternal) return 'external';
  return 'internal';
}

function getDefaultSmsTemplate(category: string): string {
  const templates: Record<string, string> = {
    Diagnoser: 'Hej! Läs mer om $namn: $länk /Södermalms Ortopedi',
    Operationer: 'Hej! Du är planerad för $namn. Läs mer här: $länk /Södermalms Ortopedi',
    Rehab: 'Hej! Efter din operation, läs igenom rehabinformationen: $länk /Södermalms Ortopedi',
    'Frågeformulär': 'Hej! Vänligen fyll i detta formulär inför ditt besök: $länk /Södermalms Ortopedi',
    Bokningar: 'Hej! Här är bokningslänken: $länk /Södermalms Ortopedi',
    Info: 'Hej! Här finns information som kan vara bra att läsa: $länk /Södermalms Ortopedi',
  };
  return templates[category] || 'Hej! Se denna länk: $länk /Södermalms Ortopedi';
}

function buildSeedRowsFromShortLinks() {
  const rows: Array<{
    name: string;
    short_code: string;
    target: string;
    category: string;
    is_external: boolean;
    link_type: LinkType;
    is_system: boolean;
    is_active: boolean;
    sort_order: number;
    sms_template: string | null;
    description: string | null;
  }> = [];

  const source = shortLinksData as Record<string, unknown>;
  Object.entries(source).forEach(([category, rawItems]) => {
    if (category.startsWith('_') || !Array.isArray(rawItems)) return;

    rawItems.forEach((rawItem, index) => {
      const item = rawItem as ShortLinkSeedItem;
      const name = typeof item?.name === 'string' ? item.name.trim() : '';
      const shortCodeRaw = typeof item?.shortCode === 'string' ? item.shortCode.trim() : '';
      const target = typeof item?.target === 'string' ? item.target.trim() : '';
      if (!name || !shortCodeRaw || !target) return;

      const isExternal = Boolean(item.isExternal);
      rows.push({
        name,
        short_code: normalizeShortCode(shortCodeRaw),
        target,
        category,
        is_external: isExternal,
        link_type: inferLinkType(category, isExternal, undefined),
        is_system: true,
        is_active: true,
        sort_order: (index + 1) * 10,
        sms_template: getDefaultSmsTemplate(category),
        description: typeof item._comment === 'string' ? item._comment : null,
      });
    });
  });

  return rows;
}

function buildLinkData(payload: Record<string, unknown>, options: { allowSystemFields: boolean; isCreate: boolean }): LinkPayload {
  const name = asString(payload.name);
  const shortCode = asString(payload.short_code);
  const target = asString(payload.target);
  const category = asString(payload.category);
  const isExternal = asBoolean(payload.is_external);
  const requestedType = isLinkType(payload.link_type) ? payload.link_type : undefined;
  const linkType = inferLinkType(category, isExternal, requestedType);

  const data: LinkPayload = {};

  if (name !== undefined) data.name = name;
  if (shortCode !== undefined) data.short_code = normalizeShortCode(shortCode);
  if (target !== undefined) data.target = target;
  if (category !== undefined) data.category = category;
  if (isExternal !== undefined) data.is_external = isExternal;
  if (requestedType !== undefined || category !== undefined || isExternal !== undefined) data.link_type = linkType;

  const sortOrder = asNumber(payload.sort_order);
  if (sortOrder !== undefined) data.sort_order = sortOrder;

  const smsTemplate = asNullableString(payload.sms_template);
  if (smsTemplate !== undefined) data.sms_template = smsTemplate;

  const description = asNullableString(payload.description);
  if (description !== undefined) data.description = description;

  const isActive = asBoolean(payload.is_active);
  if (isActive !== undefined) data.is_active = isActive;
  else if (options.isCreate) data.is_active = true;

  if (options.allowSystemFields) {
    const isSystem = asBoolean(payload.is_system);
    if (isSystem !== undefined) data.is_system = isSystem;
    else if (options.isCreate) data.is_system = false;
  }

  if (options.isCreate && data.sort_order === undefined) {
    data.sort_order = 0;
  }

  return data;
}

// GET - List all links with optional filters
export const GET: APIRoute = async ({ cookies, url }) => {
  if (!await arInloggad(cookies)) return jsonRes({ error: 'Ej inloggad' }, 401);
  const supabase = getSupabase();
  if (!supabase) return jsonRes({ error: 'Supabase ej konfigurerat', links: [] }, 500);

  try {
    let query = supabase.from('kort_lankar').select('*');

    const category = url.searchParams.get('category')?.trim();
    const linkType = url.searchParams.get('link_type')?.trim();
    const isActiveParam = url.searchParams.get('is_active');
    const includeInactive = url.searchParams.get('include_inactive') === 'true';
    const search = escapeSupabaseSearch(url.searchParams.get('search') ?? '');

    if (category) {
      query = query.eq('category', category);
    }

    if (isLinkType(linkType)) {
      query = query.eq('link_type', linkType);
    }

    if (isActiveParam === 'true') {
      query = query.eq('is_active', true);
    } else if (isActiveParam === 'false') {
      query = query.eq('is_active', false);
    } else if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,short_code.ilike.%${search}%,target.ilike.%${search}%`);
    }

    const { data, error } = await query
      .order('category')
      .order('sort_order')
      .order('name');

    if (error) throw error;

    let links = data || [];
    const shouldAutoSeed =
      links.length === 0 &&
      !category &&
      !linkType &&
      !isActiveParam &&
      !includeInactive &&
      !search;

    if (shouldAutoSeed) {
      const seedRows = buildSeedRowsFromShortLinks();
      if (seedRows.length > 0) {
        const { error: seedError } = await supabase
          .from('kort_lankar')
          .upsert(seedRows, { onConflict: 'short_code' });

        if (seedError) {
          console.error('Error auto-seeding kort_lankar:', seedError);
        } else {
          const { data: seededData, error: seededLoadError } = await supabase
            .from('kort_lankar')
            .select('*')
            .eq('is_active', true)
            .order('category')
            .order('sort_order')
            .order('name');

          if (seededLoadError) {
            console.error('Error loading seeded kort_lankar:', seededLoadError);
          } else {
            links = seededData || [];
          }
        }
      }
    }

    return jsonRes({ links });
  } catch (error: unknown) {
    console.error('Error fetching kort_lankar:', error);
    return jsonRes({ error: getErrorMessage(error), links: [] }, 500);
  }
};

// POST - Create new link
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!await arInloggad(cookies)) return jsonRes({ error: 'Ej inloggad' }, 401);
  const anvandare = await hamtaAnvandare(cookies);
  const supabase = getSupabase();
  if (!supabase) return jsonRes({ error: 'Supabase ej konfigurerat' }, 500);

  try {
    const rawPayload = await request.json();
    if (!isRecord(rawPayload)) return jsonRes({ error: 'Ogiltig payload' }, 400);

    const data = buildLinkData(rawPayload, {
      allowSystemFields: anvandare?.roll === 'admin',
      isCreate: true,
    });

    if (!data.name || !data.short_code || !data.target) {
      return jsonRes({ error: 'Namn, kortkod och mål-URL krävs' }, 400);
    }

    const { data: created, error } = await supabase
      .from('kort_lankar')
      .insert({
        ...data,
        category: data.category ?? 'Info',
        is_external: data.is_external ?? false,
        link_type: data.link_type ?? 'internal',
        created_by: anvandare?.id ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return jsonRes({ success: true, link: created }, 201);
  } catch (error: unknown) {
    console.error('Error creating kort_lank:', error);
    const message = getErrorMessage(error);
    if (message.includes('unique') || message.includes('duplicate')) {
      return jsonRes({ error: 'Kortkoden finns redan' }, 409);
    }
    return jsonRes({ error: message }, 500);
  }
};

// PUT - Update link
export const PUT: APIRoute = async ({ request, cookies }) => {
  if (!await arInloggad(cookies)) return jsonRes({ error: 'Ej inloggad' }, 401);
  const anvandare = await hamtaAnvandare(cookies);
  const supabase = getSupabase();
  if (!supabase) return jsonRes({ error: 'Supabase ej konfigurerat' }, 500);

  try {
    const rawPayload = await request.json();
    if (!isRecord(rawPayload)) return jsonRes({ error: 'Ogiltig payload' }, 400);

    const id = asString(rawPayload.id);
    if (!id) return jsonRes({ error: 'ID krävs' }, 400);

    const updateData = buildLinkData(rawPayload, {
      allowSystemFields: anvandare?.roll === 'admin',
      isCreate: false,
    });

    const { error } = await supabase
      .from('kort_lankar')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    return jsonRes({ success: true });
  } catch (error: unknown) {
    console.error('Error updating kort_lank:', error);
    const message = getErrorMessage(error);
    if (message.includes('unique') || message.includes('duplicate')) {
      return jsonRes({ error: 'Kortkoden finns redan' }, 409);
    }
    return jsonRes({ error: message }, 500);
  }
};

// PATCH - Archive / restore link
export const PATCH: APIRoute = async ({ request, cookies }) => {
  if (!await arInloggad(cookies)) return jsonRes({ error: 'Ej inloggad' }, 401);
  const supabase = getSupabase();
  if (!supabase) return jsonRes({ error: 'Supabase ej konfigurerat' }, 500);

  try {
    const rawPayload = await request.json();
    if (!isRecord(rawPayload)) return jsonRes({ error: 'Ogiltig payload' }, 400);

    const id = asString(rawPayload.id);
    const isActive = asBoolean(rawPayload.is_active);

    if (!id) return jsonRes({ error: 'ID krävs' }, 400);
    if (isActive === undefined) return jsonRes({ error: 'is_active måste vara true eller false' }, 400);

    const { error } = await supabase
      .from('kort_lankar')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;
    return jsonRes({ success: true, is_active: isActive });
  } catch (error: unknown) {
    console.error('Error archiving kort_lank:', error);
    return jsonRes({ error: getErrorMessage(error) }, 500);
  }
};

// DELETE - Delete non-system links
export const DELETE: APIRoute = async ({ cookies, url }) => {
  if (!await arInloggad(cookies)) return jsonRes({ error: 'Ej inloggad' }, 401);
  const supabase = getSupabase();
  if (!supabase) return jsonRes({ error: 'Supabase ej konfigurerat' }, 500);

  const id = url.searchParams.get('id')?.trim();
  if (!id) return jsonRes({ error: 'ID krävs' }, 400);

  try {
    const { data: existing, error: loadError } = await supabase
      .from('kort_lankar')
      .select('is_system')
      .eq('id', id)
      .single();

    if (loadError) throw loadError;
    if (existing?.is_system) {
      return jsonRes({ error: 'Systemlänkar ska arkiveras i stället för att raderas' }, 400);
    }

    const { error } = await supabase.from('kort_lankar').delete().eq('id', id);
    if (error) throw error;
    return jsonRes({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting kort_lank:', error);
    return jsonRes({ error: getErrorMessage(error) }, 500);
  }
};
