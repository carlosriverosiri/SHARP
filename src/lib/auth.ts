/**
 * Autentiseringshjälpfunktioner för personalportalen
 * 
 * Stöder två lägen:
 * 1. ENKELT LÄGE (nuvarande): Delat lösenord via .env
 * 2. SUPABASE LÄGE (framtid): Individuella användare med e-post/lösenord
 * 
 * Kontrolleras via USE_SUPABASE_AUTH miljövariabel
 */

import type { AstroCookies } from 'astro';
import type { User } from '@supabase/supabase-js';
import { supabase, loggaHandelse, supabaseKonfigurerad } from './supabase';
import { harMinstPortalRoll, normalizePortalRole, type PortalRole } from './portal-roles';

// ============================================
// KONFIGURATION
// ============================================

const SESSION_COOKIE_NAME = 'personal_session';
const SESSION_DURATION_SECONDS = 60 * 60 * 2; // 2 timmar (sliding timeout)
const SESSION_SECRET = import.meta.env.PERSONAL_SESSION_SECRET || 'default-session-secret';

// Aktivera Supabase-auth genom att sätta denna till 'true'
// TEMPORÄRT HÅRDKODAT - återställ till import.meta.env.USE_SUPABASE_AUTH === 'true' senare
const USE_SUPABASE = true;

