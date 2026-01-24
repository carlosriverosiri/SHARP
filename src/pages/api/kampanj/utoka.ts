/**
 * API: Utöka kampanj med fler mottagare
 * 
 * POST /api/kampanj/utoka
 * Body: {
 *   kampanjId: "xxx",
 *   patientIds: ["id1", "id2", ...]  // Från patientpool
 * }
 * 
 * Lägger till fler mottagare till en befintlig aktiv kampanj och skickar SMS direkt.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';
import { kryptera } from '../../../lib/kryptering';
import crypto from 'crypto';

// 46elks API
const ELKS_API_URL = 'https://api.46elks.com/a1/sms';
const ELKS_API_USER = import.meta.env.ELKS_API_USER || '';
const ELKS_API_PASSWORD = import.meta.env.ELKS_API_PASSWORD || '';
const SITE_URL = import.meta.env.SITE || import.meta.env.PUBLIC_SITE_URL || 'https://sodermalm.netlify.app';

function genereraUnikKod(): string {
  return crypto.randomBytes(12).toString('base64url');
}

function hashaTelefon(telefon: string): string {
  return crypto.createHash('sha256').update(telefon).digest('hex');
}

function maskeraTelefon(telefon: string): string {
  const clean = telefon.replace(/^\+46/, '0').replace(/\D/g, '');
  if (clean.length >= 10) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)} ****`;
  }
  return '***-*** ****';
}

// Prioritetsintervall i minuter
const PRIORITETS_INTERVALL = {
  akut: 60,        // AKUT: 1 timme
  sjukskriven: 30, // Sjukskriven: 30 min
  harOnt: 20,      // Mycket ont: 20 min
  normal: 10,      // Standard: 10 min
};

interface MottagareMedPrio {
  id: string;
  namn: string;
  telefon: string;
  harSamtycke: boolean;
  akut?: boolean;
  sjukskriven?: boolean;
  harOnt?: boolean;
}

// Beräkna intervall baserat på prioritet
function beraknaIntervall(m: MottagareMedPrio, defaultIntervall: number): number {
  if (m.akut) return PRIORITETS_INTERVALL.akut;
  if (m.sjukskriven) return PRIORITETS_INTERVALL.sjukskriven;
  if (m.harOnt) return PRIORITETS_INTERVALL.harOnt;
  return defaultIntervall || PRIORITETS_INTERVALL.normal;
}

// Sortera efter prioritet (akut > sjukskriven > harOnt > normal)
function sorteraPaPrioritet(a: MottagareMedPrio, b: MottagareMedPrio): number {
  const prioA = (a.akut ? 1000 : 0) + (a.sjukskriven ? 100 : 0) + (a.harOnt ? 10 : 0);
  const prioB = (b.akut ? 1000 : 0) + (b.sjukskriven ? 100 : 0) + (b.harOnt ? 10 : 0);
  return prioB - prioA;
}

function formateraDatum(datum: string, tidsblock?: string | null): string {
  const d = new Date(`${datum}T12:00`);
  const dagar = ['sön', 'mån', 'tis', 'ons', 'tors', 'fre', 'lör'];
  const dag = dagar[d.getDay()];
  const datumStr = `${d.getDate()}/${d.getMonth() + 1}`;
  
  if (tidsblock === 'formiddag') {
    return `${dag} ${datumStr} (förmiddag)`;
  } else if (tidsblock === 'eftermiddag') {
    return `${dag} ${datumStr} (eftermiddag)`;
  }
  return `${dag} ${datumStr}`;
}

async function skickaSMS(telefon: string, meddelande: string): Promise<boolean> {
  if (!ELKS_API_USER || !ELKS_API_PASSWORD) {
    console.error('46elks inte konfigurerat');
    return false;
  }

  try {
    const response = await fetch(ELKS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${ELKS_API_USER}:${ELKS_API_PASSWORD}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        from: 'Specialist',
        to: telefon,
        message: meddelande,
      }),
    });

    if (!response.ok) {
      console.error('SMS-fel:', await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('SMS-exception:', error);
    return false;
  }
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!await arInloggad(cookies)) {
    return new Response(
      JSON.stringify({ error: 'Ej inloggad' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: {
    kampanjId: string;
    patientIds: string[];
  };

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Ogiltig JSON' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!body.kampanjId || !body.patientIds?.length) {
    return new Response(
      JSON.stringify({ error: 'kampanjId och patientIds krävs' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Hämta kampanjen
    const { data: kampanj, error: kampanjError } = await supabaseAdmin
      .from('sms_kampanjer')
      .select('*')
      .eq('id', body.kampanjId)
      .single();

    if (kampanjError || !kampanj) {
      return new Response(
        JSON.stringify({ error: 'Kampanj hittades inte' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Kontrollera att kampanjen är aktiv
    if (kampanj.status !== 'aktiv') {
      return new Response(
        JSON.stringify({ error: 'Kan bara utöka aktiva kampanjer' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Hämta nuvarande högsta ordning
    const { data: sistaMottagare } = await supabaseAdmin
      .from('sms_kampanj_mottagare')
      .select('ordning')
      .eq('kampanj_id', body.kampanjId)
      .order('ordning', { ascending: false })
      .limit(1)
      .single();

    const startOrdning = (sistaMottagare?.ordning || 0) + 1;

    // Hämta patienter från poolen (inklusive prioritetsfält)
    const { data: poolPatienter, error: poolError } = await supabaseAdmin
      .from('kort_varsel_patienter')
      .select('id, namn, telefon_krypterad, har_samtycke, akut, sjukskriven, har_ont')
      .in('id', body.patientIds)
      .in('status', ['tillganglig', 'kontaktad', 'reserv']);

    if (poolError || !poolPatienter?.length) {
      return new Response(
        JSON.stringify({ error: 'Kunde inte hämta patienter från pool' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Dekryptera och bygg mottagarlista med prioritetsfält
    const { dekryptera } = await import('../../../lib/kryptering');
    
    let mottagareLista: MottagareMedPrio[] = poolPatienter.map(p => {
      const telefon = dekryptera(p.telefon_krypterad);
      return {
        id: p.id,
        namn: p.namn,
        telefon: telefon,
        harSamtycke: p.har_samtycke,
        akut: p.akut || false,
        sjukskriven: p.sjukskriven || false,
        harOnt: p.har_ont || false,
      };
    });
    
    // Sortera efter prioritet
    mottagareLista.sort(sorteraPaPrioritet);

    // Uppdatera pool-status
    await supabaseAdmin
      .from('kort_varsel_patienter')
      .update({ 
        status: 'kontaktad',
        senast_kontaktad: new Date().toISOString(),
        senaste_kampanj_id: body.kampanjId,
      })
      .in('id', body.patientIds);

    // Lägg till mottagare med prioritetsfält och intervall
    const defaultIntervall = kampanj.batch_intervall_minuter || PRIORITETS_INTERVALL.normal;
    
    const mottagareData = mottagareLista.map((m, index) => ({
      kampanj_id: body.kampanjId,
      namn: m.namn,
      telefon_hash: hashaTelefon(m.telefon),
      telefon_masked: maskeraTelefon(m.telefon),
      telefon_krypterad: kryptera(m.telefon),
      unik_kod: genereraUnikKod(),
      har_samtycke: m.harSamtycke,
      ordning: startOrdning + index,
      // Prioritetsfält och intervall
      akut: m.akut || false,
      sjukskriven: m.sjukskriven || false,
      har_ont: m.harOnt || false,
      intervall_till_nasta: beraknaIntervall(m, defaultIntervall),
    }));

    const { data: nyaMottagare, error: mottagareError } = await supabaseAdmin
      .from('sms_kampanj_mottagare')
      .insert(mottagareData)
      .select();

    if (mottagareError || !nyaMottagare) {
      console.error('Kunde inte lägga till mottagare:', mottagareError);
      return new Response(
        JSON.stringify({ error: 'Kunde inte lägga till mottagare' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Skicka SMS till alla nya mottagare
    const datumFormaterat = formateraDatum(kampanj.datum, kampanj.tidsblock);
    let antalSkickade = 0;

    const platsText = kampanj.antal_platser === 1 
      ? 'en ledig operationsplats' 
      : `${kampanj.antal_platser} lediga operationsplatser`;
    
    const lakareText = kampanj.lakare ? ` hos ${kampanj.lakare}` : '';

    for (let i = 0; i < nyaMottagare.length; i++) {
      const m = nyaMottagare[i];
      const originalMottagare = mottagareLista[i];
      
      let smsText: string;
      if (m.har_samtycke && kampanj.operation_typ) {
        smsText = `Hej ${m.namn.split(' ')[0]}! Vi har ${platsText} för ${kampanj.operation_typ.toLowerCase()}${lakareText} ${datumFormaterat}.\n\nKan du komma med kort varsel?\nSvara här: ${SITE_URL}/s/${m.unik_kod}\n\nOBS: Först till kvarn!\n/Södermalms Ortopedi`;
      } else {
        smsText = `Hej! Vi har ${platsText}${lakareText} på Södermalms Ortopedi ${datumFormaterat}.\n\nKan du komma med kort varsel?\nSvara här: ${SITE_URL}/s/${m.unik_kod}\n\nOBS: Först till kvarn!\n/Södermalms Ortopedi`;
      }

      const skickades = await skickaSMS(originalMottagare.telefon, smsText);
      
      if (skickades) {
        await supabaseAdmin
          .from('sms_kampanj_mottagare')
          .update({ skickad_vid: new Date().toISOString() })
          .eq('id', m.id);
        antalSkickade++;
      }
    }

    // Uppdatera kampanjens SMS-räknare
    await supabaseAdmin
      .from('sms_kampanjer')
      .update({
        antal_sms_skickade: (kampanj.antal_sms_skickade || 0) + antalSkickade,
      })
      .eq('id', body.kampanjId);

    return new Response(
      JSON.stringify({
        success: true,
        antalTillagda: nyaMottagare.length,
        antalSkickade,
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
