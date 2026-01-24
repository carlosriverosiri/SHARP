/**
 * API: Skapa kort varsel-kampanj
 * 
 * POST /api/kampanj/skapa
 * Body: {
 *   datum: "2026-01-28",
 *   antalPlatser: 1-3,                    // Antal lediga platser att fylla
 *   tidsblock?: "formiddag" | "eftermiddag",  // Valfritt
 *   operationTyp?: "Knäartroskopi",
 *   lakare?: "Dr. Smith",                 // Läkare med ledig tid
 *   
 *   // Mottagare - ANTINGEN:
 *   patientIds: ["uuid-1", "uuid-2"],     // ID:n från patientpoolen (rekommenderat)
 *   // ELLER (legacy):
 *   mottagare: [{ namn, telefon, harSamtycke }],
 *   
 *   // Filter (för patientpool)
 *   filterSida?: "höger" | "vänster",     // Önskad sida (för prioritering)
 *   filterOpLiten?: boolean,              // Filtrera på liten operation
 *   filterOpStor?: boolean,               // Filtrera på stor operation
 *   
 *   batchIntervallMinuter: 10,            // Minuter mellan varje SMS
 *   sistaVarstid?: "2026-01-27T18:00:00",
 *   notifieraPersonal: ["user-id-1", "user-id-2"]
 * }
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';
import { kryptera } from '../../../lib/kryptering';
import crypto from 'crypto';

// 46elks API-konfiguration
const ELKS_API_URL = 'https://api.46elks.com/a1/sms';
const ELKS_API_USER = import.meta.env.ELKS_API_USER || '';
const ELKS_API_PASSWORD = import.meta.env.ELKS_API_PASSWORD || '';
const SITE_URL = import.meta.env.SITE || import.meta.env.PUBLIC_SITE_URL || 'https://sodermalm.netlify.app';

interface Mottagare {
  namn: string;
  telefon: string;
  harSamtycke: boolean;
  poolId?: string;  // Om hämtad från patientpool
  // Prioritetsfält (hämtas från patientpool)
  akut?: boolean;
  sjukskriven?: boolean;
  harOnt?: boolean;
  alder?: number | null;  // Ålder (67+ = pensionär)
  // Sida och operationsstorlek
  sida?: 'höger' | 'vänster' | null;
  opLiten?: boolean;
  opStor?: boolean;
}

// Prioritetsintervall i minuter
const PRIORITETS_INTERVALL = {
  akut: 60,        // AKUT: 1 timme
  sjukskriven: 30, // Sjukskriven: 30 min
  harOnt: 20,      // Mycket ont: 20 min
  normal: 10,      // Standard: 10 min
};

// Beräkna intervall baserat på prioritet
function beraknaIntervall(m: Mottagare, defaultIntervall: number): number {
  if (m.akut) return PRIORITETS_INTERVALL.akut;
  if (m.sjukskriven) return PRIORITETS_INTERVALL.sjukskriven;
  if (m.harOnt) return PRIORITETS_INTERVALL.harOnt;
  return defaultIntervall || PRIORITETS_INTERVALL.normal;
}

// Sortera efter prioritet (akut > ont > sjukskriven > pensionär > normal)
// Inom varje prioritetsnivå: rätt sida först
function sorteraPaPrioritet(a: Mottagare, b: Mottagare, onskadSida?: string): number {
  // Pensionär = 67+
  const arPensionarA = (a.alder ?? 0) >= 67;
  const arPensionarB = (b.alder ?? 0) >= 67;
  
  // Prioritetspoäng: akut > ont > sjukskriven > pensionär > normal
  const prioA = (a.akut ? 10000 : 0) + (a.harOnt ? 1000 : 0) + (a.sjukskriven ? 100 : 0) + (arPensionarA ? 10 : 0);
  const prioB = (b.akut ? 10000 : 0) + (b.harOnt ? 1000 : 0) + (b.sjukskriven ? 100 : 0) + (arPensionarB ? 10 : 0);
  
  // Om samma prioritetsnivå, sortera på sida
  if (prioA === prioB && onskadSida) {
    const sidaMatchA = a.sida === onskadSida ? 1 : 0;
    const sidaMatchB = b.sida === onskadSida ? 1 : 0;
    if (sidaMatchA !== sidaMatchB) {
      return sidaMatchB - sidaMatchA; // Rätt sida först
    }
  }
  
  return prioB - prioA; // Högst prioritet först
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
    mottagare?: Mottagare[];           // Manuell input (legacy)
    patientIds?: string[];              // Från patientpool
    // Filter för patientpool
    filterSida?: 'höger' | 'vänster';   // Önskad sida (för prioritering)
    filterOpLiten?: boolean;            // Filtrera på liten operation
    filterOpStor?: boolean;             // Filtrera på stor operation
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
      .select('id, namn, telefon_krypterad, har_samtycke, akut, sjukskriven, har_ont, alder, sida, op_liten, op_stor')
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
        // Prioritetsfält
        akut: p.akut || false,
        sjukskriven: p.sjukskriven || false,
        harOnt: p.har_ont || false,
        alder: p.alder || null,
        // Sida och operationsstorlek
        sida: p.sida || null,
        opLiten: p.op_liten || false,
        opStor: p.op_stor || false,
      };
    });
    
    // Sortera efter prioritet: akut > ont > sjukskriven > pensionär > normal
    // Inom varje nivå: rätt sida först
    mottagareLista.sort((a, b) => sorteraPaPrioritet(a, b, body.filterSida));

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
        // Filtervärden (för referens/historik)
        filter_sida: body.filterSida || null,
        filter_op_liten: body.filterOpLiten ?? true,
        filter_op_stor: body.filterOpStor ?? true,
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
    // Mottagare är redan sorterade efter prioritet
    const defaultIntervall = body.batchIntervallMinuter || PRIORITETS_INTERVALL.normal;
    
    const mottagareData = mottagareLista.map((m, index) => ({
      kampanj_id: kampanj.id,
      namn: m.namn,
      telefon_hash: hashaTelefon(m.telefon),
      telefon_masked: maskeraTelefon(m.telefon),
      telefon_krypterad: kryptera(m.telefon), // För uppföljnings-SMS
      unik_kod: genereraUnikKod(),
      har_samtycke: m.harSamtycke,
      ordning: index + 1,
      // Prioritetsfält och intervall
      akut: m.akut || false,
      sjukskriven: m.sjukskriven || false,
      har_ont: m.harOnt || false,
      intervall_till_nasta: beraknaIntervall(m, defaultIntervall),
      // Sida och operationsstorlek
      sida: m.sida || null,
      op_liten: m.opLiten || false,
      op_stor: m.opStor || false,
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

    // Kolla om det finns prioriterade patienter (för att aktivera gradvis utskick automatiskt)
    const harPrioriteradePatienter = mottagareLista.some(m => m.akut || m.sjukskriven || m.harOnt);
    const skaAnvandaGradvisUtskick = body.batchIntervallMinuter > 0 || harPrioriteradePatienter;

    if (skaAnvandaGradvisUtskick && mottagare.length > 1) {
      // Använd första mottagarens intervall för nästa utskick
      const forstaMottagare = mottagare[0];
      const intervallMinuter = forstaMottagare.intervall_till_nasta || defaultIntervall;
      
      const nastaUtskick = new Date();
      nastaUtskick.setMinutes(nastaUtskick.getMinutes() + intervallMinuter);
      updates.nasta_utskick_vid = nastaUtskick.toISOString();
      
      // Säkerställ att batch_intervall_minuter är satt (för scheduled function)
      if (!body.batchIntervallMinuter) {
        updates.batch_intervall_minuter = defaultIntervall;
      }
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
