/**
 * API: Uppdatera patient i patientpoolen
 * 
 * POST /api/pool/uppdatera
 * Body: {
 *   patientId: "uuid",
 *   action: "markera_hanterad" | "fornya" | "andra_status" | "redigera",
 *   nyttStatus?: "tillganglig" | "kontaktad" | "reserv" | "nej" | "bokad",
 *   // För action="redigera":
 *   namn?: string,
 *   lakare?: string[],
 *   sida?: "höger" | "vänster",
 *   opLiten?: boolean,
 *   opStor?: boolean,
 *   akut?: boolean,
 *   harOnt?: boolean,
 *   sjukskriven?: boolean,
 *   alder?: number,
 *   utgarVid?: string
 * }
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

type PatientStatus = 'tillganglig' | 'kontaktad' | 'reserv' | 'nej' | 'bokad';

interface UpdateRequest {
  patientId: string;
  action: 'markera_hanterad' | 'fornya' | 'andra_status' | 'redigera';
  nyttStatus?: PatientStatus;
  // För redigering
  namn?: string;
  lakare?: string[];
  sida?: 'höger' | 'vänster' | null;
  opLiten?: boolean;
  opStor?: boolean;
  akut?: boolean;
  harOnt?: boolean;
  sjukskriven?: boolean;
  alder?: number | null;
  utgarVid?: string;
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

      case 'redigera':
        // Uppdatera patientuppgifter
        if (body.namn !== undefined) updateData.namn = body.namn;
        if (body.lakare !== undefined) updateData.lakare = body.lakare;
        if (body.sida !== undefined) updateData.sida = body.sida;
        if (body.opLiten !== undefined) updateData.op_liten = body.opLiten;
        if (body.opStor !== undefined) updateData.op_stor = body.opStor;
        if (body.akut !== undefined) updateData.akut = body.akut;
        if (body.harOnt !== undefined) updateData.har_ont = body.harOnt;
        if (body.sjukskriven !== undefined) updateData.sjukskriven = body.sjukskriven;
        if (body.alder !== undefined) updateData.alder = body.alder;
        if (body.utgarVid !== undefined) updateData.utgar_vid = body.utgarVid;
        
        if (Object.keys(updateData).length === 0) {
          return new Response(
            JSON.stringify({ error: 'Inga fält att uppdatera' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
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
