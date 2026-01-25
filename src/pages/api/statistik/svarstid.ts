/**
 * API: Svarstidsstatistik
 * 
 * GET /api/statistik/svarstid
 * GET /api/statistik/svarstid?period=30  (dagar)
 * GET /api/statistik/svarstid?period=90
 * GET /api/statistik/svarstid?period=all
 * 
 * Returnerar svarstidsstatistik per prioritetskategori.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

interface KategoriStatistik {
  kategori: string;
  antalSvar: number;
  medelSvarstidSek: number;
  medelSvarstidMin: number;
  medianSvarstidSek: number;
  minSvarstidSek: number;
  maxSvarstidSek: number;
  antalJa: number;
  antalNej: number;
  jaRate: number;
}

interface TidPaDagenStatistik {
  timme: number;
  tidsblock: string;
  antalSvar: number;
  medelSvarstidMin: number;
  jaRate: number;
}

export const GET: APIRoute = async ({ url, cookies }) => {
  if (!await arInloggad(cookies)) {
    return new Response(
      JSON.stringify({ error: 'Ej inloggad' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const periodParam = url.searchParams.get('period') || '90';
  
  try {
    // Bygg datumfilter
    let datumFilter: string | null = null;
    if (periodParam !== 'all') {
      const dagar = parseInt(periodParam);
      if (!isNaN(dagar) && dagar > 0) {
        const datum = new Date();
        datum.setDate(datum.getDate() - dagar);
        datumFilter = datum.toISOString();
      }
    }

    // Hämta all mottagardata för perioden
    let query = supabaseAdmin
      .from('sms_kampanj_mottagare')
      .select('akut, sjukskriven, har_ont, svarstid_sekunder, svar, skickad_vid, svarad_vid')
      .not('svarstid_sekunder', 'is', null);

    if (datumFilter) {
      query = query.gte('skickad_vid', datumFilter);
    }

    const { data: mottagare, error } = await query;

    if (error) {
      console.error('Kunde inte hämta statistik:', error);
      return new Response(
        JSON.stringify({ error: 'Kunde inte hämta statistik' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
    }

    // Beräkna statistik per kategori
    const kategorier = beraknaKategoriStatistik(mottagare || []);
    
    // Beräkna statistik per tid på dagen
    const tidPaDagen = beraknaTidPaDagenStatistik(mottagare || []);

    // Övergripande statistik
    const totaltAntalSvar = mottagare?.length || 0;
    const totaltMedelSvarstid = totaltAntalSvar > 0
      ? Math.round((mottagare || []).reduce((sum, m) => sum + (m.svarstid_sekunder || 0), 0) / totaltAntalSvar / 60)
      : 0;

    return new Response(
      JSON.stringify({
        period: periodParam === 'all' ? 'Allt' : `${periodParam} dagar`,
        totalt: {
          antalSvar: totaltAntalSvar,
          medelSvarstidMin: totaltMedelSvarstid,
        },
        kategorier,
        tidPaDagen,
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

/**
 * Beräkna statistik per prioritetskategori
 */
function beraknaKategoriStatistik(mottagare: any[]): KategoriStatistik[] {
  const kategorier: Record<string, any[]> = {
    'AKUT': [],
    'Sjukskriven': [],
    'Mycket ont': [],
    'Normal': [],
  };

  // Gruppera mottagare per kategori
  for (const m of mottagare) {
    if (m.akut) {
      kategorier['AKUT'].push(m);
    } else if (m.sjukskriven) {
      kategorier['Sjukskriven'].push(m);
    } else if (m.har_ont) {
      kategorier['Mycket ont'].push(m);
    } else {
      kategorier['Normal'].push(m);
    }
  }

  // Beräkna statistik för varje kategori
  const resultat: KategoriStatistik[] = [];

  for (const [kategori, lista] of Object.entries(kategorier)) {
    if (lista.length === 0) {
      resultat.push({
        kategori,
        antalSvar: 0,
        medelSvarstidSek: 0,
        medelSvarstidMin: 0,
        medianSvarstidSek: 0,
        minSvarstidSek: 0,
        maxSvarstidSek: 0,
        antalJa: 0,
        antalNej: 0,
        jaRate: 0,
      });
      continue;
    }

    const svarstider = lista.map(m => m.svarstid_sekunder).sort((a, b) => a - b);
    const medel = Math.round(svarstider.reduce((a, b) => a + b, 0) / svarstider.length);
    const median = svarstider[Math.floor(svarstider.length / 2)];
    const antalJa = lista.filter(m => m.svar === 'ja').length;
    const antalNej = lista.filter(m => m.svar === 'nej').length;

    resultat.push({
      kategori,
      antalSvar: lista.length,
      medelSvarstidSek: medel,
      medelSvarstidMin: Math.round(medel / 60 * 10) / 10,
      medianSvarstidSek: median,
      minSvarstidSek: Math.min(...svarstider),
      maxSvarstidSek: Math.max(...svarstider),
      antalJa,
      antalNej,
      jaRate: Math.round(100 * antalJa / lista.length),
    });
  }

  return resultat;
}

/**
 * Beräkna statistik per tid på dagen (tidsblock om 2 timmar)
 */
function beraknaTidPaDagenStatistik(mottagare: any[]): TidPaDagenStatistik[] {
  const tidsblock: Record<string, any[]> = {
    '08-10': [],
    '10-12': [],
    '12-14': [],
    '14-16': [],
    '16-18': [],
    '18-20': [],
  };

  // Gruppera per tidsblock
  for (const m of mottagare) {
    if (!m.skickad_vid) continue;
    
    const timme = new Date(m.skickad_vid).getHours();
    
    if (timme >= 8 && timme < 10) tidsblock['08-10'].push(m);
    else if (timme >= 10 && timme < 12) tidsblock['10-12'].push(m);
    else if (timme >= 12 && timme < 14) tidsblock['12-14'].push(m);
    else if (timme >= 14 && timme < 16) tidsblock['14-16'].push(m);
    else if (timme >= 16 && timme < 18) tidsblock['16-18'].push(m);
    else if (timme >= 18 && timme < 20) tidsblock['18-20'].push(m);
    // Ignorera SMS utanför arbetstid
  }

  // Beräkna statistik per tidsblock
  const resultat: TidPaDagenStatistik[] = [];

  for (const [block, lista] of Object.entries(tidsblock)) {
    const [startTimme] = block.split('-').map(Number);
    
    if (lista.length === 0) {
      resultat.push({
        timme: startTimme,
        tidsblock: block,
        antalSvar: 0,
        medelSvarstidMin: 0,
        jaRate: 0,
      });
      continue;
    }

    const medelSvarstid = lista.reduce((sum, m) => sum + m.svarstid_sekunder, 0) / lista.length;
    const antalJa = lista.filter(m => m.svar === 'ja').length;

    resultat.push({
      timme: startTimme,
      tidsblock: block,
      antalSvar: lista.length,
      medelSvarstidMin: Math.round(medelSvarstid / 60 * 10) / 10,
      jaRate: Math.round(100 * antalJa / lista.length),
    });
  }

  return resultat;
}