// ============================================
// JWT-HJÄLPER (för snabb lokal validering)
// ============================================
type JwtPayload = {
  exp?: number;
  sub?: string;
  email?: string;
  app_metadata?: { role?: string };
  user_metadata?: {
    full_name?: string;
    name?: string;
    display_name?: string;
  };
};

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function accessTokenIsValid(accessToken: string, leewaySeconds = 60): boolean {
  const payload = decodeJwtPayload(accessToken);
  if (!payload?.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp - leewaySeconds > now;
}

function formatDisplayNameFromEmail(email: string): string {
  const localPart = email.split('@')[0]?.trim() || '';
  if (!localPart) return email;

  const words = localPart
    .replace(/[._-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return email;

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function hamtaVisningsnamn(
  email: string,
  metadata?: JwtPayload['user_metadata']
): string {
  const explicitName = metadata?.full_name?.trim()
    || metadata?.name?.trim()
    || metadata?.display_name?.trim();

  if (explicitName) return explicitName;
  return formatDisplayNameFromEmail(email);
}

// ============================================
// TYPER
// ============================================

export interface Anvandare {
  id: string;
  email: string;
  roll: PortalRole;
  namn?: string;
}

// ============================================
// HUVUDFUNKTIONER
// ============================================

/**
 * Kontrollerar om användaren är inloggad
 * Förlänger också sessionen om den är aktiv (sliding timeout)
 */
export async function arInloggad(cookies: AstroCookies): Promise<boolean> {
  if (USE_SUPABASE) {
    return await kontrolleraSupabaseSession(cookies);
  } else {
    return kontrolleraEnkelSession(cookies);
  }
}

/**
 * Hämtar inloggad användare (endast Supabase-läge)
 */
export async function hamtaAnvandare(cookies: AstroCookies): Promise<Anvandare | null> {
  if (!USE_SUPABASE) {
    // I enkelt läge, returnera en dummy-användare
    const isLoggedIn = kontrolleraEnkelSession(cookies);
    if (isLoggedIn) {
      return {
        id: 'single-user',
        email: 'personal@klinik.se',
        roll: 'admin',
        namn: 'Personal'
      };
    }
    return null;
  }

  return await hamtaVerifieradSupabaseAnvandare(cookies);
}

/**
 * Loggar in användaren
 * I enkelt läge: validerar lösenord
 * I Supabase-läge: validerar e-post/lösenord
 */
export async function loggaIn(
  cookies: AstroCookies,
  losenord: string,
  email?: string,
  request?: Request
): Promise<{ success: boolean; error?: string }> {
  
  if (USE_SUPABASE) {
    return await supabaseLoggaIn(cookies, email || '', losenord, request);
  } else {
    return enkelLoggaIn(cookies, losenord);
  }
}

/**
 * Loggar ut användaren
 */
export async function loggaUt(cookies: AstroCookies, request?: Request): Promise<void> {
  if (USE_SUPABASE) {
    const user = await hamtaAnvandare(cookies);
    if (user) {
      await loggaHandelse(user.id, user.email, 'UTLOGGNING', {}, request);
    }
    await supabase.auth.signOut();
    cookies.delete('sb-access-token', { path: '/' });
    cookies.delete('sb-refresh-token', { path: '/' });
  } else {
    cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
  }
}

// ============================================
// ENKELT LÄGE (nuvarande)
// ============================================

function kontrolleraEnkelSession(cookies: AstroCookies): boolean {
  const sessionCookie = cookies.get(SESSION_COOKIE_NAME);
  
  if (!sessionCookie?.value || sessionCookie.value !== SESSION_SECRET) {
    return false;
  }
  
  // Förläng sessionen (sliding timeout)
  cookies.set(SESSION_COOKIE_NAME, SESSION_SECRET, {
    path: '/',
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'strict',
    maxAge: SESSION_DURATION_SECONDS
  });
  
  return true;
}

function enkelLoggaIn(
  cookies: AstroCookies, 
  losenord: string
): { success: boolean; error?: string } {
  const korrektLosenord = import.meta.env.PERSONAL_PASSWORD || 'demo123';
  
  if (losenord !== korrektLosenord) {
    return { success: false, error: 'Fel lösenord' };
  }
  
  cookies.set(SESSION_COOKIE_NAME, SESSION_SECRET, {
    path: '/',
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'strict',
    maxAge: SESSION_DURATION_SECONDS
  });
  
  return { success: true };
}

// ============================================
// SUPABASE LÄGE (framtid)
// ============================================

async function kontrolleraSupabaseSession(cookies: AstroCookies): Promise<boolean> {
  return Boolean(await hamtaVerifieradSupabaseAnvandare(cookies));
}

function skapaAnvandareFranSupabaseUser(user: User): Anvandare {
  return {
    id: user.id,
    email: user.email || '',
    roll: normalizePortalRole(user.app_metadata?.role),
    namn: hamtaVisningsnamn(user.email || '', user.user_metadata)
  };
}

function rensaSupabaseSession(cookies: AstroCookies): void {
  cookies.delete('sb-access-token', { path: '/' });
  cookies.delete('sb-refresh-token', { path: '/' });
}

async function hamtaVerifieradSupabaseAnvandare(cookies: AstroCookies): Promise<Anvandare | null> {
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken) return null;

  try {
    if (accessTokenIsValid(accessToken)) {
      const { data: { user }, error } = await supabase.auth.getUser(accessToken);
      if (!error && user) {
        return skapaAnvandareFranSupabaseUser(user);
      }
    }

    if (refreshToken) {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken
      });
      const refreshedUser = data.user ?? data.session?.user ?? null;

      if (!error && data.session && refreshedUser) {
        sparaSupabaseSession(cookies, data.session.access_token, data.session.refresh_token);
        return skapaAnvandareFranSupabaseUser(refreshedUser);
      }
    }
  } catch {
    // Rensa ogiltiga sessionscookies om Supabase-verifieringen fallerar.
  }

  rensaSupabaseSession(cookies);
  return null;
}

async function supabaseLoggaIn(
  cookies: AstroCookies,
  email: string,
  losenord: string,
  request?: Request
): Promise<{ success: boolean; error?: string }> {
  
  if (!email || !losenord) {
    return { success: false, error: 'E-post och lösenord krävs' };
  }

  // Kontrollera om Supabase är korrekt konfigurerad
  if (!supabaseKonfigurerad) {
    console.error('❌ Supabase är inte korrekt konfigurerad - saknar API-nycklar');
    return { success: false, error: 'Systemfel: Supabase är inte konfigurerat. Kontakta admin.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: losenord
    });

    if (error) {
      // Ge mer specifika felmeddelanden baserat på feltyp
      let errorMsg = 'Fel e-post eller lösenord';
      
      if (error.message.includes('Invalid login credentials') || error.status === 400) {
        errorMsg = 'Fel e-post eller lösenord. Kontrollera att kontot finns i Supabase.';
      } else if (error.message.includes('Email not confirmed')) {
        errorMsg = 'E-posten är inte bekräftad. Kontrollera din inkorg eller kontakta admin.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMsg = 'Kunde inte ansluta till Supabase. Kontrollera internetanslutning.';
      } else {
        errorMsg = `Inloggningsfel: ${error.message}`;
      }
      
      console.warn(`❌ Misslyckat inloggningsförsök för ${email}:`, error.message);
      return { success: false, error: errorMsg };
    }

    if (data?.session) {
      // Spara tokens i cookies
      sparaSupabaseSession(cookies, data.session.access_token, data.session.refresh_token);
      
      // Logga lyckad inloggning
      try {
        await loggaHandelse(
          data.user.id, 
          data.user.email || '', 
          'INLOGGNING', 
          {}, 
          request
        );
      } catch (logError) {
        // Ignorera loggningsfel - inloggningen ska fortfarande fungera
        console.warn('Kunde inte logga händelse:', logError);
      }
      
      return { success: true };
    }

    return { success: false, error: 'Inloggning misslyckades - ingen session skapad' };
  } catch (err: any) {
    console.error('Inloggningsfel:', err);
    const errorMsg = err?.message || 'Ett oväntat fel uppstod';
    return { success: false, error: `Systemfel: ${errorMsg}` };
  }
}

