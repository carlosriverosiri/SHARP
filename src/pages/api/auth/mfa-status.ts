/**
 * API: Hämta MFA-status och faktorer
 * 
 * GET /api/auth/mfa-status
 * 
 * Returnerar användarens MFA-faktorer och om MFA behöver verifieras.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad, hamtaMfaFaktorer, behoverMfaVerifiering } from '../../../lib/auth';

export const GET: APIRoute = async ({ cookies }) => {
  // Kontrollera inloggning
  if (!await arInloggad(cookies)) {
    return new Response(
      JSON.stringify({ error: 'Ej inloggad' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const [faktorerResult, verifieringResult] = await Promise.all([
      hamtaMfaFaktorer(),
      behoverMfaVerifiering(),
    ]);

    if (!faktorerResult.success) {
      return new Response(
        JSON.stringify({ error: faktorerResult.error || 'Kunde inte hämta MFA-status' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        faktorer: faktorerResult.faktorer,
        harMfaAktiverat: faktorerResult.faktorer.length > 0,
        behoverVerifiering: verifieringResult.behovs,
        faktorIdForVerifiering: verifieringResult.faktorId,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('MFA status API error:', error);
    return new Response(
      JSON.stringify({ error: 'Ett fel uppstod' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
