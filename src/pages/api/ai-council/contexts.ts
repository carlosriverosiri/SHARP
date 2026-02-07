/**
 * API: AI Council Contexts - CRUD for saved contexts
 * 
 * GET /api/ai-council/contexts - List user's contexts
 * POST /api/ai-council/contexts - Save a new context
 * PATCH /api/ai-council/contexts?id=xxx - Update a context
 * DELETE /api/ai-council/contexts?id=xxx - Delete a context
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET - List contexts
export const GET: APIRoute = async ({ cookies }) => {
  const inloggad = await arInloggad(cookies);
  if (!inloggad) {
    return new Response(JSON.stringify({ error: 'Ej inloggad', contexts: [] }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const anvandare = await hamtaAnvandare(cookies);
  if (!anvandare) {
    return new Response(JSON.stringify({ error: 'Kunde inte hamta anvandare', contexts: [] }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase ej konfigurerat', contexts: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { data, error } = await supabase
      .from('ai_council_contexts')
      .select('*')
      .eq('user_id', anvandare.id)
      .order('created_at', { ascending: false });

    if (error) {
      // Table might not exist yet
      if (error.message?.includes('does not exist')) {
        return new Response(JSON.stringify({ contexts: [], tableNotReady: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }

    return new Response(JSON.stringify({ contexts: data || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching contexts:', error);
    return new Response(JSON.stringify({ error: error.message, contexts: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST - Save context
export const POST: APIRoute = async ({ request, cookies }) => {
  const inloggad = await arInloggad(cookies);
  if (!inloggad) {
    return new Response(JSON.stringify({ error: 'Ej inloggad' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const anvandare = await hamtaAnvandare(cookies);
  if (!anvandare) {
    return new Response(JSON.stringify({ error: 'Kunde inte hamta anvandare' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase ej konfigurerat' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { name, context, description, category, tags } = body;

    if (!name || !context) {
      return new Response(JSON.stringify({ error: 'Namn och content kravs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabase
      .from('ai_council_contexts')
      .insert({
        user_id: anvandare.id,
        name: name.trim(),
        content: context.trim(),
        description: description?.trim() || null,
        category: category?.trim() || null,
        tags: tags || [],
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true, context: data }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error saving context:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PATCH - Update context (name, context text, or increment use count)
export const PATCH: APIRoute = async ({ request, cookies, url }) => {
  const inloggad = await arInloggad(cookies);
  if (!inloggad) {
    return new Response(JSON.stringify({ error: 'Ej inloggad' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const anvandare = await hamtaAnvandare(cookies);
  if (!anvandare) {
    return new Response(JSON.stringify({ error: 'Kunde inte hamta anvandare' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase ej konfigurerat' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const contextId = url.searchParams.get('id');
  if (!contextId) {
    return new Response(JSON.stringify({ error: 'Context-ID kravs' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { name, context, description, category, tags, incrementUse } = body;

    const updateData: Record<string, any> = {};
    
    if (name !== undefined) updateData.name = name.trim();
    if (context !== undefined) updateData.content = context.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (category !== undefined) updateData.category = category?.trim() || null;
    if (tags !== undefined) updateData.tags = tags;
    
    // Increment use count if requested
    if (incrementUse) {
      // First get current count
      const { data: current } = await supabase
        .from('ai_council_contexts')
        .select('use_count')
        .eq('id', contextId)
        .eq('user_id', anvandare.id)
        .single();
      
      updateData.use_count = (current?.use_count || 0) + 1;
      updateData.last_used_at = new Date().toISOString();
    }

    if (Object.keys(updateData).length === 0) {
      return new Response(JSON.stringify({ error: 'Ingen data att uppdatera' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error } = await supabase
      .from('ai_council_contexts')
      .update(updateData)
      .eq('id', contextId)
      .eq('user_id', anvandare.id);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error updating context:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE - Delete context
export const DELETE: APIRoute = async ({ cookies, url }) => {
  const inloggad = await arInloggad(cookies);
  if (!inloggad) {
    return new Response(JSON.stringify({ error: 'Ej inloggad' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const anvandare = await hamtaAnvandare(cookies);
  if (!anvandare) {
    return new Response(JSON.stringify({ error: 'Kunde inte hamta anvandare' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase ej konfigurerat' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const contextId = url.searchParams.get('id');
  if (!contextId) {
    return new Response(JSON.stringify({ error: 'Context-ID kravs' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { error } = await supabase
      .from('ai_council_contexts')
      .delete()
      .eq('id', contextId)
      .eq('user_id', anvandare.id);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error deleting context:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};