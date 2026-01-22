/**
 * API: Uppdatera patient i patientpoolen
 * 
 * POST /api/pool/uppdatera
 * Body: {
 *   patientId: "uuid",
 *   action: "markera_hanterad" | "fornya" | "andra_status",
 *   nyttStatus?: "tillganglig" | "kontaktad" | "reserv" | "nej" | "bokad"
 * }
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

type PatientStatus = 'tillganglig' | 'kontaktad' | 'reserv' | 'nej' | 'bokad';

interface UpdateRequest {
  patientId: string;
  action: 'markera_hanterad' | 'fornya' | 'andra_status';
  nyttStatus?: PatientStatus;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  // Kontrollera inloggning
  if (!await arInloggad(cookies)) {
    return new Response(
      JSON.stringify({ error: 'Ej inloggad' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Parsa body
  let body: UpdateRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Ogiltig JSON' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!body.patientId || !body.action) {
    return new Response(
      JSON.stringify({ error: 'patientId och action krävs' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    let updateData: Record<string, any> = {};

    switch (body.action) {
      case 'markera_hanterad':
        // Markera att NEJ-svar har hanterats i journalsystemet
        updateData = { hanterad_i_journal: true };
        break;

      case 'fornya':
        // Förläng utgångsdatum med 7 dagar
        const nyUtgang = new Date();
        nyUtgang.setDate(nyUtgang.getDate() + 7);
        updateData = { utgar_vid: nyUtgang.toISOString() };
        break;

      case 'andra_status':
        if (!body.nyttStatus) {
          return new Response(
            JSON.stringify({ error: 'nyttStatus krävs för andra_status' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        
        const giltigaStatusar: PatientStatus[] = ['tillganglig', 'kontaktad', 'reserv', 'nej', 'bokad'];
        if (!giltigaStatusar.includes(body.nyttStatus)) {
          return new Response(
            JSON.stringify({ error: 'Ogiltig status' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        updateData = { status: body.nyttStatus };
        
        // Om ändrar till 'nej', sätt tackade_nej_vid
        if (body.nyttStatus === 'nej') {
          updateData.tackade_nej_vid = new Date().toISOString();
        }
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Okänd action' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // Utför uppdatering
    const { data, error } = await supabaseAdmin
      .from('kort_varsel_patienter')
      .update(updateData)
      .eq('id', body.patientId)
      .select()
      .single();

    if (error) {
      console.error('Kunde inte uppdatera patient:', error);
      return new Response(
        JSON.stringify({ error: 'Kunde inte uppdatera patient' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        patient: data,
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
