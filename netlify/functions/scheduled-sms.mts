/**
 * Netlify Scheduled Function: Gradvis SMS-utskick
 * 
 * Körs var 1:a minut och:
 * 1. Hittar aktiva kampanjer där "nästa utskick" har passerat
 * 2. Skickar SMS till nästa patient i kön
 * 3. Uppdaterar "nästa utskick" baserat på patientens prioritet:
 *    - AKUT: 60 min
 *    - Sjukskriven: 30 min
 *    - Mycket ont: 20 min
 *    - Normal: 10 min (eller kampanjens batch_intervall)
 * 4. Stoppar om kampanjen är fylld
 * 
 * Konfigureras i netlify.toml med cron schedule.
 */

import type { Config, Context } from "@netlify/functions";
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Supabase med service role
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 46elks
const ELKS_API_URL = 'https://api.46elks.com/a1/sms';
const ELKS_API_USER = process.env.ELKS_API_USER || '';
const ELKS_API_PASSWORD = process.env.ELKS_API_PASSWORD || '';
const SITE_URL = process.env.SITE || process.env.PUBLIC_SITE_URL || 'https://specialist.se';

// Krypteringsnyckel för telefonnummer
const ENCRYPTION_KEY = process.env.POOL_ENCRYPTION_KEY || 'default-dev-key-32-bytes-long!!';

