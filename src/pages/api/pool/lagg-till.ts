/**
 * API: Lägg till patient(er) i patientpoolen
 * 
 * POST /api/pool/lagg-till
 * Body: {
 *   patienter: [{ namn, telefon, harSamtycke }]
 * }
 * 
 * Telefonnummer krypteras med AES-256 och sparas i 7 dagar.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';
import crypto from 'crypto';

// Krypteringsnyckel (ska vara i .env i produktion!)
const ENCRYPTION_KEY = import.meta.env.POOL_ENCRYPTION_KEY || 'default-dev-key-32-bytes-long!!';

interface PatientInput {
  namn: string;
  telefon: string;
  harSamtycke: boolean;
  lakare?: string;
  flexibelLakare?: boolean;
  opDatum?: string; // Patientens ordinarie operationsdatum (används som utgångsdatum)
  akut?: boolean; // AKUT - måste opereras snarast (högsta prioritet)
  harOnt?: boolean; // Patienten har mycket ont
  sjukskriven?: boolean; // Patienten är sjukskriven
  alder?: number | null; // Patientens ålder (beräknad från personnummer)
}

// Kryptera telefonnummer med AES-256
function krypteraTelefon(telefon: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(telefon, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Returnera iv + krypterad data (behövs båda för dekryptering)
  return iv.toString('hex') + ':' + encrypted;
}

// Maskera telefonnummer för visning
function maskeraTelefon(telefon: string): string {
  const clean = telefon.replace(/^\+46/, '0').replace(/\D/g, '');
  if (clean.length >= 10) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 4)}** ****`;
  }
  return '***-*** ****';
}

// Hasha telefonnummer för snabb matchning
function hashaTelefon(telefon: string): string {
  return crypto.createHash('sha256').update(telefon).digest('hex');
}

// Formatera telefonnummer till +46...
function formateraTelefon(telefon: string): string {
  let clean = telefon.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '+46' + clean.slice(1);
  } else if (!clean.startsWith('+')) {
    clean = '+46' + clean;
  } else {
    clean = '+' + clean;
  }
  return clean;
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

  // Parsa body
  let body: { patienter: PatientInput[] };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Ogiltig JSON' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!body.patienter?.length) {
    return new Response(
      JSON.stringify({ error: 'Inga patienter angivna' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Förbered data och beräkna hashar för dublettkontroll
    const patientDataMedHash = body.patienter.map(p => {
      const telefonFormaterad = formateraTelefon(p.telefon);
      const hash = hashaTelefon(telefonFormaterad);
      
      // Använd operationsdatum som utgångsdatum om angivet, annars 7 dagar
      let utgarVid: Date;
      if (p.opDatum) {
        // Sätt utgångsdatum till slutet av operationsdagen
        utgarVid = new Date(p.opDatum + 'T23:59:59');
      } else {
        utgarVid = new Date();
        utgarVid.setDate(utgarVid.getDate() + 7);
      }
      
      return {
        namn: p.namn.trim(),
        telefon_krypterad: krypteraTelefon(telefonFormaterad),
        telefon_hash: hash,
        telefon_masked: maskeraTelefon(telefonFormaterad),
        har_samtycke: p.harSamtycke,
        lakare: p.lakare || null,
        flexibel_lakare: p.flexibelLakare || false,
        akut: p.akut || false, // AKUT - måste opereras snarast
        har_ont: p.harOnt || false, // Patienten har mycket ont
        sjukskriven: p.sjukskriven || false, // Patienten är sjukskriven
        alder: p.alder ?? null, // Ålder från personnummer (kan vara null)
        status: 'tillganglig',
        tillagd_av: anvandare?.id || null,
        utgar_vid: utgarVid.toISOString(),
      };
    });

    // Kontrollera om något telefonnummer redan finns i poolen (aktiva patienter)
    const hasharAttKontrollera = patientDataMedHash.map(p => p.telefon_hash);
    
    const { data: existerande } = await supabaseAdmin
      .from('kort_varsel_patienter')
      .select('namn, telefon_hash')
      .in('telefon_hash', hasharAttKontrollera)
      .in('status', ['tillganglig', 'kontaktad', 'reserv']); // Endast aktiva patienter
    
    if (existerande && existerande.length > 0) {
      // Hitta namn på dubbletter
      const existerandeHashar = new Set(existerande.map(e => e.telefon_hash));
      const dubletter = patientDataMedHash
        .filter(p => existerandeHashar.has(p.telefon_hash))
        .map(p => p.namn);
      
      // Hitta också existerande namn för bättre meddelande
      const existerandeNamn = existerande.map(e => e.namn);
      
      return new Response(
        JSON.stringify({ 
          error: 'Dubbletter hittades',
          message: `Följande telefonnummer finns redan i poolen: ${existerandeNamn.join(', ')}`,
          dubletter: dubletter,
          existerande: existerandeNamn
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Lägg till i databasen
    const { data, error } = await supabaseAdmin
      .from('kort_varsel_patienter')
      .insert(patientDataMedHash)
      .select();

    if (error) {
      console.error('Kunde inte lägga till patienter:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Kunde inte lägga till patienter', 
          details: error.message,
          hint: error.hint || null,
          code: error.code || null
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        antalTillagda: data?.length || 0,
        patienter: data,
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
