/**
 * API: Sök i Zotero-bibliotek
 * 
 * GET /api/ai-council/zotero/search?q=query&limit=25&start=0
 * 
 * Söker i användarens Zotero-bibliotek och returnerar matchande items.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../../lib/supabase';
import { decryptApiKey } from '../../../../lib/zotero-crypto';
import { rateLimitedFetch, getRateLimitStatus } from '../../../../lib/zotero-rate-limiter';

const ZOTERO_API_BASE = 'https://api.zotero.org';

interface ZoteroAttachment {
  key: string;
  data: {
    key: string;
    itemType: string;
    parentItem: string;
    contentType?: string;
    filename?: string;
    linkMode?: string;
  };
}

interface ZoteroItem {
  key: string;
  version: number;
  library: {
    type: string;
    id: number;
    name: string;
  };
  data: {
    key: string;
    itemType: string;
    title?: string;
    creators?: Array<{
      creatorType: string;
      firstName?: string;
      lastName?: string;
      name?: string;
    }>;
    abstractNote?: string;
    date?: string;
    DOI?: string;
    url?: string;
    publicationTitle?: string;
    journalAbbreviation?: string;
    volume?: string;
    issue?: string;
    pages?: string;
    tags?: Array<{ tag: string }>;
    dateAdded: string;
    dateModified: string;
  };
}

interface SearchResult {
  totalResults: number;
  items: Array<{
    key: string;
    itemType: string;
    title: string;
    authors: string;
    year: string;
    abstract?: string;
    doi?: string;
    url?: string;
    journal?: string;
    hasPdf: boolean;
    tags: string[];
  }>;
  rateLimit: {
    remaining: number;
    total: number;
  };
}

export const GET: APIRoute = async ({ request, cookies }) => {
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

    // Hämta sökparametrar
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '25'), 100);
    const start = parseInt(url.searchParams.get('start') || '0');
    const itemType = url.searchParams.get('itemType'); // Filter: journalArticle, book, etc
    const tag = url.searchParams.get('tag');
    const collection = url.searchParams.get('collection');

    if (!query && !collection) {
      return new Response(JSON.stringify({ 
        error: 'Bad Request',
        message: 'Sökfråga (q) eller collection krävs'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Hämta användarens Zotero-config
    const { data: config, error: configError } = await supabaseAdmin
      .from('ai_council_zotero_configs')
      .select('zotero_user_id, encrypted_api_key, library_type')
      .eq('user_id', user.id)
      .single();

    if (configError || !config) {
      return new Response(JSON.stringify({ 
        error: 'Not Configured',
        message: 'Zotero är inte konfigurerat. Gå till inställningar för att lägga till din API-nyckel.'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Dekryptera API-nyckel
    let apiKey: string;
    try {
      apiKey = decryptApiKey(config.encrypted_api_key, user.id);
    } catch (decryptError) {
      console.error('Failed to decrypt API key:', decryptError);
      return new Response(JSON.stringify({ 
        error: 'Configuration Error',
        message: 'Kunde inte läsa API-nyckeln. Konfigurera om Zotero.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Bygg Zotero API URL
    const libraryPath = config.library_type === 'group' 
      ? `groups/${config.zotero_user_id}` 
      : `users/${config.zotero_user_id}`;

    const searchParams = new URLSearchParams({
      format: 'json',
      include: 'data',
      limit: String(limit),
      start: String(start),
      sort: 'dateModified',
      direction: 'desc',
    });

    if (query) {
      searchParams.set('q', query);
    }
    if (itemType) {
      searchParams.set('itemType', itemType);
    }
    if (tag) {
      searchParams.set('tag', tag);
    }

    // Bygg URL - för collection måste vi ändra endpoint-strukturen
    let searchUrl: string;
    if (collection) {
      // Zotero API kräver: /users/{userID}/collections/{collectionKey}/items
      searchUrl = `${ZOTERO_API_BASE}/${libraryPath}/collections/${collection}/items?${searchParams.toString()}`;
    } else {
      // Sök i hela biblioteket
      searchUrl = `${ZOTERO_API_BASE}/${libraryPath}/items?${searchParams.toString()}`;
    }

    // Gör sökning med rate limiting
    const response = await rateLimitedFetch(
      searchUrl,
      {
        headers: {
          'Zotero-API-Version': '3',
          'Authorization': `Bearer ${apiKey}`,
        },
      },
      user.id
    );

    if (!response.ok) {
      if (response.status === 403) {
        return new Response(JSON.stringify({ 
          error: 'Access Denied',
          message: 'API-nyckeln har inte behörighet att söka i biblioteket.'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Zotero API error: ${response.status}`);
    }

    const items: ZoteroItem[] = await response.json();
    const totalResults = parseInt(response.headers.get('Total-Results') || '0');

    // Filtrera bort attachments och notes
    const mainItems = items.filter(item => 
      item.data.itemType !== 'attachment' && item.data.itemType !== 'note'
    );
    
    // HÃ¤mta PDF-attachments fÃ¶r att veta vilka items som har PDF
    const itemsWithPdf = new Set<string>();
    
    if (mainItems.length > 0) {
      try {
        const attachmentParams = new URLSearchParams({
          format: 'json',
          itemType: 'attachment',
          limit: '100',
        });
        
        let attachmentUrl: string;
        if (collection) {
          attachmentUrl = `${ZOTERO_API_BASE}/${libraryPath}/collections/${collection}/items?${attachmentParams.toString()}`;
        } else {
          attachmentUrl = `${ZOTERO_API_BASE}/${libraryPath}/items?${attachmentParams.toString()}`;
        }
        
        const attachmentResponse = await rateLimitedFetch(
          attachmentUrl,
          {
            headers: {
              'Zotero-API-Version': '3',
              'Authorization': `Bearer ${apiKey}`,
            },
          },
          user.id
        );
        
        if (attachmentResponse.ok) {
          const attachments = await attachmentResponse.json();
          for (const att of attachments) {
            if (att.data?.parentItem && 
                (att.data.contentType === 'application/pdf' || 
                 att.data.filename?.toLowerCase().endsWith('.pdf'))) {
              itemsWithPdf.add(att.data.parentItem);
            }
          }
        }
      } catch (e) {
        console.warn('Could not fetch attachments:', e);
      }
    }
    
    // Formatera resultat
    const formattedItems = mainItems.map(item => ({
        key: item.key,
        itemType: item.data.itemType,
        title: item.data.title || 'Utan titel',
        authors: formatAuthors(item.data.creators),
        year: extractYear(item.data.date),
        abstract: item.data.abstractNote?.slice(0, 500),
        doi: item.data.DOI,
        url: item.data.url,
        journal: item.data.publicationTitle || item.data.journalAbbreviation,
        hasPdf: itemsWithPdf.has(item.key),
        tags: (item.data.tags || []).map(t => t.tag),
      }));

    // Uppdatera last_used_at
    await supabaseAdmin
      .from('ai_council_zotero_configs')
      .update({ last_used_at: new Date().toISOString() })
      .eq('user_id', user.id);

    const rateLimitStatus = getRateLimitStatus(user.id);

    const result: SearchResult = {
      totalResults,
      items: formattedItems,
      rateLimit: {
        remaining: rateLimitStatus.remainingRequests,
        total: 100,
      },
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Zotero search error:', error);
    
    const message = error instanceof Error ? error.message : 'Ett oväntat fel uppstod';
    
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: message.includes('Rate limit') ? message : 'Sökningen misslyckades. Försök igen.'
    }), {
      status: message.includes('Rate limit') ? 429 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * Formatera författarlista till läsbar sträng
 */
function formatAuthors(creators?: ZoteroItem['data']['creators']): string {
  if (!creators || creators.length === 0) {
    return 'Okänd författare';
  }

  const authors = creators
    .filter(c => c.creatorType === 'author')
    .map(c => {
      if (c.name) return c.name;
      if (c.lastName && c.firstName) return `${c.lastName}, ${c.firstName.charAt(0)}.`;
      if (c.lastName) return c.lastName;
      return '';
    })
    .filter(Boolean);

  if (authors.length === 0) {
    return 'Okänd författare';
  }
  if (authors.length === 1) {
    return authors[0];
  }
  if (authors.length === 2) {
    return `${authors[0]} & ${authors[1]}`;
  }
  return `${authors[0]} et al.`;
}

/**
 * Extrahera år från datumfält
 */
function extractYear(date?: string): string {
  if (!date) return '';
  
  // Försök hitta ett 4-siffrigt år
  const match = date.match(/\d{4}/);
  return match ? match[0] : date;
}
