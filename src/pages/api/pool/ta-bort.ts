/**
 * API: Ta bort patient från patientpoolen
 * 
 * POST /api/pool/ta-bort
 * Body: {
 *   patientId: "uuid"
 * }
 * 
 * Används för att manuellt ta bort patienter (t.ex. efter NEJ-hantering).
 * Patienter raderas också automatiskt efter 7 dagar.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  // Kontrollera inloggning
  if (!await arInloggad(cookies)) {
    return new Response(
      JSON.stringify({ error: 'Ej inloggad' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Parsa body
  let body: { patientId: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Ogiltig JSON' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!body.patientId) {
    return new Response(
      JSON.stringify({ error: 'patientId krävs' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { error } = await supabase
      .from('kort_varsel_patienter')
      .delete()
      .eq('id', body.patientId);

    if (error) {
      console.error('Kunde inte ta bort patient:', error);
      return new Response(
        JSON.stringify({ error: 'Kunde inte ta bort patient' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Patient borttagen',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Oväntat fel:', error);
    return new Response(
      JSON.stringify({ error: 'Ett oväntat fel uppstod' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
