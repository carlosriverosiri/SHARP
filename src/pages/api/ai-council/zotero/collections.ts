/**
 * API: Hämta Zotero collections
 * 
 * GET /api/ai-council/zotero/collections
 * 
 * Returnerar alla collections/bibliotek i användarens Zotero
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../../lib/supabase';
import { decryptApiKey } from '../../../../lib/zotero-crypto';
import { rateLimitedFetch } from '../../../../lib/zotero-rate-limiter';

const ZOTERO_API_BASE = 'https://api.zotero.org';

interface ZoteroCollection {
  key: string;
  version: number;
  data: {
    key: string;
    name: string;
    parentCollection: string | false;
    relations?: Record<string, unknown>;
  };
  meta: {
    numCollections: number;
    numItems: number;
  };
}

export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Hämta access token
    const accessToken = cookies.get('sb-access-token')?.value;

    if (!accessToken) {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized',
        message: 'Du måste vara inloggad'
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

    // Hämta Zotero-konfiguration
    const { data: config, error: configError } = await supabaseAdmin
      .from('ai_council_zotero_configs')
      .select('zotero_user_id, encrypted_api_key, display_name, default_collection_key')
      .eq('user_id', user.id)
      .single();

    if (configError || !config) {
      return new Response(JSON.stringify({ 
        error: 'Not Configured',
        message: 'Zotero är inte konfigurerat'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Dekryptera API-nyckel
    const apiKey = decryptApiKey(config.encrypted_api_key, user.id);
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: 'Decryption Error',
        message: 'Kunde inte dekryptera API-nyckel'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Hämta ALLA collections från Zotero (med pagination)
    const zoteroUserId = config.zotero_user_id;
    let allCollections: ZoteroCollection[] = [];
    let start = 0;
    const limit = 100; // Max per request
    
    while (true) {
      const url = `${ZOTERO_API_BASE}/users/${zoteroUserId}/collections?limit=${limit}&start=${start}`;
      
      const response = await rateLimitedFetch(url, {
        headers: {
          'Zotero-API-Version': '3',
          'Authorization': `Bearer ${apiKey}`,
        },
      }, user.id);

      if (!response.ok) {
        if (response.status === 403) {
          return new Response(JSON.stringify({ 
            error: 'Permission Denied',
            message: 'API-nyckeln saknar läsrättigheter'
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`Zotero API error: ${response.status}`);
      }

      const collections: ZoteroCollection[] = await response.json();
      allCollections = allCollections.concat(collections);
      
      // Check if there are more results
      const totalResults = parseInt(response.headers.get('Total-Results') || '0');
      if (allCollections.length >= totalResults || collections.length < limit) {
        break;
      }
      start += limit;
    }
    
    const collections = allCollections;

    // Formatera svaret
    const formattedCollections = collections.map(col => ({
      key: col.key,
      name: col.data.name,
      parentKey: col.data.parentCollection || null,
      numItems: col.meta.numItems,
      numSubcollections: col.meta.numCollections,
    }));

    // Bygg träd av collections (top-level först)
    const topLevel = formattedCollections.filter(c => !c.parentKey);
    const byParent = new Map<string, typeof formattedCollections>();
    
    formattedCollections.forEach(c => {
      if (c.parentKey) {
        const children = byParent.get(c.parentKey) || [];
        children.push(c);
        byParent.set(c.parentKey, children);
      }
    });

    // Sortera alfabetiskt
    topLevel.sort((a, b) => a.name.localeCompare(b.name, 'sv'));
    byParent.forEach(children => children.sort((a, b) => a.name.localeCompare(b.name, 'sv')));

    return new Response(JSON.stringify({ 
      success: true,
      username: config.display_name,
      zoteroUserId: config.zotero_user_id,
      defaultCollection: config.default_collection_key,
      collections: topLevel,
      subCollections: Object.fromEntries(byParent),
      totalCollections: collections.length,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Zotero collections error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: 'Kunde inte hämta collections'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
