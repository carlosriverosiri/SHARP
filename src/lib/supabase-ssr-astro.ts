/**
 * Supabase Auth för Astro SSR med @supabase/ssr.
 * Delar upp stora session-JWT i flera kakor — undviker Chromes ~4096-byte gräns
 * som annars kan göra att inloggning "inte fungerar" medan Edge/inkognito fungerar.
 */
import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import type { SerializeOptions } from 'cookie';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

function mapSerializeToAstroOptions(options: SerializeOptions): Parameters<AstroCookies['set']>[2] {
  const sameSite = options.sameSite;
  let sameSiteOut: 'lax' | 'strict' | 'none' | undefined;
  if (sameSite === true) sameSiteOut = 'strict';
  else if (sameSite === false) sameSiteOut = 'lax';
  else if (typeof sameSite === 'string') {
    sameSiteOut = sameSite as 'lax' | 'strict' | 'none';
  }

  return {
    path: options.path ?? '/',
    domain: options.domain,
    maxAge: options.maxAge,
    expires: options.expires,
    httpOnly: options.httpOnly ?? true,
    secure: options.secure ?? import.meta.env.PROD,
    sameSite: sameSiteOut ?? 'lax'
  };
}

/** Skapar request-specifik Supabase-klient; läser/skriver chunkade auth-kakor via Astro. */
export function createSupabaseServerClient(cookies: AstroCookies, request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('PUBLIC_SUPABASE_URL och PUBLIC_SUPABASE_ANON_KEY krävs för Supabase SSR-klient');
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('cookie') ?? '');
      },
      setAll(cookiesToSet: { name: string; value: string; options: SerializeOptions }[]) {
        for (const { name, value, options } of cookiesToSet) {
          const path = options.path ?? '/';
          if (!value) {
            cookies.delete(name, { path });
          } else {
            cookies.set(name, value, mapSerializeToAstroOptions(options));
          }
        }
      }
    }
  });
}
