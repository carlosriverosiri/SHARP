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
import { supabase } from '../../../lib/supabase';
import crypto from 'crypto';

// Krypteringsnyckel (ska vara i .env i produktion!)
const ENCRYPTION_KEY = import.meta.env.POOL_ENCRYPTION_KEY || 'default-dev-key-32-bytes-long!!';

interface PatientInput {
  namn: string;
  telefon: string;
  harSamtycke: boolean;
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
    // Beräkna utgångsdatum (7 dagar framåt)
    const utgarVid = new Date();
    utgarVid.setDate(utgarVid.getDate() + 7);

    // Förbered data för insert
    const patientData = body.patienter.map(p => {
      const telefonFormaterad = formateraTelefon(p.telefon);
      return {
        namn: p.namn.trim(),
        telefon_krypterad: krypteraTelefon(telefonFormaterad),
        telefon_masked: maskeraTelefon(telefonFormaterad),
        har_samtycke: p.harSamtycke,
        status: 'tillganglig',
        tillagd_av: anvandare?.id || null,
        utgar_vid: utgarVid.toISOString(),
      };
    });

    // Lägg till i databasen
    const { data, error } = await supabase
      .from('kort_varsel_patienter')
      .insert(patientData)
      .select();

    if (error) {
      console.error('Kunde inte lägga till patienter:', error);
      return new Response(
        JSON.stringify({ error: 'Kunde inte lägga till patienter' }),
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
