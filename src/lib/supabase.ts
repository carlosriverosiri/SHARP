/**
 * Supabase-klient för autentisering och databas
 * 
 * Används för:
 * - Inloggning/utloggning
 * - Session-hantering
 * - Audit-logg
 * - SMS-statistik
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Miljövariabler (ställs in i .env eller Netlify)
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Flagga för om Supabase är korrekt konfigurerat
export const supabaseKonfigurerad = !!(supabaseUrl && supabaseAnonKey);

// Skapa Supabase-klient (eller en dummy om ej konfigurerad)
let _supabase: SupabaseClient;

try {
  if (supabaseKonfigurerad) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    console.log('✅ Supabase klient initierad');
  } else {
    // Skapa en dummy-klient för att undvika bygge-fel
    _supabase = createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: { persistSession: false },
    });
    console.warn('⚠️ Supabase miljövariabler saknas - använder placeholder');
  }
} catch (error) {
  console.error('❌ Kunde inte skapa Supabase-klient:', error);
  // Fallback dummy-klient
  _supabase = createClient('https://placeholder.supabase.co', 'placeholder-key', {
    auth: { persistSession: false },
  });
}

export const supabase = _supabase;

// Admin-klient för server-side operationer (bypasses RLS)
let _supabaseAdmin: SupabaseClient;

try {
  if (supabaseUrl && supabaseServiceKey) {
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
    console.log('✅ Supabase admin-klient initierad');
  } else {
    // Fallback till vanlig klient
    _supabaseAdmin = _supabase;
    console.warn('⚠️ Service role key saknas - admin-klient använder anon key');
  }
} catch (error) {
  console.error('❌ Kunde inte skapa admin-klient:', error);
  _supabaseAdmin = _supabase;
}

export const supabaseAdmin = _supabaseAdmin;

/**
 * Typedefinitioner för våra databas-tabeller
 */
export interface AuditLogg {
  id?: number;
  anvandare_id: string;
  anvandare_email: string;
  handelse_typ: 'INLOGGNING' | 'UTLOGGNING' | 'SMS_SKICKAT' | 'MALL_SKAPAD' | 'MALL_RADERAD';
  detaljer?: Record<string, unknown>;
  ip_adress?: string;
  user_agent?: string;
  skapad_vid?: string;
}

export interface SmsStatistik {
  id?: number;
  anvandare_id: string;
  mall_kategori: string;
  mall_namn: string;
  mottagare_suffix?: string;  // Sista 2 siffror (GDPR)
  skickad_vid?: string;
}

/**
 * Logga en händelse i audit-loggen
 */
export async function loggaHandelse(
  anvandare_id: string,
  anvandare_email: string,
  handelse_typ: AuditLogg['handelse_typ'],
  detaljer?: Record<string, unknown>,
  request?: Request
): Promise<void> {
  try {
    const loggPost: AuditLogg = {
      anvandare_id,
      anvandare_email,
      handelse_typ,
      detaljer,
      ip_adress: request?.headers.get('x-forwarded-for') || 
                 request?.headers.get('x-real-ip') || 
                 'unknown',
      user_agent: request?.headers.get('user-agent') || 'unknown',
    };

    const { error } = await supabase
      .from('audit_logg')
      .insert(loggPost);

    if (error) {
      console.error('Kunde inte logga händelse:', error);
    }
  } catch (err) {
    console.error('Fel vid loggning:', err);
  }
}

/**
 * Kontrollera rate limit för SMS
 * Returnerar true om användaren får skicka fler SMS
 */
export async function kontrolleraRateLimit(anvandare_id: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('kontrollera_rate_limit', { user_id: anvandare_id });

    if (error) {
      console.error('Kunde inte kontrollera rate limit:', error);
      return false; // Säkert: neka om fel
    }

    return data === true;
  } catch (err) {
    console.error('Fel vid rate limit-kontroll:', err);
    return false;
  }
}

/**
 * Registrera SMS-sändning (för statistik)
 * OBS: Lagra ALDRIG fullständigt telefonnummer!
 */
export async function registreraSms(
  anvandare_id: string,
  mall_kategori: string,
  mall_namn: string,
  telefonnummer?: string  // Endast för att extrahera sista siffrorna
): Promise<void> {
  try {
    // Extrahera endast sista 2 siffror (GDPR)
    const suffix = telefonnummer 
      ? '**' + telefonnummer.slice(-2) 
      : undefined;

    const { error } = await supabase
      .from('sms_statistik')
      .insert({
        anvandare_id,
        mall_kategori,
        mall_namn,
        mottagare_suffix: suffix,
      });

    if (error) {
      console.error('Kunde inte registrera SMS:', error);
    }

    // Registrera även i rate limit-tabellen
    await supabase
      .from('sms_rate_limit')
      .insert({ anvandare_id });

  } catch (err) {
    console.error('Fel vid SMS-registrering:', err);
  }
}

/**
 * Kontrollera om användaren är admin
 */
export async function arAdmin(user_id: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.admin.getUserById(user_id);
    return user?.app_metadata?.role === 'admin';
  } catch {
    return false;
  }
}
