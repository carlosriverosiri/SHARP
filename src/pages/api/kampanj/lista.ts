/**
 * API: Lista kampanjer
 * 
 * GET /api/kampanj/lista
 * GET /api/kampanj/lista?status=aktiv
 * GET /api/kampanj/lista?limit=10
 * 
 * Returnerar lista med kampanjer för dashboard.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export const GET: APIRoute = async ({ url, cookies }) => {
  if (!await arInloggad(cookies)) {
    return new Response(
      JSON.stringify({ error: 'Ej inloggad' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const status = url.searchParams.get('status'); // 'aktiv', 'fylld', 'avslutad'
  const limit = parseInt(url.searchParams.get('limit') || '20');

  try {
    let query = supabaseAdmin
      .from('sms_kampanjer')
      .select(`
        id,
        datum,
        tid,
        operation_typ,
        status,
        utfall,
        skapad_vid,
        fylld_vid,
        antal_sms_skickade,
        batch_intervall_minuter,
        nasta_utskick_vid,
        skapare:skapad_av (email)
      `)
      .order('skapad_vid', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: kampanjer, error } = await query;

    if (error) {
      console.error('Kunde inte hämta kampanjer:', error);
      return new Response(
        JSON.stringify({ error: 'Kunde inte hämta kampanjer' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Hämta statistik för varje kampanj
    const kampanjerMedStatistik = await Promise.all(
      (kampanjer || []).map(async (k) => {
        const { data: mottagare } = await supabaseAdmin
          .from('sms_kampanj_mottagare')
          .select('svar, skickad_vid')
          .eq('kampanj_id', k.id);

        const totalt = mottagare?.length || 0;
        const skickade = mottagare?.filter(m => m.skickad_vid).length || 0;
        const jaSvar = mottagare?.filter(m => m.svar === 'ja').length || 0;
        const nejSvar = mottagare?.filter(m => m.svar === 'nej').length || 0;
        const reservSvar = mottagare?.filter(m => m.svar === 'reserv').length || 0;

        return {
          id: k.id,
          datum: k.datum,
          tid: k.tid,
          operationTyp: k.operation_typ,
          status: k.status,
          utfall: k.utfall,
          skapadVid: k.skapad_vid,
          skapadAv: (k.skapare as any)?.email,
          fylldVid: k.fylld_vid,
          antalSmsSkickade: k.antal_sms_skickade,
          gradvisUtskick: k.batch_intervall_minuter > 0,
          nastaUtskickVid: k.nasta_utskick_vid,
          statistik: {
            totalt,
            skickade,
            jaSvar,
            nejSvar,
            reservSvar,
            vantar: skickade - jaSvar - nejSvar - reservSvar,
          },
        };
      })
    );

    return new Response(
      JSON.stringify({ kampanjer: kampanjerMedStatistik }),
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
