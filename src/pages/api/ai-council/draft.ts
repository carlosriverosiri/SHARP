/**
 * API: AI Council Draft - Auto-save work-in-progress responses
 * 
 * VIKTIG FUNKTION: Detta möjliggör att användare kan fortsätta där de var
 * även när de byter dator (t.ex. från hemma till jobbet). Draftet sparas
 * per användare i Supabase och laddas automatiskt när sidan öppnas.
 * 
 * Endpoints:
 * - GET /api/ai-council/draft - Get current draft
 * - POST /api/ai-council/draft - Save/update draft  
 * - DELETE /api/ai-council/draft - Clear draft
 * 
 * Vad sparas:
 * - prompt: Den aktuella frågan
 * - context: Kontextinformation
 * - responses: Alla AI-svar (R1)
 * - r2_responses: Deliberation-svar (R2)
 * - has_run_deliberation: Om deliberation körts
 * 
 * Utgångstid: 7 dagar (kan ändras i DRAFT_EXPIRY_HOURS)
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

// Hur länge ett draft ska sparas (i timmar) - 7 dagar default
const DRAFT_EXPIRY_HOURS = 7 * 24; // 168 timmar = 7 dagar

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET - Load current draft
export const GET: APIRoute = async ({ cookies }) => {
  const inloggad = await arInloggad(cookies);
  if (!inloggad) {
    return new Response(JSON.stringify({ error: 'Ej inloggad', draft: null }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const anvandare = await hamtaAnvandare(cookies);
  if (!anvandare) {
    return new Response(JSON.stringify({ error: 'Kunde inte hämta användare', draft: null }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Supabase ej konfigurerat', draft: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { data, error } = await supabase
      .from('ai_council_drafts')
      .select('*')
      .eq('user_id', anvandare.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    // Check if draft is expired (default: 7 days)
    if (data && data.updated_at) {
      const updatedAt = new Date(data.updated_at).getTime();
      const now = Date.now();
      const hoursSinceUpdate = (now - updatedAt) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate > DRAFT_EXPIRY_HOURS) {
        // Draft expired, delete it
        await supabase.from('ai_council_drafts').delete().eq('user_id', anvandare.id);
        return new Response(JSON.stringify({ draft: null, expired: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ draft: data || null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching draft:', error);
    return new Response(JSON.stringify({ error: error.message, draft: null }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST - Save/update draft
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
    const { prompt, context, responses, r2Responses, hasRunDeliberation } = body;

    // Upsert - insert or update based on user_id
    const { data, error } = await supabase
      .from('ai_council_drafts')
      .upsert({
        user_id: anvandare.id,
        prompt: prompt || '',
        context: context || '',
        responses: responses || {},
        r2_responses: r2Responses || {},
        has_run_deliberation: hasRunDeliberation || false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true, draft: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error saving draft:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE - Clear draft
export const DELETE: APIRoute = async ({ cookies }) => {
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
    const { error } = await supabase
      .from('ai_council_drafts')
      .delete()
      .eq('user_id', anvandare.id);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error deleting draft:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
