/**
 * API: Hämta kampanjstatus
 * 
 * GET /api/kampanj/status?id=xxx
 * 
 * Returnerar kampanjens aktuella status med alla mottagare.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';

export const GET: APIRoute = async ({ url, cookies }) => {
  // Kontrollera inloggning
  if (!await arInloggad(cookies)) {
    return new Response(
      JSON.stringify({ error: 'Ej inloggad' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const kampanjId = url.searchParams.get('id');
  
  if (!kampanjId) {
    return new Response(
      JSON.stringify({ error: 'Kampanj-ID krävs' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Hämta kampanj
    const { data: kampanj, error: kampanjError } = await supabase
      .from('sms_kampanjer')
      .select(`
        *,
        skapare:skapad_av (email)
      `)
      .eq('id', kampanjId)
      .single();

    if (kampanjError || !kampanj) {
      return new Response(
        JSON.stringify({ error: 'Kampanj hittades inte' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Hämta mottagare
    const { data: mottagare } = await supabase
      .from('sms_kampanj_mottagare')
      .select('*')
      .eq('kampanj_id', kampanjId)
      .order('ordning');

    // Hämta personal som ska notifieras
    const { data: notifieringar } = await supabase
      .from('sms_kampanj_notifieringar')
      .select(`
        personal_id,
        notifierad_vid,
        profiles:personal_id (email)
      `)
      .eq('kampanj_id', kampanjId);

    // Beräkna statistik
    const skickade = mottagare?.filter(m => m.skickad_vid) || [];
    const jaSvar = mottagare?.filter(m => m.svar === 'ja') || [];
    const nejSvar = mottagare?.filter(m => m.svar === 'nej') || [];
    const reservSvar = mottagare?.filter(m => m.svar === 'reserv') || [];
    const vantar = skickade.filter(m => !m.svar);

    // Hitta första JA (den som fick tiden)
    const forstaJa = mottagare?.find(m => m.svar_ordning === 1);
    
    // Hitta reserv
    const reserv = mottagare?.find(m => m.svar_ordning === 2);

    return new Response(
      JSON.stringify({
        kampanj: {
          id: kampanj.id,
          datum: kampanj.datum,
          tid: kampanj.tid,
          operationTyp: kampanj.operation_typ,
          status: kampanj.status,
          utfall: kampanj.utfall,
          skapadVid: kampanj.skapad_vid,
          skapadAv: (kampanj.skapare as any)?.email,
          sistaVarstid: kampanj.sista_svarstid,
          batchIntervallMinuter: kampanj.batch_intervall_minuter,
          nastaUtskickVid: kampanj.nasta_utskick_vid,
          antalSmsSkickade: kampanj.antal_sms_skickade,
        },
        mottagare: mottagare?.map(m => ({
          id: m.id,
          namn: m.namn,
          telefonMasked: m.telefon_masked,
          harSamtycke: m.har_samtycke,
          ordning: m.ordning,
          skickadVid: m.skickad_vid,
          svar: m.svar,
          svarVid: m.svar_vid,
          svarOrdning: m.svar_ordning,
        })) || [],
        statistik: {
          totalt: mottagare?.length || 0,
          skickade: skickade.length,
          jaSvar: jaSvar.length,
          nejSvar: nejSvar.length,
          reservSvar: reservSvar.length,
          vantar: vantar.length,
          ejSkickade: (mottagare?.length || 0) - skickade.length,
        },
        forstaJa: forstaJa ? {
          namn: forstaJa.namn,
          telefonMasked: forstaJa.telefon_masked,
          svarVid: forstaJa.svar_vid,
        } : null,
        reserv: reserv ? {
          namn: reserv.namn,
          telefonMasked: reserv.telefon_masked,
          svarVid: reserv.svar_vid,
        } : null,
        notifieringar: notifieringar?.map(n => ({
          email: (n.profiles as any)?.email,
          notifieradVid: n.notifierad_vid,
        })) || [],
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
