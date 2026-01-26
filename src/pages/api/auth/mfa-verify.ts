/**
 * API: Verifiera MFA TOTP-kod (för enrollering och inloggning)
 * 
 * POST /api/auth/mfa-verify
 * Body: { faktorId: string, kod: string, typ: 'enrollering' | 'inloggning' }
 * 
 * Verifierar TOTP-kod och aktiverar faktorn vid enrollering.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad, verifieraMfaEnrollering, verifieraMfaInloggning } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { faktorId, kod, typ = 'inloggning' } = body;

    if (!faktorId || !kod) {
      return new Response(
        JSON.stringify({ error: 'faktorId och kod krävs' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // För enrollering, kräv inloggning
    if (typ === 'enrollering') {
      if (!await arInloggad(cookies)) {
        return new Response(
          JSON.stringify({ error: 'Ej inloggad' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const result = await verifieraMfaEnrollering(faktorId, kod);
      
      if (!result.success) {
        return new Response(
          JSON.stringify({ error: result.error || 'Verifiering misslyckades' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'MFA aktiverat!' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // För inloggning
    const result = await verifieraMfaInloggning(faktorId, kod);
    
    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error || 'Verifiering misslyckades' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('MFA verify API error:', error);
    return new Response(
      JSON.stringify({ error: 'Ett fel uppstod' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
