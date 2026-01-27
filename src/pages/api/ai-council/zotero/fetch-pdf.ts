/**
 * API: Hämta PDF från Zotero och extrahera text
 * 
 * POST /api/ai-council/zotero/fetch-pdf
 * { itemKey: "ABC123" }
 * 
 * Hämtar PDF-attachment från ett Zotero-item och extraherar texten.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../../lib/supabase';
import { decryptApiKey } from '../../../../lib/zotero-crypto';
import { rateLimitedFetch, getRateLimitStatus } from '../../../../lib/zotero-rate-limiter';

const ZOTERO_API_BASE = 'https://api.zotero.org';
const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB max

interface FetchPdfRequest {
  itemKey: string;
  extractText?: boolean;  // Default true
}

interface ZoteroAttachment {
  key: string;
  data: {
    key: string;
    itemType: string;
    linkMode: string;
    contentType: string;
    filename?: string;
    md5?: string;
    mtime?: number;
  };
}

interface PdfResult {
  itemKey: string;
  filename: string;
  contentType: string;
  textContent?: string;
  textLength?: number;
  truncated?: boolean;
  error?: string;
}

export const POST: APIRoute = async ({ request, cookies }) => {
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

    // Parse request
    const body: FetchPdfRequest = await request.json();
    const { itemKey, extractText = true } = body;

    if (!itemKey) {
      return new Response(JSON.stringify({ 
        error: 'Bad Request',
        message: 'itemKey krävs'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validera itemKey format (alfanumeriskt, 8 tecken)
    if (!/^[A-Z0-9]{8}$/i.test(itemKey)) {
      return new Response(JSON.stringify({ 
        error: 'Bad Request',
        message: 'Ogiltigt itemKey-format'
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
        message: 'Zotero är inte konfigurerat.'
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
      return new Response(JSON.stringify({ 
        error: 'Configuration Error',
        message: 'Kunde inte läsa API-nyckeln.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const libraryPath = config.library_type === 'group' 
      ? `groups/${config.zotero_user_id}` 
      : `users/${config.zotero_user_id}`;

    // Steg 1: Hämta item för att hitta PDF-attachment
    const childrenUrl = `${ZOTERO_API_BASE}/${libraryPath}/items/${itemKey}/children?format=json`;
    
    const childrenResponse = await rateLimitedFetch(
      childrenUrl,
      {
        headers: {
          'Zotero-API-Version': '3',
          'Authorization': `Bearer ${apiKey}`,
        },
      },
      user.id
    );

    if (!childrenResponse.ok) {
      if (childrenResponse.status === 404) {
        return new Response(JSON.stringify({ 
          error: 'Not Found',
          message: 'Objektet hittades inte i Zotero.'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Zotero API error: ${childrenResponse.status}`);
    }

    const children: ZoteroAttachment[] = await childrenResponse.json();
    
    // Hitta PDF-attachment
    const pdfAttachment = children.find(
      child => child.data.itemType === 'attachment' && 
               child.data.contentType === 'application/pdf' &&
               child.data.linkMode === 'imported_file'
    );

    if (!pdfAttachment) {
      return new Response(JSON.stringify({ 
        error: 'No PDF',
        message: 'Ingen PDF hittades för detta objekt. Endast lokalt lagrade PDF:er (imported_file) stöds.',
        availableAttachments: children
          .filter(c => c.data.itemType === 'attachment')
          .map(c => ({
            key: c.key,
            filename: c.data.filename,
            contentType: c.data.contentType,
            linkMode: c.data.linkMode,
          })),
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Steg 2: Hämta PDF-filen
    const fileUrl = `${ZOTERO_API_BASE}/${libraryPath}/items/${pdfAttachment.key}/file`;
    
    const fileResponse = await rateLimitedFetch(
      fileUrl,
      {
        headers: {
          'Zotero-API-Version': '3',
          'Authorization': `Bearer ${apiKey}`,
        },
      },
      user.id
    );

    if (!fileResponse.ok) {
      if (fileResponse.status === 404) {
        return new Response(JSON.stringify({ 
          error: 'File Not Found',
          message: 'PDF-filen kunde inte hämtas från Zotero. Filen kanske inte är synkad.'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Failed to fetch PDF: ${fileResponse.status}`);
    }

    // Kontrollera filstorlek
    const contentLength = parseInt(fileResponse.headers.get('Content-Length') || '0');
    if (contentLength > MAX_PDF_SIZE) {
      return new Response(JSON.stringify({ 
        error: 'File Too Large',
        message: `PDF:en är för stor (${Math.round(contentLength / 1024 / 1024)}MB). Max ${MAX_PDF_SIZE / 1024 / 1024}MB.`
      }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const pdfBuffer = Buffer.from(await fileResponse.arrayBuffer());

    // Steg 3: Extrahera text från PDF
    let textContent = '';
    let truncated = false;

    if (extractText) {
      try {
        // Dynamisk import av pdf-parse
        const pdfParse = (await import('pdf-parse')).default;
        const pdfData = await pdfParse(pdfBuffer);
        
        textContent = pdfData.text;
        
        // Begränsa textlängd för att inte överbelasta AI
        const MAX_TEXT_LENGTH = 100000; // ~100k tecken
        if (textContent.length > MAX_TEXT_LENGTH) {
          textContent = textContent.slice(0, MAX_TEXT_LENGTH);
          truncated = true;
        }
        
        // Städa upp texten
        textContent = cleanExtractedText(textContent);
        
      } catch (parseError) {
        console.error('PDF parse error:', parseError);
        return new Response(JSON.stringify({ 
          error: 'Parse Error',
          message: 'Kunde inte extrahera text från PDF. Filen kan vara skyddad eller korrupt.',
          itemKey,
          filename: pdfAttachment.data.filename,
        }), {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Uppdatera last_used_at
    await supabaseAdmin
      .from('ai_council_zotero_configs')
      .update({ last_used_at: new Date().toISOString() })
      .eq('user_id', user.id);

    const result: PdfResult = {
      itemKey,
      filename: pdfAttachment.data.filename || 'unknown.pdf',
      contentType: 'application/pdf',
      textContent: extractText ? textContent : undefined,
      textLength: textContent.length,
      truncated,
    };

    const rateLimitStatus = getRateLimitStatus(user.id);

    return new Response(JSON.stringify({
      success: true,
      pdf: result,
      rateLimit: {
        remaining: rateLimitStatus.remainingRequests,
        total: 100,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Zotero fetch-pdf error:', error);
    
    const message = error instanceof Error ? error.message : 'Ett oväntat fel uppstod';
    
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: message.includes('Rate limit') ? message : 'Kunde inte hämta PDF. Försök igen.'
    }), {
      status: message.includes('Rate limit') ? 429 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * Städa upp extraherad PDF-text
 */
function cleanExtractedText(text: string): string {
  return text
    // Ta bort överflödiga radbrytningar
    .replace(/\n{3,}/g, '\n\n')
    // Ta bort sidnummer-mönster
    .replace(/^\d+\s*$/gm, '')
    // Ta bort form feed tecken
    .replace(/\f/g, '\n\n')
    // Normalisera whitespace
    .replace(/[ \t]+/g, ' ')
    // Trimma varje rad
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Final trim
    .trim();
}
