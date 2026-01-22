/**
 * API: Kontrollera om det finns aktiva kampanjer
 * 
 * GET /api/kampanj/aktiv
 * 
 * Används för header-indikatorn.
 * Returnerar { harAktiv: true/false, antal: X, status: 'aktiv'|'fylld' }
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export const GET: APIRoute = async ({ cookies }) => {
  // Kontrollera inloggning
  if (!await arInloggad(cookies)) {
    return new Response(
      JSON.stringify({ harAktiv: false }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Räkna aktiva kampanjer
    const { data: aktiva, error: aktivaError } = await supabaseAdmin
      .from('sms_kampanjer')
      .select('id, status')
      .in('status', ['aktiv', 'fylld'])
      .order('skapad_vid', { ascending: false });

    if (aktivaError) {
      console.error('Kunde inte hämta kampanjer:', aktivaError);
      return new Response(
        JSON.stringify({ harAktiv: false }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const antalAktiva = aktiva?.filter(k => k.status === 'aktiv').length || 0;
    const antalFyllda = aktiva?.filter(k => k.status === 'fylld').length || 0;

    // Bestäm status för indikatorn
    let indikatorStatus: 'none' | 'aktiv' | 'fylld' = 'none';
    if (antalFyllda > 0) {
      indikatorStatus = 'fylld'; // Gul - någon svarade JA, väntar på bekräftelse
    } else if (antalAktiva > 0) {
      indikatorStatus = 'aktiv'; // Röd - väntar på svar
    }

    return new Response(
      JSON.stringify({
        harAktiv: antalAktiva > 0 || antalFyllda > 0,
        antalAktiva,
        antalFyllda,
        status: indikatorStatus,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Oväntat fel:', error);
    return new Response(
      JSON.stringify({ harAktiv: false }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
