/**
 * Webhook: Ta emot inkommande SMS från 46elks
 * 
 * Endpoint: POST /api/sms/inkommande
 * 
 * 46elks skickar inkommande SMS till denna endpoint med följande data:
 * - from: Avsändarens telefonnummer (+46...)
 * - to: Ditt 46elks-nummer
 * - message: SMS-innehållet
 * - id: Unikt SMS-ID
 * 
 * Hanterar:
 * - "STOPP" -> Avregistrerar patienten från kortvarsellistan
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import crypto from 'crypto';

// 46elks
const ELKS_API_URL = 'https://api.46elks.com/a1/sms';
const ELKS_API_USER = import.meta.env.ELKS_API_USER || '';
const ELKS_API_PASSWORD = import.meta.env.ELKS_API_PASSWORD || '';

// Hasha telefonnummer för matchning
function hashaTelefon(telefon: string): string {
  return crypto.createHash('sha256').update(telefon).digest('hex');
}

// Normalisera telefonnummer till +46-format
function normaliseraTelefon(telefon: string): string {
  let clean = telefon.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    return '+46' + clean.slice(1);
  } else if (clean.startsWith('46')) {
    return '+' + clean;
  }
  return telefon; // Returnera som det är om vi inte förstår formatet
}

// Skicka bekräftelse-SMS
async function skickaBekraftelse(telefon: string, meddelande: string): Promise<boolean> {
  if (!ELKS_API_USER || !ELKS_API_PASSWORD) return false;

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
    return response.ok;
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ request }) => {
  // 46elks skickar data som form-urlencoded
  let from: string;
  let message: string;
  let smsId: string;

  try {
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      from = formData.get('from')?.toString() || '';
      message = formData.get('message')?.toString() || '';
      smsId = formData.get('id')?.toString() || '';
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      from = body.from || '';
      message = body.message || '';
      smsId = body.id || '';
    } else {
      // Försök parsa som form data ändå (46elks standard)
      const text = await request.text();
      const params = new URLSearchParams(text);
      from = params.get('from') || '';
      message = params.get('message') || '';
      smsId = params.get('id') || '';
    }
  } catch (err) {
    console.error('Kunde inte parsa inkommande SMS:', err);
    return new Response('Bad Request', { status: 400 });
  }

  if (!from || !message) {
    console.error('Saknar from eller message i inkommande SMS');
    return new Response('Bad Request', { status: 400 });
  }

  // Logga (utan persondata)
  console.log(`[SMS Inkommande] ID: ${smsId}, Meddelande: "${message.substring(0, 20)}..."`);

  // Normalisera telefonnummer och skapa hash för matchning
  const telefonNormaliserad = normaliseraTelefon(from);
  const telefonHash = hashaTelefon(telefonNormaliserad);

  // Kontrollera om meddelandet är ett STOPP-kommando
  const meddelandeNormaliserat = message.trim().toUpperCase();
  const arStoppKommando = ['STOPP', 'STOP', 'AVSLUTA', 'AVREGISTRERA', 'TA BORT MIG', 'NEJ TACK'].some(
    cmd => meddelandeNormaliserat.includes(cmd)
  );

  if (arStoppKommando) {
    // Hitta patienten i patientpoolen via telefon-hash
    // Vi behöver först hitta dem via kampanj_mottagare och sedan i kort_varsel_patienter
    
    // 1. Markera i alla aktiva kampanjer att denna person vill avregistreras
    const { data: mottagare } = await supabaseAdmin
      .from('sms_kampanj_mottagare')
      .select('id, kampanj_id, namn')
      .eq('telefon_hash', telefonHash)
      .is('svar', null);

    if (mottagare?.length) {
      // Uppdatera alla matchande poster
      await supabaseAdmin
        .from('sms_kampanj_mottagare')
        .update({ 
          svar: 'avregistrerad',
          svar_vid: new Date().toISOString()
        })
        .eq('telefon_hash', telefonHash)
        .is('svar', null);

      console.log(`[STOPP] Markerade ${mottagare.length} kampanjmottagare som avregistrerade`);
    }

    // 2. Uppdatera status i patientpoolen (om de finns där)
    const { data: poolPatient, error: poolError } = await supabaseAdmin
      .from('kort_varsel_patienter')
      .select('id, namn')
      .eq('telefon_hash', telefonHash)
      .single();

    if (poolPatient && !poolError) {
      await supabaseAdmin
        .from('kort_varsel_patienter')
        .update({ 
          status: 'avregistrerad',
          avregistrerad_vid: new Date().toISOString(),
          avregistrerings_orsak: 'SMS STOPP'
        })
        .eq('id', poolPatient.id);

      console.log(`[STOPP] Avregistrerade ${poolPatient.namn} från patientpoolen`);
    }

    // Skicka bekräftelse-SMS
    await skickaBekraftelse(
      telefonNormaliserad,
      'Du är nu avregistrerad från våra kortvarselsms. Du kan fortfarande kontakta oss på 08-123 45 67 om du ändrar dig.\n/Södermalms Ortopedi'
    );

    // Logga händelsen
    await supabaseAdmin.from('audit_logg').insert({
      typ: 'sms_avregistrering',
      data: {
        telefon_hash: telefonHash,
        meddelande: message,
        sms_id: smsId,
        tidpunkt: new Date().toISOString()
      }
    });

    return new Response('OK - Avregistrerad', { status: 200 });
  }

  // Om det inte är ett STOPP-kommando, logga och ignorera
  // (Kampanjsvar hanteras via webblänkar, inte SMS-svar)
  console.log(`[SMS Inkommande] Okänt kommando från ${telefonHash.substring(0, 8)}...: "${message}"`);

  // Logga i audit för eventuell manuell uppföljning
  await supabaseAdmin.from('audit_logg').insert({
    typ: 'sms_inkommande_okand',
    data: {
      telefon_hash: telefonHash,
      meddelande: message.substring(0, 200), // Begränsa längd
      sms_id: smsId,
      tidpunkt: new Date().toISOString()
    }
  });

  return new Response('OK', { status: 200 });
};

// GET för att verifiera att endpointen fungerar (för testning)
export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ 
    status: 'ok', 
    endpoint: 'sms/inkommande',
    description: 'Webhook för inkommande SMS från 46elks'
  }), { 
    status: 200, 
    headers: { 'Content-Type': 'application/json' } 
  });
};