// Dekryptera telefonnummer
function dekrypteraTelefon(krypterad: string): string {
  const [ivHex, encrypted] = krypterad.split(':');
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function skickaSMS(telefon: string, meddelande: string): Promise<boolean> {
  if (!ELKS_API_USER || !ELKS_API_PASSWORD) {
    console.log('46elks inte konfigurerat');
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

function formateraDatum(datum: string, tid: string): string {
  const d = new Date(`${datum}T${tid}`);
  const dagar = ['sön', 'mån', 'tis', 'ons', 'tors', 'fre', 'lör'];
  const dag = dagar[d.getDay()];
  const datumStr = `${d.getDate()}/${d.getMonth() + 1}`;
  return `${dag} ${datumStr} kl ${tid.slice(0, 5)}`;
}

export default async function handler(req: Request, context: Context) {
  console.log('⏰ Scheduled SMS function starting...');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Supabase inte konfigurerat');
    return new Response('Supabase not configured', { status: 500 });
  }

  try {
    const nu = new Date().toISOString();

    // 1. Hitta aktiva kampanjer som ska ha nästa utskick
    const { data: kampanjer, error: kampanjError } = await supabase
      .from('sms_kampanjer')
      .select('*')
      .eq('status', 'aktiv')
      .gt('batch_intervall_minuter', 0)  // Endast gradvis utskick
      .lte('nasta_utskick_vid', nu);     // Tid har passerat

    if (kampanjError) {
      console.error('Kunde inte hämta kampanjer:', kampanjError);
      return new Response('Database error', { status: 500 });
    }

    if (!kampanjer?.length) {
      console.log('Inga kampanjer att behandla');
      return new Response('No campaigns to process', { status: 200 });
    }

    console.log(`Hittade ${kampanjer.length} kampanjer att behandla`);

    // 2. Behandla varje kampanj
    for (const kampanj of kampanjer) {
      console.log(`Behandlar kampanj ${kampanj.id}`);

      // Kontrollera om tidsgräns har passerat
      if (kampanj.sista_svarstid && new Date(kampanj.sista_svarstid) < new Date()) {
        console.log(`Kampanj ${kampanj.id} har passerat tidsgräns, avslutar`);
        await supabase
          .from('sms_kampanjer')
          .update({
            status: 'avslutad',
            utfall: 'timeout',
            avslutad_vid: nu,
            nasta_utskick_vid: null,
          })
          .eq('id', kampanj.id);
        continue;
      }

      // Hitta nästa mottagare som inte fått SMS
      const { data: nastaMottagare, error: mottagareError } = await supabase
        .from('sms_kampanj_mottagare')
        .select('*')
        .eq('kampanj_id', kampanj.id)
        .is('skickad_vid', null)
        .order('ordning')
        .limit(1)
        .single();

      if (mottagareError || !nastaMottagare) {
        console.log(`Kampanj ${kampanj.id}: Inga fler mottagare, stoppar gradvis utskick`);
        await supabase
          .from('sms_kampanjer')
          .update({ nasta_utskick_vid: null })
          .eq('id', kampanj.id);
        continue;
      }

      // Dekryptera telefonnummer
      if (!nastaMottagare.telefon_krypterad) {
        console.error(`Kampanj ${kampanj.id}: Mottagare ${nastaMottagare.id} saknar krypterat telefonnummer`);
        // Markera som skickad för att gå vidare (men logga felet)
        await supabase
          .from('sms_kampanj_mottagare')
          .update({ skickad_vid: nu })
          .eq('id', nastaMottagare.id);
        continue;
      }

      let telefon: string;
      try {
        telefon = dekrypteraTelefon(nastaMottagare.telefon_krypterad);
      } catch (decryptError) {
        console.error(`Kampanj ${kampanj.id}: Kunde inte dekryptera telefon:`, decryptError);
        continue;
      }

      console.log(`Ska skicka till ${nastaMottagare.namn} (ordning ${nastaMottagare.ordning})`);
      
      // Bygg SMS-text
      const datumStr = formateraDatum(kampanj.datum, kampanj.tidsblock || '12:00');
      const platsText = kampanj.antal_platser === 1 
        ? 'en ledig operationsplats' 
        : `${kampanj.antal_platser} lediga operationsplatser`;
      const lakareText = kampanj.lakare ? ` hos ${kampanj.lakare}` : '';
      
      let smsText: string;
      if (nastaMottagare.har_samtycke && kampanj.operation_typ) {
        smsText = `Hej ${nastaMottagare.namn.split(' ')[0]}! Vi har ${platsText} för ${kampanj.operation_typ.toLowerCase()}${lakareText} ${datumStr}.\n\nKan du komma med kort varsel?\nSvara här: ${SITE_URL}/s/${nastaMottagare.unik_kod}\n\nOBS: Först till kvarn!\n/Södermalms Ortopedi`;
      } else {
        smsText = `Hej! Vi har ${platsText}${lakareText} på Södermalms Ortopedi ${datumStr}.\n\nKan du komma med kort varsel?\nSvara här: ${SITE_URL}/s/${nastaMottagare.unik_kod}\n\nOBS: Först till kvarn!\n/Södermalms Ortopedi`;
      }
      
      // Skicka SMS
      const smsSkickades = await skickaSMS(telefon, smsText);
      
      if (!smsSkickades) {
        console.error(`Kampanj ${kampanj.id}: Kunde inte skicka SMS till ${nastaMottagare.namn}`);
        // Fortsätt ändå - markera som försökt
      }

      // Markera som skickad
      await supabase
        .from('sms_kampanj_mottagare')
        .update({ skickad_vid: nu })
        .eq('id', nastaMottagare.id);

      // Beräkna nästa utskick baserat på DENNA mottagares prioritetsintervall
      const intervallMinuter = nastaMottagare.intervall_till_nasta || kampanj.batch_intervall_minuter || 10;
      const nastaUtskick = new Date();
      nastaUtskick.setMinutes(nastaUtskick.getMinutes() + intervallMinuter);

      // Logga prioritetsinformation
      const prioInfo = nastaMottagare.akut ? '🚨 AKUT' : 
                       nastaMottagare.sjukskriven ? '📋 Sjukskriven' :
                       nastaMottagare.har_ont ? '🔥 Ont' : 'Normal';
      console.log(`Kampanj ${kampanj.id}: ${prioInfo} patient, väntar ${intervallMinuter} min till nästa`);

      await supabase
        .from('sms_kampanjer')
        .update({
          antal_sms_skickade: kampanj.antal_sms_skickade + 1,
          nasta_utskick_vid: nastaUtskick.toISOString(),
        })
        .eq('id', kampanj.id);

      console.log(`Kampanj ${kampanj.id}: Nästa utskick ${nastaUtskick.toISOString()}`);
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Oväntat fel:', error);
    return new Response('Internal error', { status: 500 });
  }
}

// Kör var 1:a minut
export const config: Config = {
  schedule: "* * * * *"
};
