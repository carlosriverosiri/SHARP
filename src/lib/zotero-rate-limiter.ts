/**
 * Rate Limiter för Zotero API
 * 
 * Zotero använder burst-baserade limits:
 * - 120 requests per 60 sekunder (sliding window)
 * - Returnerar Retry-After header vid överbelastning
 * 
 * Denna implementation:
 * - Håller koll på requests per användare
 * - Implementerar exponential backoff
 * - Respekterar Retry-After headers
 */

interface RateLimitEntry {
  requests: number[];  // Timestamps för requests
  retryAfter?: number; // Timestamp när retry är tillåtet
}

// In-memory store (i produktion: använd Redis)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Zotero rate limit constants
const WINDOW_MS = 60 * 1000;     // 60 sekunder
const MAX_REQUESTS = 100;        // Lite marginal under 120
const CLEANUP_INTERVAL = 5 * 60 * 1000; // Rensa var 5:e minut

/**
 * Kontrollera om en request är tillåten
 * 
 * @param userId - Användarens ID
 * @returns { allowed: boolean, retryAfterMs?: number }
 */
export function checkRateLimit(userId: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(userId) || { requests: [] };
  
  // Kolla om vi har en aktiv retry-after
  if (entry.retryAfter && entry.retryAfter > now) {
    return {
      allowed: false,
      retryAfterMs: entry.retryAfter - now,
    };
  }
  
  // Filtrera bort gamla requests utanför fönstret
  entry.requests = entry.requests.filter(ts => ts > now - WINDOW_MS);
  
  // Kolla om vi är under gränsen
  if (entry.requests.length >= MAX_REQUESTS) {
    // Beräkna när äldsta request faller ur fönstret
    const oldestRequest = Math.min(...entry.requests);
    const retryAfterMs = oldestRequest + WINDOW_MS - now;
    
    return {
      allowed: false,
      retryAfterMs: Math.max(retryAfterMs, 1000), // Minst 1 sekund
    };
  }
  
  return { allowed: true };
}

/**
 * Registrera en genomförd request
 * 
 * @param userId - Användarens ID
 */
export function recordRequest(userId: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(userId) || { requests: [] };
  
  entry.requests.push(now);
  rateLimitStore.set(userId, entry);
}

/**
 * Sätt retry-after baserat på API-svar
 * 
 * @param userId - Användarens ID
 * @param retryAfterSeconds - Sekunder att vänta (från Zotero header)
 */
export function setRetryAfter(userId: string, retryAfterSeconds: number): void {
  const entry = rateLimitStore.get(userId) || { requests: [] };
  entry.retryAfter = Date.now() + (retryAfterSeconds * 1000);
  rateLimitStore.set(userId, entry);
}

/**
 * Beräkna backoff-tid för retry
 * Exponential backoff: 1s, 2s, 4s, 8s, max 30s
 * 
 * @param attempt - Vilket försök (0-indexed)
 * @returns Millisekunder att vänta
 */
export function calculateBackoff(attempt: number): number {
  const baseDelay = 1000; // 1 sekund
  const maxDelay = 30000; // 30 sekunder
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  
  // Lägg till lite jitter för att undvika thundering herd
  const jitter = Math.random() * 500;
  
  return delay + jitter;
}

/**
 * Wrapper för fetch med rate limiting och retry
 * 
 * @param url - URL att fetcha
 * @param options - Fetch options
 * @param userId - Användarens ID för rate limiting
 * @param maxRetries - Max antal retries (default 3)
 */
export async function rateLimitedFetch(
  url: string,
  options: RequestInit,
  userId: string,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Kolla rate limit
    const { allowed, retryAfterMs } = checkRateLimit(userId);
    
    if (!allowed) {
      if (attempt === maxRetries) {
        throw new Error(`Rate limit exceeded. Retry after ${Math.ceil((retryAfterMs || 1000) / 1000)} seconds.`);
      }
      
      // Vänta och försök igen
      await sleep(retryAfterMs || calculateBackoff(attempt));
      continue;
    }
    
    try {
      // Registrera request innan vi gör den
      recordRequest(userId);
      
      const response = await fetch(url, options);
      
      // Kolla efter rate limit headers
      const retryAfterHeader = response.headers.get('Retry-After');
      if (retryAfterHeader) {
        const retrySeconds = parseInt(retryAfterHeader, 10);
        if (!isNaN(retrySeconds)) {
          setRetryAfter(userId, retrySeconds);
        }
      }
      
      // Om 429 Too Many Requests
      if (response.status === 429) {
        const retrySeconds = parseInt(retryAfterHeader || '5', 10);
        setRetryAfter(userId, retrySeconds);
        
        if (attempt < maxRetries) {
          await sleep(retrySeconds * 1000);
          continue;
        }
      }
      
      return response;
      
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        await sleep(calculateBackoff(attempt));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Hjälpfunktion för att pausa exekvering
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Rensa gamla entries från store (kör periodiskt)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  
  for (const [userId, entry] of rateLimitStore.entries()) {
    // Filtrera bort gamla requests
    entry.requests = entry.requests.filter(ts => ts > now - WINDOW_MS);
    
    // Rensa retry-after om det passerat
    if (entry.retryAfter && entry.retryAfter < now) {
      delete entry.retryAfter;
    }
    
    // Ta bort helt tomma entries
    if (entry.requests.length === 0 && !entry.retryAfter) {
      rateLimitStore.delete(userId);
    }
  }
}

// Starta periodisk cleanup
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, CLEANUP_INTERVAL);
}

/**
 * Hämta aktuell rate limit status för debugging
 */
export function getRateLimitStatus(userId: string): {
  requestsInWindow: number;
  remainingRequests: number;
  retryAfterMs?: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(userId) || { requests: [] };
  
  const recentRequests = entry.requests.filter(ts => ts > now - WINDOW_MS);
  
  return {
    requestsInWindow: recentRequests.length,
    remainingRequests: Math.max(0, MAX_REQUESTS - recentRequests.length),
    retryAfterMs: entry.retryAfter && entry.retryAfter > now 
      ? entry.retryAfter - now 
      : undefined,
  };
}
