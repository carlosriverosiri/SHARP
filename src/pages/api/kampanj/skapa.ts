/**
 * API: Skapa kort varsel-kampanj
 * 
 * POST /api/kampanj/skapa
 * Body: {
 *   datum: "2026-01-28",
 *   antalPlatser: 1-3,           // Antal lediga platser att fylla
 *   tidsblock?: "formiddag" | "eftermiddag",  // Valfritt
 *   operationTyp?: "Knäartroskopi",
 *   mottagare: [{ namn, telefon, harSamtycke }],
 *   batchIntervallMinuter: 10,   // 0 = skicka alla direkt
 *   sistaVarstid?: "2026-01-27T18:00:00",
 *   notifieraPersonal: ["user-id-1", "user-id-2"]
 * }
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';
import crypto from 'crypto';

// 46elks API-konfiguration
const ELKS_API_URL = 'https://api.46elks.com/a1/sms';
const ELKS_API_USER = import.meta.env.ELKS_API_USER || '';
const ELKS_API_PASSWORD = import.meta.env.ELKS_API_PASSWORD || '';
const SITE_URL = import.meta.env.SITE || import.meta.env.PUBLIC_SITE_URL || 'https://specialist.se';

interface Mottagare {
  namn: string;
  telefon: string;
  harSamtycke: boolean;
  poolId?: string;  // Om hämtad från patientpool
}

// Generera säker unik kod (16+ tecken)
function genereraUnikKod(): string {
  return crypto.randomBytes(12).toString('base64url'); // 16 tecken
}

// Hasha telefonnummer för GDPR
function hashaTelefon(telefon: string): string {
  return crypto.createHash('sha256').update(telefon).digest('hex');
}

// Maskera telefonnummer för visning
function maskeraTelefon(telefon: string): string {
  // +46701234567 → 070-123 ****
  const clean = telefon.replace(/^\+46/, '0').replace(/\D/g, '');
  if (clean.length >= 10) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)} ****`;
  }
  return '***-*** ****';
}

// Formatera datum för SMS
function formateraDatum(datum: string, tidsblock?: string): string {
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

// Skicka SMS via 46elks
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
  // Kontrollera inloggning
  if (!await arInloggad(cookies)) {
    return new Response(
      JSON.stringify({ error: 'Ej inloggad' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const anvandare = await hamtaAnvandare(cookies);
  if (!anvandare) {
    return new Response(
      JSON.stringify({ error: 'Kunde inte hämta användare' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Parsa body
  let body: {
    datum: string;
    antalPlatser?: number;
    tidsblock?: 'formiddag' | 'eftermiddag';
    operationTyp?: string;
    lakare?: string;                    // Opererande läkare
    mottagare?: Mottagare[];           // Manuell input
    patientIds?: string[];              // Från patientpool
    batchIntervallMinuter: number;
    sistaVarstid?: string;
    notifieraPersonal: string[];
  };

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Ogiltig JSON' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validera - antingen mottagare eller patientIds krävs
  if (!body.datum || (!body.mottagare?.length && !body.patientIds?.length)) {
    return new Response(
      JSON.stringify({ error: 'Datum och minst en mottagare krävs (antingen mottagare eller patientIds)' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Om patientIds anges, hämta från patientpool
  let mottagareLista: Mottagare[] = body.mottagare || [];
  let patientPoolMapping: Map<string, string> = new Map(); // telefon_hash -> pool_id
  
  if (body.patientIds?.length) {
    const { data: poolPatienter, error: poolError } = await supabaseAdmin
      .from('kort_varsel_patienter')
      .select('id, namn, telefon_krypterad, har_samtycke')
      .in('id', body.patientIds)
      .in('status', ['tillganglig', 'kontaktad', 'reserv']);
    
    if (poolError || !poolPatienter?.length) {
      return new Response(
        JSON.stringify({ error: 'Kunde inte hämta patienter från pool' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Dekryptera telefonnummer och bygg mottagarlista
    const { dekryptera } = await import('../../../lib/kryptering');
    
    mottagareLista = poolPatienter.map(p => {
      const telefon = dekryptera(p.telefon_krypterad);
      // Spara mapping för att uppdatera pool-status senare
      patientPoolMapping.set(hashaTelefon(telefon), p.id);
      return {
        namn: p.namn,
        telefon: telefon,
        harSamtycke: p.har_samtycke,
        poolId: p.id,
      };
    });

    // Uppdatera status till 'kontaktad' för alla
    await supabaseAdmin
      .from('kort_varsel_patienter')
      .update({ 
        status: 'kontaktad',
        senast_kontaktad: new Date().toISOString()
      })
      .in('id', body.patientIds);
  }

  // Validera antal platser (1-3)
  const antalPlatser = Math.min(3, Math.max(1, body.antalPlatser || 1));

  try {
    // 1. Skapa kampanj
    const { data: kampanj, error: kampanjError } = await supabaseAdmin
      .from('sms_kampanjer')
      .insert({
        datum: body.datum,
        tidsblock: body.tidsblock || null,
        operation_typ: body.operationTyp || null,
        lakare: body.lakare || null,
        antal_platser: antalPlatser,
        antal_fyllda: 0,
        skapad_av: anvandare.id,
        batch_intervall_minuter: body.batchIntervallMinuter || 0,
        sista_svarstid: body.sistaVarstid || null,
        // Om gradvis utskick, sätt nästa utskick till nu (första skickas direkt)
        nasta_utskick_vid: body.batchIntervallMinuter > 0 ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (kampanjError || !kampanj) {
      console.error('Kunde inte skapa kampanj:', kampanjError);
      return new Response(
        JSON.stringify({ error: 'Kunde inte skapa kampanj' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Lägg till personal som ska notifieras
    if (body.notifieraPersonal?.length) {
      const notifieringar = body.notifieraPersonal.map(personalId => ({
        kampanj_id: kampanj.id,
        personal_id: personalId,
      }));
      
      await supabaseAdmin.from('sms_kampanj_notifieringar').insert(notifieringar);
    }

    // 3. Lägg till mottagare (från manuell input eller pool)
    const mottagareData = mottagareLista.map((m, index) => ({
      kampanj_id: kampanj.id,
      namn: m.namn,
      telefon_hash: hashaTelefon(m.telefon),
      telefon_masked: maskeraTelefon(m.telefon),
      unik_kod: genereraUnikKod(),
      har_samtycke: m.harSamtycke,
      ordning: index + 1,
    }));

    const { data: mottagare, error: mottagareError } = await supabaseAdmin
      .from('sms_kampanj_mottagare')
      .insert(mottagareData)
      .select();

    if (mottagareError || !mottagare) {
      console.error('Kunde inte lägga till mottagare:', mottagareError);
      // Rensa upp kampanjen
      await supabaseAdmin.from('sms_kampanjer').delete().eq('id', kampanj.id);
      return new Response(
        JSON.stringify({ error: 'Kunde inte lägga till mottagare' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Skicka SMS
    const datumFormaterat = formateraDatum(body.datum, body.tidsblock);
    let antalSkickade = 0;

    // Bestäm vilka som ska få SMS nu
    const attSkickaTill = body.batchIntervallMinuter > 0 
      ? [mottagare[0]]  // Gradvis: bara första
      : mottagare;       // Alla direkt

    // Text för antal platser
    const platsText = antalPlatser === 1 
      ? 'en ledig operationsplats' 
      : `${antalPlatser} lediga operationsplatser`;
    
    // Läkartext för SMS
    const lakareText = body.lakare ? ` hos ${body.lakare}` : '';

    for (const m of attSkickaTill) {
      // Hämta originalnumret från mottagarlistan (vi har bara hashat version i db)
      const originalMottagare = mottagareLista[m.ordning - 1];
      
      // Skapa SMS-text baserat på samtycke
      let smsText: string;
      if (m.har_samtycke && body.operationTyp) {
        // Modell B: Tydlig formulering (med samtycke + läkare)
        smsText = `Hej ${m.namn.split(' ')[0]}! Vi har ${platsText} för ${body.operationTyp.toLowerCase()}${lakareText} ${datumFormaterat}.\n\nKan du komma med kort varsel?\nSvara här: ${SITE_URL}/s/${m.unik_kod}\n\nOBS: Först till kvarn!\n/Södermalms Ortopedi`;
      } else {
        // Modell A: Vag formulering (utan samtycke, men med läkare om angiven)
        smsText = `Hej! Vi har ${platsText}${lakareText} på Södermalms Ortopedi ${datumFormaterat}.\n\nKan du komma med kort varsel?\nSvara här: ${SITE_URL}/s/${m.unik_kod}\n\nOBS: Först till kvarn!\n/Södermalms Ortopedi`;
      }

      const skickades = await skickaSMS(originalMottagare.telefon, smsText);
      
      if (skickades) {
        // Markera som skickad
        await supabaseAdmin
          .from('sms_kampanj_mottagare')
          .update({ skickad_vid: new Date().toISOString() })
          .eq('id', m.id);
        antalSkickade++;
      }
    }

    // 5. Uppdatera kampanjens SMS-räknare och nästa utskick-tid
    const updates: Record<string, any> = {
      antal_sms_skickade: antalSkickade,
    };

    if (body.batchIntervallMinuter > 0 && mottagare.length > 1) {
      // Sätt tid för nästa utskick
      const nastaUtskick = new Date();
      nastaUtskick.setMinutes(nastaUtskick.getMinutes() + body.batchIntervallMinuter);
      updates.nasta_utskick_vid = nastaUtskick.toISOString();
    }

    await supabaseAdmin
      .from('sms_kampanjer')
      .update(updates)
      .eq('id', kampanj.id);

    // Returnera framgång
    return new Response(
      JSON.stringify({
        success: true,
        kampanjId: kampanj.id,
        antalMottagare: mottagare.length,
        antalSkickade,
        antalPlatser,
        gradvisUtskick: body.batchIntervallMinuter > 0,
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
