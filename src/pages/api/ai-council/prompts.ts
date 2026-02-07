/**
 * API: AI Council Prompts - CRUD for saved prompts
 * 
 * GET /api/ai-council/prompts - List user's prompts
 * POST /api/ai-council/prompts - Save a new prompt
 * PATCH /api/ai-council/prompts?id=xxx - Update a prompt
 * DELETE /api/ai-council/prompts?id=xxx - Delete a prompt
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

// GET - List prompts
export const GET: APIRoute = async ({ cookies }) => {
  const inloggad = await arInloggad(cookies);
  if (!inloggad) {
    return new Response(JSON.stringify({ error: 'Ej inloggad', prompts: [] }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const anvandare = await hamtaAnvandare(cookies);
  if (!anvandare) {
    return new Response(JSON.stringify({ error: 'Kunde inte hamta anvandare', prompts: [] }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase ej konfigurerat', prompts: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { data, error } = await supabase
      .from('ai_council_prompts')
      .select('*')
      .eq('user_id', anvandare.id)
      .order('created_at', { ascending: false });

    if (error) {
      // Table might not exist yet
      if (error.message?.includes('does not exist')) {
        return new Response(JSON.stringify({ prompts: [], tableNotReady: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }

    return new Response(JSON.stringify({ prompts: data || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching prompts:', error);
    return new Response(JSON.stringify({ error: error.message, prompts: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST - Save prompt
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
    const { name, prompt, description, category, tags } = body;

    if (!name || !prompt) {
      return new Response(JSON.stringify({ error: 'Namn och prompt kravs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabase
      .from('ai_council_prompts')
      .insert({
        user_id: anvandare.id,
        name: name.trim(),
        prompt: prompt.trim(),
        description: description?.trim() || null,
        category: category?.trim() || null,
        tags: tags || [],
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true, prompt: data }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error saving prompt:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PATCH - Update prompt (name, prompt text, or increment use count)
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

  const promptId = url.searchParams.get('id');
  if (!promptId) {
    return new Response(JSON.stringify({ error: 'Prompt-ID kravs' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { name, prompt, description, category, tags, incrementUse } = body;

    const updateData: Record<string, any> = {};
    
    if (name !== undefined) updateData.name = name.trim();
    if (prompt !== undefined) updateData.prompt = prompt.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (category !== undefined) updateData.category = category?.trim() || null;
    if (tags !== undefined) updateData.tags = tags;
    
    // Increment use count if requested
    if (incrementUse) {
      // First get current count
      const { data: current } = await supabase
        .from('ai_council_prompts')
        .select('use_count')
        .eq('id', promptId)
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
      .from('ai_council_prompts')
      .update(updateData)
      .eq('id', promptId)
      .eq('user_id', anvandare.id);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error updating prompt:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE - Delete prompt
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

  const promptId = url.searchParams.get('id');
  if (!promptId) {
    return new Response(JSON.stringify({ error: 'Prompt-ID kravs' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { error } = await supabase
      .from('ai_council_prompts')
      .delete()
      .eq('id', promptId)
      .eq('user_id', anvandare.id);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error deleting prompt:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};