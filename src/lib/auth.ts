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
import { supabase, loggaHandelse } from './supabase';

// ============================================
// KONFIGURATION
// ============================================

const SESSION_COOKIE_NAME = 'personal_session';
const SESSION_DURATION_SECONDS = 60 * 60; // 1 timme (sliding timeout)
const SESSION_SECRET = import.meta.env.PERSONAL_SESSION_SECRET || 'default-session-secret';

// Aktivera Supabase-auth genom att sätta denna till 'true'
const USE_SUPABASE = import.meta.env.USE_SUPABASE_AUTH === 'true';

// ============================================
// TYPER
// ============================================

export interface Anvandare {
  id: string;
  email: string;
  roll: 'admin' | 'personal';
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
        roll: 'admin'
      };
    }
    return null;
  }

  const accessToken = cookies.get('sb-access-token')?.value;
  if (!accessToken) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) return null;

    return {
      id: user.id,
      email: user.email || '',
      roll: user.app_metadata?.role === 'admin' ? 'admin' : 'personal'
    };
  } catch {
    return null;
  }
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
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;
  
  if (!accessToken) return false;

  try {
    // Försök använda access token
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!error && user) {
      return true;
    }
    
    // Om access token är utgången, försök refresha
    if (refreshToken) {
      const { data, error: refreshError } = await supabase.auth.refreshSession({
        refresh_token: refreshToken
      });
      
      if (!refreshError && data.session) {
        // Uppdatera cookies med nya tokens
        sparaSupabaseSession(cookies, data.session.access_token, data.session.refresh_token);
        return true;
      }
    }
    
    return false;
  } catch {
    return false;
  }
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

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: losenord
    });

    if (error) {
      // Logga misslyckat inloggningsförsök (utan lösenord!)
      console.warn(`Misslyckat inloggningsförsök för ${email}`);
      return { success: false, error: 'Fel e-post eller lösenord' };
    }

    if (data.session) {
      // Spara tokens i cookies
      sparaSupabaseSession(cookies, data.session.access_token, data.session.refresh_token);
      
      // Logga lyckad inloggning
      await loggaHandelse(
        data.user.id, 
        data.user.email || '', 
        'INLOGGNING', 
        {}, 
        request
      );
      
      return { success: true };
    }

    return { success: false, error: 'Inloggning misslyckades' };
  } catch (err) {
    console.error('Inloggningsfel:', err);
    return { success: false, error: 'Ett fel uppstod. Försök igen.' };
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
    sameSite: 'strict',
    maxAge: SESSION_DURATION_SECONDS
  });
  
  if (refreshToken) {
    cookies.set('sb-refresh-token', refreshToken, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'strict',
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
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${import.meta.env.SITE || 'http://localhost:4321'}/personal/oversikt`
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.SITE || 'http://localhost:4321'}/personal/aterstall-losenord`
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
  return user?.roll === 'admin';
}

// Exportera äldre funktioner för bakåtkompatibilitet
export function valideraLosenord(losenord: string): boolean {
  const korrektLosenord = import.meta.env.PERSONAL_PASSWORD || 'demo123';
  return losenord === korrektLosenord;
}
