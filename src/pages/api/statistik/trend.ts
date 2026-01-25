/**
 * API: Trendstatistik
 * 
 * GET /api/statistik/trend
 * GET /api/statistik/trend?period=90
 * 
 * Returnerar tidsserie för trendanalys.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

interface VeckodataPunkt {
  vecka: string;
  startDatum: string;
  kampanjer: number;
  smsSkickade: number;
  jaSvar: number;
  nejSvar: number;
  ingenSvar: number;
  jaRate: number;
  svarsRate: number;
  medelSvarstidMin: number;
}

export const GET: APIRoute = async ({ url, cookies }) => {
  if (!await arInloggad(cookies)) {
    return new Response(
      JSON.stringify({ error: 'Ej inloggad' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const periodParam = url.searchParams.get('period') || '90';
  const dagar = periodParam === 'all' ? 365 : parseInt(periodParam); // Max 365 dagar för trend
  
  try {
    // Beräkna startdatum
    const startDatum = new Date();
    startDatum.setDate(startDatum.getDate() - dagar);

    // Hämta kampanjer för perioden
    const { data: kampanjer } = await supabaseAdmin
      .from('sms_kampanjer')
      .select('id, skapad_vid')
      .gte('skapad_vid', startDatum.toISOString());

    // Hämta mottagare för perioden
    const { data: mottagare } = await supabaseAdmin
      .from('sms_kampanj_mottagare')
      .select('svar, skickad_vid, svarstid_sekunder')
      .gte('skickad_vid', startDatum.toISOString());

    // Gruppera per vecka
    const veckodata = beraknaVeckodata(kampanjer || [], mottagare || [], dagar);

    return new Response(
      JSON.stringify({
        period: `${dagar} dagar`,
        veckodata,
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
 * Gruppera data per vecka
 */
function beraknaVeckodata(
  kampanjer: any[], 
  mottagare: any[], 
  dagar: number
): VeckodataPunkt[] {
  // Skapa veckor
  const veckor: Map<string, VeckodataPunkt> = new Map();
  
  // Beräkna antal veckor
  const antalVeckor = Math.ceil(dagar / 7);
  const nu = new Date();
  
  // Skapa tomma veckor
  for (let i = antalVeckor - 1; i >= 0; i--) {
    const veckoStart = new Date(nu);
    veckoStart.setDate(nu.getDate() - (i * 7) - nu.getDay() + 1); // Måndag
    veckoStart.setHours(0, 0, 0, 0);
    
    const veckoNyckel = getVeckoNyckel(veckoStart);
    veckor.set(veckoNyckel, {
      vecka: veckoNyckel,
      startDatum: veckoStart.toISOString().split('T')[0],
      kampanjer: 0,
      smsSkickade: 0,
      jaSvar: 0,
      nejSvar: 0,
      ingenSvar: 0,
      jaRate: 0,
      svarsRate: 0,
      medelSvarstidMin: 0,
    });
  }

  // Fyll i kampanjdata
  for (const k of kampanjer) {
    if (!k.skapad_vid) continue;
    const veckoNyckel = getVeckoNyckel(new Date(k.skapad_vid));
    const vecka = veckor.get(veckoNyckel);
    if (vecka) vecka.kampanjer++;
  }

  // Fyll i mottagardata
  const svarstiderPerVecka: Map<string, number[]> = new Map();
  
  for (const m of mottagare) {
    if (!m.skickad_vid) continue;
    const veckoNyckel = getVeckoNyckel(new Date(m.skickad_vid));
    const vecka = veckor.get(veckoNyckel);
    if (!vecka) continue;
    
    vecka.smsSkickade++;
    
    if (m.svar === 'ja') vecka.jaSvar++;
    else if (m.svar === 'nej') vecka.nejSvar++;
    else vecka.ingenSvar++;
    
    // Samla svarstider
    if (m.svarstid_sekunder) {
      if (!svarstiderPerVecka.has(veckoNyckel)) {
        svarstiderPerVecka.set(veckoNyckel, []);
      }
      svarstiderPerVecka.get(veckoNyckel)!.push(m.svarstid_sekunder);
    }
  }

  // Beräkna rates och medelsvarstid
  for (const [nyckel, vecka] of veckor) {
    const svarMottagna = vecka.jaSvar + vecka.nejSvar;
    vecka.jaRate = svarMottagna > 0 ? Math.round(100 * vecka.jaSvar / svarMottagna) : 0;
    vecka.svarsRate = vecka.smsSkickade > 0 ? Math.round(100 * svarMottagna / vecka.smsSkickade) : 0;
    
    const svarstider = svarstiderPerVecka.get(nyckel);
    if (svarstider && svarstider.length > 0) {
      const medelSek = svarstider.reduce((a, b) => a + b, 0) / svarstider.length;
      vecka.medelSvarstidMin = Math.round(medelSek / 60 * 10) / 10;
    }
  }

  // Konvertera till array och sortera
  return Array.from(veckor.values()).sort((a, b) => 
    a.startDatum.localeCompare(b.startDatum)
  );
}

/**
 * Generera veckonyckel (YYYY-WXX)
 */
function getVeckoNyckel(datum: Date): string {
  const year = datum.getFullYear();
  const onejan = new Date(year, 0, 1);
  const weekNum = Math.ceil((((datum.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
  return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}
