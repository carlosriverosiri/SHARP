/**
 * API: Översiktsstatistik
 * 
 * GET /api/statistik/oversikt
 * GET /api/statistik/oversikt?period=30
 * 
 * Returnerar dashboard-statistik med nyckeltal och trender.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

interface OversiktData {
  period: string;
  nyckeltal: {
    kampanjer: number;
    fylldaViaSms: number;
    fylldaManuellt: number;
    smsSkickade: number;
    svarMottagna: number;
    jaSvar: number;
    nejSvar: number;
    ingenSvar: number;
    jaRate: number;
    svarsRate: number;
    smsPerFylldTid: number;
  };
  trend: {
    kampanjerTrend: number;
    jaRateTrend: number;
    svarsRateTrend: number;
  };
  svarsfordelning: {
    kategori: string;
    ja: number;
    nej: number;
    ingenSvar: number;
    totalt: number;
    jaRate: number;
  }[];
}

export const GET: APIRoute = async ({ url, cookies }) => {
  if (!await arInloggad(cookies)) {
    return new Response(
      JSON.stringify({ error: 'Ej inloggad' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const periodParam = url.searchParams.get('period') || '30';
  const dagar = periodParam === 'all' ? null : parseInt(periodParam);
  
  try {
    // Hämta kampanjdata för perioden
    const nuData = await hamtaPeriodData(dagar);
    
    // Hämta data för föregående period (för trendberäkning)
    const tidigareData = dagar ? await hamtaPeriodData(dagar, dagar) : null;
    
    // Beräkna trender
    const trend = beraknaTrend(nuData, tidigareData);
    
    // Hämta svarsfördelning per kategori
    const svarsfordelning = await hamtaSvarsfordelning(dagar);

    const response: OversiktData = {
      period: periodParam === 'all' ? 'Allt' : `${periodParam} dagar`,
      nyckeltal: nuData,
      trend,
      svarsfordelning,
    };

    return new Response(
      JSON.stringify(response),
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

/**
 * Hämta data för en specifik period
 */
async function hamtaPeriodData(dagar: number | null, offset: number = 0) {
  // Beräkna datumintervall
  let startDatum: string | null = null;
  let slutDatum: string | null = null;
  
  if (dagar !== null) {
    const nu = new Date();
    const start = new Date();
    start.setDate(nu.getDate() - dagar - offset);
    startDatum = start.toISOString();
    
    if (offset > 0) {
      const slut = new Date();
      slut.setDate(nu.getDate() - offset);
      slutDatum = slut.toISOString();
    }
  }

  // Hämta kampanjer
  let kampanjQuery = supabaseAdmin
    .from('sms_kampanjer')
    .select('id, status, utfall, antal_sms_skickade');
  
  if (startDatum) kampanjQuery = kampanjQuery.gte('skapad_vid', startDatum);
  if (slutDatum) kampanjQuery = kampanjQuery.lt('skapad_vid', slutDatum);
  
  const { data: kampanjer } = await kampanjQuery;

  // Hämta mottagare
  let mottagarQuery = supabaseAdmin
    .from('sms_kampanj_mottagare')
    .select('svar, skickad_vid');
  
  if (startDatum) mottagarQuery = mottagarQuery.gte('skickad_vid', startDatum);
  if (slutDatum) mottagarQuery = mottagarQuery.lt('skickad_vid', slutDatum);
  
  const { data: mottagare } = await mottagarQuery;

  // Beräkna nyckeltal
  const kampanjLista = kampanjer || [];
  const mottagarLista = mottagare || [];
  
  const totaltKampanjer = kampanjLista.length;
  const fylldaViaSms = kampanjLista.filter(k => k.utfall === 'fylld_via_sms').length;
  const fylldaManuellt = kampanjLista.filter(k => k.utfall === 'fylld_manuellt').length;
  const smsSkickade = mottagarLista.filter(m => m.skickad_vid).length;
  
  const jaSvar = mottagarLista.filter(m => m.svar === 'ja').length;
  const nejSvar = mottagarLista.filter(m => m.svar === 'nej').length;
  const ingenSvar = smsSkickade - jaSvar - nejSvar;
  const svarMottagna = jaSvar + nejSvar;
  
  const jaRate = svarMottagna > 0 ? Math.round(100 * jaSvar / svarMottagna) : 0;
  const svarsRate = smsSkickade > 0 ? Math.round(100 * svarMottagna / smsSkickade) : 0;
  const smsPerFylldTid = fylldaViaSms > 0 
    ? Math.round(10 * smsSkickade / fylldaViaSms) / 10 
    : 0;

  return {
    kampanjer: totaltKampanjer,
    fylldaViaSms,
    fylldaManuellt,
    smsSkickade,
    svarMottagna,
    jaSvar,
    nejSvar,
    ingenSvar,
    jaRate,
    svarsRate,
    smsPerFylldTid,
  };
}

/**
 * Beräkna trend jämfört med föregående period
 */
function beraknaTrend(nu: any, tidigare: any | null) {
  if (!tidigare) {
    return {
      kampanjerTrend: 0,
      jaRateTrend: 0,
      svarsRateTrend: 0,
    };
  }

  return {
    kampanjerTrend: nu.kampanjer - tidigare.kampanjer,
    jaRateTrend: nu.jaRate - tidigare.jaRate,
    svarsRateTrend: nu.svarsRate - tidigare.svarsRate,
  };
}

/**
 * Hämta svarsfördelning per prioritetskategori
 */
async function hamtaSvarsfordelning(dagar: number | null) {
  let startDatum: string | null = null;
  
  if (dagar !== null) {
    const start = new Date();
    start.setDate(start.getDate() - dagar);
    startDatum = start.toISOString();
  }

  // Hämta alla mottagare med prioritetsfält
  let query = supabaseAdmin
    .from('sms_kampanj_mottagare')
    .select('akut, sjukskriven, har_ont, svar, skickad_vid');
  
  if (startDatum) query = query.gte('skickad_vid', startDatum);
  
  const { data: mottagare } = await query;
  
  // Gruppera per kategori
  const kategorier: Record<string, { ja: number; nej: number; ingenSvar: number }> = {
    'AKUT': { ja: 0, nej: 0, ingenSvar: 0 },
    'Sjukskriven': { ja: 0, nej: 0, ingenSvar: 0 },
    'Mycket ont': { ja: 0, nej: 0, ingenSvar: 0 },
    'Normal': { ja: 0, nej: 0, ingenSvar: 0 },
  };

  for (const m of mottagare || []) {
    if (!m.skickad_vid) continue; // Endast skickade SMS
    
    let kategori = 'Normal';
    if (m.akut) kategori = 'AKUT';
    else if (m.sjukskriven) kategori = 'Sjukskriven';
    else if (m.har_ont) kategori = 'Mycket ont';
    
    if (m.svar === 'ja') kategorier[kategori].ja++;
    else if (m.svar === 'nej') kategorier[kategori].nej++;
    else kategorier[kategori].ingenSvar++;
  }

  // Formatera resultat
  return Object.entries(kategorier).map(([kategori, data]) => {
    const totalt = data.ja + data.nej + data.ingenSvar;
    const svarMottagna = data.ja + data.nej;
    return {
      kategori,
      ja: data.ja,
      nej: data.nej,
      ingenSvar: data.ingenSvar,
      totalt,
      jaRate: svarMottagna > 0 ? Math.round(100 * data.ja / svarMottagna) : 0,
    };
  });
}
