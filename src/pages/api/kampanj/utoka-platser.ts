/**
 * API: Utöka kampanj med fler platser
 * 
 * POST /api/kampanj/utoka-platser
 * Body: {
 *   kampanjId: "xxx",
 *   antalNyaPlatser: 1 | 2  // Lägg till 1-2 extra platser
 *   rensaNejSvar?: boolean  // Ta bort NEJ-svar så nya patienter kan kontaktas
 * }
 * 
 * Återöppnar en fylld kampanj och lägger till fler platser.
 * Fortsätter skicka SMS till patienter som inte kontaktats.
 * 
 * Om rensaNejSvar=true:
 * - Tar bort mottagare som svarat NEJ
 * - Behåller JA och RESERV (de är potentiellt bokade)
 * - Behåller de som inte svarat ännu (fortsätter vänta på svar)
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!await arInloggad(cookies)) {
    return new Response(
      JSON.stringify({ error: 'Ej inloggad' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: {
    kampanjId: string;
    antalNyaPlatser: number;
    rensaNejSvar?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Ogiltig JSON' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!body.kampanjId || !body.antalNyaPlatser) {
    return new Response(
      JSON.stringify({ error: 'kampanjId och antalNyaPlatser krävs' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validera antal (max 5 totalt)
  if (body.antalNyaPlatser < 1 || body.antalNyaPlatser > 3) {
    return new Response(
      JSON.stringify({ error: 'antalNyaPlatser måste vara 1-3' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Hämta kampanjen
    const { data: kampanj, error: hamtaError } = await supabaseAdmin
      .from('sms_kampanjer')
      .select('*')
      .eq('id', body.kampanjId)
      .single();

    if (hamtaError || !kampanj) {
      return new Response(
        JSON.stringify({ error: 'Kampanjen hittades inte' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Kontrollera att kampanjen är fylld (inte avslutad)
    if (kampanj.status === 'avslutad') {
      return new Response(
        JSON.stringify({ error: 'Avslutade kampanjer kan inte utökas. Skapa en ny kampanj istället.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Beräkna nytt antal platser (max 5)
    const nyttAntalPlatser = Math.min(
      (kampanj.antal_platser || 1) + body.antalNyaPlatser,
      5
    );

    // Sätt nästa utskick till nu + intervall för att fortsätta skicka
    const nastaUtskick = new Date();
    nastaUtskick.setMinutes(nastaUtskick.getMinutes() + (kampanj.batch_intervall_minuter || 10));

    // Uppdatera kampanjen
    const { error: uppdateraError } = await supabaseAdmin
      .from('sms_kampanjer')
      .update({
        status: 'aktiv',
        antal_platser: nyttAntalPlatser,
        nasta_utskick_vid: nastaUtskick.toISOString(),
        utfall: null, // Nollställ utfall
        avslutad_vid: null, // Nollställ avslutad_vid
      })
      .eq('id', body.kampanjId);

    if (uppdateraError) {
      console.error('Kunde inte utöka kampanj:', uppdateraError);
      return new Response(
        JSON.stringify({ error: 'Kunde inte utöka kampanjen' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Rensa NEJ-svar om begärt
    let antalNejBortagna = 0;
    if (body.rensaNejSvar) {
      const { data: nejMottagare } = await supabaseAdmin
        .from('sms_kampanj_mottagare')
        .select('id')
        .eq('kampanj_id', body.kampanjId)
        .eq('svar', 'nej');
      
      if (nejMottagare?.length) {
        const { error: deleteError } = await supabaseAdmin
          .from('sms_kampanj_mottagare')
          .delete()
          .eq('kampanj_id', body.kampanjId)
          .eq('svar', 'nej');
        
        if (!deleteError) {
          antalNejBortagna = nejMottagare.length;
        }
      }
    }

    // Räkna hur många patienter som återstår att kontakta
    const { count: ejKontaktade } = await supabaseAdmin
      .from('sms_kampanj_mottagare')
      .select('*', { count: 'exact', head: true })
      .eq('kampanj_id', body.kampanjId)
      .is('skickad_vid', null);

    // Bygg meddelande
    let message = `Kampanjen utökad till ${nyttAntalPlatser} platser.`;
    if (antalNejBortagna > 0) {
      message += ` ${antalNejBortagna} NEJ-svar borttagna.`;
    }
    message += ` ${ejKontaktade || 0} patienter kvar att kontakta.`;

    return new Response(
      JSON.stringify({
        success: true,
        nyttAntalPlatser,
        antalFyllda: kampanj.antal_fyllda || 0,
        ejKontaktade: ejKontaktade || 0,
        antalNejBortagna,
        message
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
