/**
 * AI Council Profile API
 * 
 * GET - Hämta användarens profil
 * POST - Skapa/uppdatera profil
 */

// Disable prerendering - this endpoint must be server-rendered
export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.SUPABASE_ANON_KEY;

interface UserProfile {
  id?: string;
  user_id?: string;
  role: string;
  role_title?: string;
  years_experience?: number;
  technical_level: number;
  it_skills: string[];
  medical_specialties: string[];
  background?: string;
  scientific_context?: string;
  can_do?: string;
  cannot_do?: string;
  response_style: string;
  include_code_examples: boolean;
  include_references: boolean;
  preferred_language: string;
}

// Generate system prompt from profile
export function generateSystemPrompt(profile: UserProfile): string {
  const levelNames = ['Nybörjare', 'Grundläggande', 'Mellan', 'Avancerad', 'Expert'];
  const levelDescriptions = [
    'Kan använda mejl och webben',
    'Kan installera program, felsöka enkla problem',
    'Förstår filsystem, kan följa tekniska instruktioner',
    'Kan skriva scripts, förstår API:er',
    'Kan programmera, förstår systemarkitektur'
  ];
  
  let prompt = `Du svarar ${profile.role_title || 'en användare'}`;
  
  if (profile.years_experience) {
    prompt += ` med ${profile.years_experience} års erfarenhet`;
  }
  
  prompt += '.\n\n';
  
  // Teknisk nivå
  prompt += `TEKNISK NIVÅ: ${profile.technical_level}/5 (${levelNames[profile.technical_level - 1]})\n`;
  prompt += `${levelDescriptions[profile.technical_level - 1]}.\n`;
  
  // IT-kunskaper
  if (profile.it_skills && profile.it_skills.length > 0) {
    prompt += `\nIT-KUNSKAPER: ${profile.it_skills.join(', ')}\n`;
  }
  
  // Medicinska specialiteter
  if (profile.medical_specialties && profile.medical_specialties.length > 0) {
    prompt += `\nMEDICINSKA SPECIALITETER: ${profile.medical_specialties.join(', ')}\n`;
  }
  
  // Bakgrund
  if (profile.background) {
    prompt += `\nBAKGRUND:\n${profile.background}\n`;
  }
  
  // Vad användaren kan/inte kan
  if (profile.can_do) {
    prompt += `\nKAN GÖRA: ${profile.can_do}\n`;
  }
  if (profile.cannot_do) {
    prompt += `\nKAN INTE GÖRA: ${profile.cannot_do}\n`;
  }
  
  // Svarsstil
  prompt += '\nPREFERENSER:\n';
  
  const styleInstructions: Record<string, string> = {
    detailed: 'Ge detaljerade svar med fullständiga förklaringar och bakgrund.',
    balanced: 'Ge balanserade svar, varken för korta eller för långa.',
    concise: 'Ge korta och kärnfulla svar utan onödiga detaljer.',
    'step-by-step': 'Ge steg-för-steg-instruktioner med tydligt numrerade punkter.'
  };
  
  prompt += `- ${styleInstructions[profile.response_style] || styleInstructions.balanced}\n`;
  
  if (profile.include_code_examples) {
    prompt += '- Inkludera kodexempel när relevant.\n';
  } else {
    prompt += '- Undvik kodexempel om inte absolut nödvändigt.\n';
  }
  
  if (profile.include_references) {
    prompt += '- Inkludera källhänvisningar när möjligt.\n';
  }
  
  // Anpassa språk baserat på teknisk nivå
  if (profile.technical_level <= 2) {
    prompt += '\nVIKTIGT: Användaren har begränsad teknisk bakgrund. Förklara steg för steg, undvik facktermer, och ge konkreta exempel.';
  } else if (profile.technical_level >= 4) {
    prompt += '\nVIKTIGT: Användaren har avancerad teknisk bakgrund. Du kan använda tekniska termer och ge detaljerade implementationsdetaljer.';
  }
  
  prompt += '\n\nAnpassa ditt svar efter denna bakgrund.';
  
  return prompt;
}

export const GET: APIRoute = async ({ cookies }) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase ej konfigurerat' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const accessToken = cookies.get('sb-access-token')?.value;
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'Ej inloggad' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Ej inloggad' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { data: profile, error } = await supabase
    .from('ai_council_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Generate system prompt preview if profile exists
  const systemPrompt = profile ? generateSystemPrompt(profile) : null;

  return new Response(JSON.stringify({ 
    profile: profile || null,
    systemPrompt,
    hasProfile: !!profile
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase ej konfigurerat' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const accessToken = cookies.get('sb-access-token')?.value;
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'Ej inloggad' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Ej inloggad' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const body = await request.json() as Partial<UserProfile>;

  // Validate required fields
  if (!body.role) {
    return new Response(JSON.stringify({ error: 'Roll krävs' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const profileData = {
    user_id: user.id,
    role: body.role,
    role_title: body.role_title || null,
    years_experience: body.years_experience || null,
    technical_level: body.technical_level || 2,
    it_skills: body.it_skills || [],
    medical_specialties: body.medical_specialties || [],
    background: body.background || null,
    scientific_context: body.scientific_context || null,
    can_do: body.can_do || null,
    cannot_do: body.cannot_do || null,
    response_style: body.response_style || 'balanced',
    include_code_examples: body.include_code_examples ?? true,
    include_references: body.include_references ?? false,
    preferred_language: body.preferred_language || 'sv'
  };

  // Upsert (insert or update)
  const { data, error } = await supabase
    .from('ai_council_profiles')
    .upsert(profileData, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const systemPrompt = generateSystemPrompt(data);

  return new Response(JSON.stringify({ 
    success: true, 
    profile: data,
    systemPrompt
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
