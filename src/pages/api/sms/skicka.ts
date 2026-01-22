/**
 * API-endpoint för att skicka SMS via 46elks
 * 
 * Endpoint: POST /api/sms/skicka
 * Body: { phone: "+46701234567", message: "Hej..." }
 * 
 * Kräver miljövariabler:
 * - ELKS_API_USER (API-användarnamn från 46elks)
 * - ELKS_API_PASSWORD (API-lösenord från 46elks)
 */

import type { APIRoute } from 'astro';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';

// 46elks API-konfiguration
const ELKS_API_URL = 'https://api.46elks.com/a1/sms';
const ELKS_API_USER = import.meta.env.ELKS_API_USER || '';
const ELKS_API_PASSWORD = import.meta.env.ELKS_API_PASSWORD || '';

// Rate limiting: Max SMS per användare per timme
const MAX_SMS_PER_HOUR = 30;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const POST: APIRoute = async ({ request, cookies }) => {
  // Kontrollera att användaren är inloggad
  if (!await arInloggad(cookies)) {
    return new Response(
      JSON.stringify({ error: 'Du måste vara inloggad för att skicka SMS' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Kontrollera att 46elks är konfigurerat
  if (!ELKS_API_USER || !ELKS_API_PASSWORD) {
    return new Response(
      JSON.stringify({ error: 'SMS-tjänsten är inte konfigurerad. Kontakta administratören.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Hämta användarinfo för loggning
  const anvandare = await hamtaAnvandare(cookies);
  const userId = anvandare?.id || 'unknown';

  // Rate limiting
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (userLimit) {
    if (now < userLimit.resetTime) {
      if (userLimit.count >= MAX_SMS_PER_HOUR) {
        return new Response(
          JSON.stringify({ 
            error: `Du har skickat max antal SMS (${MAX_SMS_PER_HOUR}/timme). Vänta till nästa timme.` 
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Reset om timmen har passerat
      rateLimitMap.set(userId, { count: 0, resetTime: now + 3600000 });
    }
  } else {
    rateLimitMap.set(userId, { count: 0, resetTime: now + 3600000 });
  }

  // Parsa request body
  let phone: string;
  let message: string;

  try {
    const body = await request.json();
    phone = body.phone;
    message = body.message;
  } catch {
    return new Response(
      JSON.stringify({ error: 'Ogiltig request - kunde inte parsa JSON' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validera telefonnummer (svenskt format)
  if (!phone || !/^\+46[0-9]{9,10}$/.test(phone)) {
    return new Response(
      JSON.stringify({ error: 'Ogiltigt telefonnummer. Använd format +46XXXXXXXXX' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validera meddelande
  if (!message || message.length < 1) {
    return new Response(
      JSON.stringify({ error: 'Meddelandet får inte vara tomt' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (message.length > 918) { // Max 6 SMS (153 * 6)
    return new Response(
      JSON.stringify({ error: 'Meddelandet är för långt (max ~900 tecken)' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Skicka SMS via 46elks API
  try {
    const response = await fetch(ELKS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${ELKS_API_USER}:${ELKS_API_PASSWORD}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        from: 'Specialist', // Avsändarnamn (max 11 tecken alfanumeriskt)
        to: phone,
        message: message,
      }),
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('46elks API error:', response.status, responseText);
      
      // Hantera specifika felkoder
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Fel API-nycklar för SMS-tjänsten' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Otillräckligt saldo hos SMS-leverantören' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Kunde inte skicka SMS. Försök igen senare.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Uppdatera rate limit counter
    const currentLimit = rateLimitMap.get(userId)!;
    rateLimitMap.set(userId, { ...currentLimit, count: currentLimit.count + 1 });

    // Logga (GDPR-säkert - endast metadata, ej telefonnummer)
    console.log(`[SMS] Skickat av ${anvandare?.email || 'okänd'} - ${message.length} tecken`);

    // Returnera success
    const result = JSON.parse(responseText);
    return new Response(
      JSON.stringify({ 
        success: true, 
        smsCount: Math.ceil(message.length / 160),
        id: result.id 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('SMS sending error:', error);
    return new Response(
      JSON.stringify({ error: 'Tekniskt fel vid sändning. Försök igen.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
