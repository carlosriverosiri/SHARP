import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';

export const prerender = false;

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

function jsonRes(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

// GET - List all links
export const GET: APIRoute = async ({ cookies }) => {
  if (!await arInloggad(cookies)) return jsonRes({ error: 'Ej inloggad' }, 401);
  const supabase = getSupabase();
  if (!supabase) return jsonRes({ links: [] });

  try {
    const { data, error } = await supabase
      .from('kort_lankar')
      .select('*')
      .order('category')
      .order('name');
    if (error) throw error;
    return jsonRes({ links: data || [] });
  } catch (e: any) {
    console.error('Error fetching kort_lankar:', e);
    return jsonRes({ error: e.message, links: [] });
  }
};

// POST - Create new link
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!await arInloggad(cookies)) return jsonRes({ error: 'Ej inloggad' }, 401);
  const anvandare = await hamtaAnvandare(cookies);
  const supabase = getSupabase();
  if (!supabase) return jsonRes({ error: 'Supabase ej konfigurerat' }, 500);

  try {
    const { name, short_code, target, category, is_external } = await request.json();
    if (!name || !short_code || !target) return jsonRes({ error: 'Namn, kortkod och m\u00e5l-URL kr\u00e4vs' }, 400);

    const { data, error } = await supabase
      .from('kort_lankar')
      .insert({
        name,
        short_code: short_code.startsWith('/') ? short_code : '/' + short_code,
        target,
        category: category || 'Info',
        is_external: is_external || false,
        created_by: anvandare?.id || null
      })
      .select()
      .single();
    if (error) throw error;
    return jsonRes({ success: true, link: data }, 201);
  } catch (e: any) {
    console.error('Error creating kort_lank:', e);
    if (e.message?.includes('unique') || e.message?.includes('duplicate')) {
      return jsonRes({ error: 'Kortkoden finns redan' }, 409);
    }
    return jsonRes({ error: e.message }, 500);
  }
};

// PUT - Update link
export const PUT: APIRoute = async ({ request, cookies }) => {
  if (!await arInloggad(cookies)) return jsonRes({ error: 'Ej inloggad' }, 401);
  const supabase = getSupabase();
  if (!supabase) return jsonRes({ error: 'Supabase ej konfigurerat' }, 500);

  try {
    const { id, name, short_code, target, category, is_external } = await request.json();
    if (!id) return jsonRes({ error: 'ID kr\u00e4vs' }, 400);

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (short_code !== undefined) updateData.short_code = short_code.startsWith('/') ? short_code : '/' + short_code;
    if (target !== undefined) updateData.target = target;
    if (category !== undefined) updateData.category = category;
    if (is_external !== undefined) updateData.is_external = is_external;

    const { error } = await supabase.from('kort_lankar').update(updateData).eq('id', id);
    if (error) throw error;
    return jsonRes({ success: true });
  } catch (e: any) {
    console.error('Error updating kort_lank:', e);
    return jsonRes({ error: e.message }, 500);
  }
};

// DELETE - Delete link
export const DELETE: APIRoute = async ({ request, cookies, url }) => {
  if (!await arInloggad(cookies)) return jsonRes({ error: 'Ej inloggad' }, 401);
  const supabase = getSupabase();
  if (!supabase) return jsonRes({ error: 'Supabase ej konfigurerat' }, 500);

  const id = url.searchParams.get('id');
  if (!id) return jsonRes({ error: 'ID kr\u00e4vs' }, 400);

  try {
    const { error } = await supabase.from('kort_lankar').delete().eq('id', id);
    if (error) throw error;
    return jsonRes({ success: true });
  } catch (e: any) {
    console.error('Error deleting kort_lank:', e);
    return jsonRes({ error: e.message }, 500);
  }
};