/**
 * API: Lista patienter i patientpoolen
 * 
 * GET /api/pool/lista
 * Query params:
 *   - status: 'alla' | 'tillganglig' | 'reserv' | 'nej' | 'bokad'
 * 
 * Returnerar alla patienter grupperade efter status
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';

export const GET: APIRoute = async ({ cookies, url }) => {
  // Kontrollera inloggning
  if (!await arInloggad(cookies)) {
    return new Response(
      JSON.stringify({ error: 'Ej inloggad' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const statusFilter = url.searchParams.get('status') || 'alla';

  try {
    // Bygg query
    let query = supabase
      .from('kort_varsel_patienter')
      .select('*')
      .gt('utgar_vid', new Date().toISOString()) // Endast aktiva (ej utgångna)
      .order('tillagd_vid', { ascending: false });

    // Filtrera på status om angett
    if (statusFilter !== 'alla') {
      query = query.eq('status', statusFilter);
    }

    const { data: patienter, error } = await query;

    if (error) {
      console.error('Kunde inte hämta patienter:', error);
      return new Response(
        JSON.stringify({ error: 'Kunde inte hämta patienter' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Gruppera efter status
    const grupperade = {
      tillgangliga: patienter?.filter(p => p.status === 'tillganglig') || [],
      kontaktade: patienter?.filter(p => p.status === 'kontaktad') || [],
      reserv: patienter?.filter(p => p.status === 'reserv') || [],
      nej: patienter?.filter(p => p.status === 'nej') || [],
      bokade: patienter?.filter(p => p.status === 'bokad') || [],
    };

    // Statistik
    const statistik = {
      tillgangliga: grupperade.tillgangliga.length,
      kontaktade: grupperade.kontaktade.length,
      reserv: grupperade.reserv.length,
      nej: grupperade.nej.length,
      nejEjHanterade: grupperade.nej.filter(p => !p.hanterad_i_journal).length,
      bokade: grupperade.bokade.length,
      totalt: patienter?.length || 0,
    };

    return new Response(
      JSON.stringify({
        success: true,
        patienter: statusFilter === 'alla' ? grupperade : patienter,
        statistik,
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
