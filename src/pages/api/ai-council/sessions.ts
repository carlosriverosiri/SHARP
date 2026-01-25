/**
 * API: AI Council Sessions - CRUD for saved sessions
 * 
 * GET /api/ai-council/sessions - List user's sessions
 * POST /api/ai-council/sessions - Save a new session
 * DELETE /api/ai-council/sessions?id=xxx - Delete a session
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

// GET - List sessions
export const GET: APIRoute = async ({ cookies, url }) => {
  const inloggad = await arInloggad(cookies);
  if (!inloggad) {
    return new Response(JSON.stringify({ error: 'Ej inloggad' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const anvandare = await hamtaAnvandare(cookies);
  if (!anvandare) {
    return new Response(JSON.stringify({ error: 'Kunde inte hämta användare' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase ej konfigurerat', sessions: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const { data, error } = await supabase
      .from('ai_council_sessions')
      .select('id, prompt, synthesis, synthesis_model, total_duration_ms, created_at, tags')
      .eq('user_id', anvandare.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ sessions: data || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    return new Response(JSON.stringify({ error: error.message, sessions: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST - Save session
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
    return new Response(JSON.stringify({ error: 'Kunde inte hämta användare' }), {
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
    const {
      prompt,
      context,
      responses,
      synthesis,
      synthesisModel,
      totalDuration,
      tags = []
    } = body;

    if (!prompt || !synthesis) {
      return new Response(JSON.stringify({ error: 'Prompt och syntes krävs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Structure responses by provider
    const responsesByProvider: Record<string, any> = {};
    if (Array.isArray(responses)) {
      responses.forEach((r: any) => {
        if (r.provider === 'OpenAI') responsesByProvider.openai = r;
        else if (r.provider === 'Anthropic') responsesByProvider.anthropic = r;
        else if (r.provider === 'Google') responsesByProvider.google = r;
      });
    }

    const { data, error } = await supabase
      .from('ai_council_sessions')
      .insert({
        user_id: anvandare.id,
        prompt,
        context: context || null,
        response_openai: responsesByProvider.openai || null,
        response_anthropic: responsesByProvider.anthropic || null,
        response_google: responsesByProvider.google || null,
        synthesis,
        synthesis_model: synthesisModel || 'claude',
        total_duration_ms: totalDuration || null,
        tags: tags,
      })
      .select('id, created_at')
      .single();

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true, session: data }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error saving session:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE - Delete session
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
    return new Response(JSON.stringify({ error: 'Kunde inte hämta användare' }), {
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

  const sessionId = url.searchParams.get('id');
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Session-ID krävs' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { error } = await supabase
      .from('ai_council_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', anvandare.id); // Ensure user owns the session

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error deleting session:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