function sparaSupabaseSession(
  cookies: AstroCookies, 
  accessToken: string, 
  refreshToken: string | undefined
): void {
  cookies.set('sb-access-token', accessToken, {
    path: '/',
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax', // 'lax' för att fungera med redirects
    maxAge: SESSION_DURATION_SECONDS
  });
  
  if (refreshToken) {
    cookies.set('sb-refresh-token', refreshToken, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax', // 'lax' för att fungera med redirects
      maxAge: 60 * 60 * 24 * 7 // 7 dagar för refresh token
    });
  }
}

// ============================================
// MAGIC LINK (endast Supabase)
// ============================================

/**
 * Skickar en magic link till användarens e-post
 * Användaren kan logga in genom att klicka på länken
 */
export async function skickaMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
  if (!USE_SUPABASE) {
    return { success: false, error: 'Magic Link stöds endast med Supabase' };
  }

  try {
    // Använd produktions-URL om tillgänglig, annars fallback
    const siteUrl = import.meta.env.SITE || import.meta.env.PUBLIC_SITE_URL || 'https://sodermalm.netlify.app';
    const redirectUrl = `${siteUrl}/personal/oversikt`;
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (error) {
      return { success: false, error: 'Kunde inte skicka länk' };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Ett fel uppstod' };
  }
}

// ============================================
// GLÖMT LÖSENORD (endast Supabase)
// ============================================

/**
 * Skickar en återställningslänk till användarens e-post
 */
export async function skickaAterställningslank(email: string): Promise<{ success: boolean; error?: string }> {
  if (!USE_SUPABASE) {
    return { success: false, error: 'Kontakta admin för nytt lösenord' };
  }

  try {
    // Använd produktions-URL om tillgänglig, annars fallback
    const siteUrl = import.meta.env.SITE || import.meta.env.PUBLIC_SITE_URL || 'https://sodermalm.netlify.app';
    const redirectUrl = `${siteUrl}/personal/aterstall-losenord`;
    
    console.log('📧 Skickar återställningslänk till:', email);
    console.log('🔗 Redirect URL:', redirectUrl);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });

    if (error) {
      return { success: false, error: 'Kunde inte skicka återställningslänk' };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Ett fel uppstod' };
  }
}

// ============================================
// HJÄLPFUNKTIONER
// ============================================

/**
 * Kontrollerar om Supabase-läge är aktiverat
 */
export function arSupabaseAktiverat(): boolean {
  return USE_SUPABASE;
}

/**
 * Kontrollerar om användaren är admin
 */
export async function arAdmin(cookies: AstroCookies): Promise<boolean> {
  const user = await hamtaAnvandare(cookies);
  return user ? harMinstPortalRoll(user.roll, 'admin') : false;
}

// Exportera äldre funktioner för bakåtkompatibilitet
export function valideraLosenord(losenord: string): boolean {
  const korrektLosenord = import.meta.env.PERSONAL_PASSWORD || 'demo123';
  return losenord === korrektLosenord;
}
