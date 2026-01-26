/**
 * API: Starta MFA TOTP-enrollering
 * 
 * POST /api/auth/mfa-enroll
 * 
 * Returnerar QR-kod och secret för att lägga till i autentiseringsapp.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad, startaMfaEnrollering } from '../../../lib/auth';

export const POST: APIRoute = async ({ cookies }) => {
  // Kontrollera inloggning
  if (!await arInloggad(cookies)) {
    return new Response(
      JSON.stringify({ error: 'Ej inloggad' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const result = await startaMfaEnrollering();
    
    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error || 'Kunde inte starta MFA-enrollering' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        faktorId: result.faktorId,
        qrKod: result.qrKod,
        secret: result.secret,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('MFA enroll API error:', error);
    return new Response(
      JSON.stringify({ error: 'Ett fel uppstod' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
