import type { Config, Context } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { dispatchEnkatReminders } from '../../src/lib/enkat-remind-runner';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ENCRYPTION_KEY = process.env.POOL_ENCRYPTION_KEY || '';
const SALT = 'kort-varsel-salt';

function decryptPhone(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  if (!ivHex || !encrypted) {
    throw new Error('Ogiltig krypterad data');
  }

  const key = crypto.scryptSync(ENCRYPTION_KEY, SALT, 32);
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export default async function handler(_req: Request, _context: Context) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return new Response('Supabase not configured', { status: 500 });
  }

  if (!ENCRYPTION_KEY) {
    return new Response('POOL_ENCRYPTION_KEY saknas -- kan inte dekryptera telefonnummer', { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
  });

  try {
    const result = await dispatchEnkatReminders(supabase, decryptPhone, {});
    return new Response(
      JSON.stringify({
        success: true,
        ...result
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown reminder error';
    console.error('Schemalagd enkätpåminnelse misslyckades:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/** Kör ofta så att påminnelser når patienter nära planerad tid (nästa dag 16:00). */
export const config: Config = {
  schedule: '*/10 * * * *'
};
