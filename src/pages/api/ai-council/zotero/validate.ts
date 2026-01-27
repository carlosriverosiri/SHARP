/**
 * API: Validera och spara Zotero API-konfiguration
 * 
 * POST /api/ai-council/zotero/validate
 * 
 * Validerar en Zotero API-nyckel mot Zotero Web API,
 * och sparar den krypterat i databasen om giltig.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../../lib/supabase';
import { encryptApiKey, isValidApiKeyFormat, maskApiKey } from '../../../../lib/zotero-crypto';
import { checkRateLimit, recordRequest } from '../../../../lib/zotero-rate-limiter';

const ZOTERO_API_BASE = 'https://api.zotero.org';

interface ValidateRequest {
  apiKey: string;
  zoteroUserId?: string;  // Om känd, annars hämtar vi från API
  saveConfig?: boolean;   // Spara i databasen?
}

interface ZoteroKeyInfo {
  userID: number;
  username: string;
  access: {
    user?: {
      library?: boolean;
      files?: boolean;
      notes?: boolean;
      write?: boolean;
    };
    groups?: {
      all?: {
        library?: boolean;
        write?: boolean;
      };
    };
  };
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Hämta access token från cookie
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken) {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized',
        message: 'Du måste vara inloggad för att konfigurera Zotero'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verifiera session
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized',
        message: 'Ogiltig session'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Rate limit check
    const { allowed, retryAfterMs } = checkRateLimit(user.id);
    if (!allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        message: `Vänta ${Math.ceil((retryAfterMs || 1000) / 1000)} sekunder innan du försöker igen`,
        retryAfter: Math.ceil((retryAfterMs || 1000) / 1000),
      }), {
        status: 429,
        headers: { 
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((retryAfterMs || 1000) / 1000)),
        },
      });
    }

    // Parse request body
    const body: ValidateRequest = await request.json();
    const { apiKey, saveConfig = true } = body;

    // Validera API-nyckelformat
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: 'Bad Request',
        message: 'API-nyckel krävs'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!isValidApiKeyFormat(apiKey)) {
      return new Response(JSON.stringify({ 
        error: 'Bad Request',
        message: 'Ogiltig API-nyckelformat. Zotero API-nycklar är 24 alfanumeriska tecken.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validera mot Zotero API
    recordRequest(user.id);
    
    const keyInfoResponse = await fetch(`${ZOTERO_API_BASE}/keys/${apiKey}`, {
      headers: {
        'Zotero-API-Version': '3',
      },
    });

    if (!keyInfoResponse.ok) {
      if (keyInfoResponse.status === 404) {
        return new Response(JSON.stringify({ 
          error: 'Invalid API Key',
          message: 'API-nyckeln är ogiltig eller har utgått. Skapa en ny på zotero.org/settings/keys'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Zotero API error: ${keyInfoResponse.status}`);
    }

    const keyInfo: ZoteroKeyInfo = await keyInfoResponse.json();

    // Kontrollera att nyckeln har läsrättigheter
    if (!keyInfo.access?.user?.library) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient Permissions',
        message: 'API-nyckeln saknar läsrättigheter för biblioteket. Skapa en ny nyckel med "Allow library access".'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Spara konfigurationen om begärt
    if (saveConfig) {
      const encryptedKey = encryptApiKey(apiKey, user.id);
      
      const { error: upsertError } = await supabaseAdmin
        .from('ai_council_zotero_configs')
        .upsert({
          user_id: user.id,
          zotero_user_id: String(keyInfo.userID),
          encrypted_api_key: encryptedKey,
          display_name: keyInfo.username,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (upsertError) {
        console.error('Failed to save Zotero config:', upsertError);
        return new Response(JSON.stringify({ 
          error: 'Database Error',
          message: 'Kunde inte spara konfigurationen. Försök igen.'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Returnera framgångsrikt svar (utan API-nyckeln!)
    return new Response(JSON.stringify({ 
      success: true,
      message: 'API-nyckeln är giltig och har sparats',
      config: {
        zoteroUserId: String(keyInfo.userID),
        username: keyInfo.username,
        maskedKey: maskApiKey(apiKey),
        permissions: {
          library: keyInfo.access?.user?.library || false,
          files: keyInfo.access?.user?.files || false,
          notes: keyInfo.access?.user?.notes || false,
          write: keyInfo.access?.user?.write || false,
          groups: !!keyInfo.access?.groups,
        },
        savedAt: new Date().toISOString(),
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Zotero validate error:', error);
    
    // Logga aldrig API-nyckeln!
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: 'Ett oväntat fel uppstod. Försök igen.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * GET: Hämta befintlig konfiguration (utan API-nyckel)
 */
export const GET: APIRoute = async ({ cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token')?.value;

    if (!accessToken) {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized',
        configured: false,
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized',
        configured: false,
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Hämta config (utan encrypted_api_key)
    const { data: config, error } = await supabaseAdmin
      .from('ai_council_zotero_configs')
      .select('zotero_user_id, display_name, library_type, default_collection_key, last_used_at, created_at')
      .eq('user_id', user.id)
      .single();

    if (error || !config) {
      return new Response(JSON.stringify({ 
        configured: false,
        message: 'Ingen Zotero-konfiguration hittades'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      configured: true,
      config: {
        zoteroUserId: config.zotero_user_id,
        username: config.display_name,
        libraryType: config.library_type,
        defaultCollection: config.default_collection_key,
        lastUsed: config.last_used_at,
        createdAt: config.created_at,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Zotero config GET error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      configured: false,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * DELETE: Ta bort Zotero-konfiguration
 */
export const DELETE: APIRoute = async ({ cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token')?.value;

    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error } = await supabaseAdmin
      .from('ai_council_zotero_configs')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Zotero-konfiguration har tagits bort'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Zotero config DELETE error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
