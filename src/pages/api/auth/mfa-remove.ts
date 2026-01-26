/**
 * API: Ta bort MFA-faktor
 * 
 * POST /api/auth/mfa-remove
 * Body: { faktorId: string }
 * 
 * Tar bort en MFA-faktor från användarens konto.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad, taBortMfaFaktor } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  // Kontrollera inloggning
  if (!await arInloggad(cookies)) {
    return new Response(
      JSON.stringify({ error: 'Ej inloggad' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const { faktorId } = body;

    if (!faktorId) {
      return new Response(
        JSON.stringify({ error: 'faktorId krävs' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await taBortMfaFaktor(faktorId);
    
    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error || 'Kunde inte ta bort MFA' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'MFA har tagits bort' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('MFA remove API error:', error);
    return new Response(
      JSON.stringify({ error: 'Ett fel uppstod' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
