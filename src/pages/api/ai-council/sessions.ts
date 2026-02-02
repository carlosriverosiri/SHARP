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
      .select('id, name, prompt, context, synthesis, synthesis_model, total_duration_ms, created_at, tags, response_openai, response_anthropic, response_google')
      .eq('user_id', anvandare.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Transform to include responses array and supersynthesis for frontend
    const sessions = (data || []).map(s => ({
      ...s,
      // Build responses object from individual provider responses
      responses: {
        ...(s.response_openai && { openai: s.response_openai }),
        ...(s.response_anthropic && { anthropic: s.response_anthropic }),
        ...(s.response_google && { google: s.response_google }),
      },
      // Check if synthesis was actually a supersynthesis (has deliberation markers)
      supersynthesis: s.synthesis?.includes('SUPERSYNTES') || s.synthesis?.includes('Runda 2') ? s.synthesis : null,
    }));

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ sessions }), {
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
      name,
      prompt,
      context,
      responses,
      synthesis,
      supersynthesis,
      synthesisModel,
      totalDuration,
      tags = []
    } = body;
    
    // Use supersynthesis if provided, otherwise use synthesis
    const finalSynthesis = supersynthesis || synthesis;

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt krävs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Check for any content - allow saving with just prompt for migration purposes
    const hasResponses = responses && (
      Array.isArray(responses) ? responses.length > 0 : Object.keys(responses).length > 0
    );
    
    // Only require synthesis/responses for new sessions, not migrations
    // (migrations may have incomplete data from old localStorage format)

    // Structure responses by provider - handle both array and object formats
    const responsesByProvider: Record<string, any> = {};
    if (responses) {
      if (Array.isArray(responses)) {
        // Array format: [{ provider: 'OpenAI', content: '...' }, ...]
        responses.forEach((r: any) => {
          if (r.provider === 'OpenAI') responsesByProvider.openai = r;
          else if (r.provider === 'Anthropic') responsesByProvider.anthropic = r;
          else if (r.provider === 'Google') responsesByProvider.google = r;
        });
      } else if (typeof responses === 'object') {
        // Object format: { 'gpt-4o': { content: '...' }, 'claude-3-5-sonnet': { ... } }
        for (const [key, value] of Object.entries(responses)) {
          if (value && typeof value === 'object') {
            if (key.includes('gpt') || key.includes('openai') || key === 'o1' || key === 'o3') {
              responsesByProvider.openai = { ...value as object, model: key };
            } else if (key.includes('claude') || key.includes('anthropic')) {
              responsesByProvider.anthropic = { ...value as object, model: key };
            } else if (key.includes('gemini') || key.includes('google')) {
              responsesByProvider.google = { ...value as object, model: key };
            }
          }
        }
      }
    }

    const { data, error } = await supabase
      .from('ai_council_sessions')
      .insert({
        user_id: anvandare.id,
        name: name || null,
        prompt,
        context: context || null,
        response_openai: responsesByProvider.openai || null,
        response_anthropic: responsesByProvider.anthropic || null,
        response_google: responsesByProvider.google || null,
        synthesis: finalSynthesis || null,
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
