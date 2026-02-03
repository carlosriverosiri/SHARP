/**
 * API: Web Search - Multi-engine search via SerpAPI
 * 
 * POST /api/ai-council/web-search
 * Body: { 
 *   query: string, 
 *   engine: 'google' | 'google_scholar' | 'google_news',
 *   maxResults?: number,
 *   language?: string 
 * }
 * 
 * Supports:
 * - Google Search: General web results
 * - Google Scholar: Academic papers, citations
 * - Google News: Recent news articles
 * 
 * Returns verified results with source categorization and credibility scoring
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad } from '../../../lib/auth';

const SERPAPI_KEY = import.meta.env.SERPAPI_KEY;
const SERPAPI_BASE = 'https://serpapi.com/search.json';

// Search engine types
type SearchEngine = 'google' | 'google_scholar' | 'google_news';

// Source credibility categories
type SourceCategory = 'academic' | 'official' | 'code' | 'news' | 'forum' | 'wiki' | 'commercial' | 'unknown';

interface SourceInfo {
  category: SourceCategory;
  icon: string;
  label: string;
  credibilityScore: number; // 0-100
}

interface WebSearchResult {
  title: string;
  link: string;
  snippet: string;
  source: SourceInfo;
  // Scholar-specific
  citationCount?: number;
  authors?: string;
  publicationInfo?: string;
  pdfLink?: string;
  // News-specific
  date?: string;
  thumbnail?: string;
}

interface SearchResponse {
  results: WebSearchResult[];
  totalResults: number;
  query: string;
  engine: SearchEngine;
  searchDuration: number;
  serpApiCreditsUsed?: number;
}

// Categorize sources by domain for credibility assessment
function categorizeSource(url: string, engine: SearchEngine): SourceInfo {
  const domain = url.toLowerCase();
  
  // Academic sources (highest credibility for research)
  if (domain.includes('pubmed') || domain.includes('ncbi.nlm.nih.gov')) {
    return { category: 'academic', icon: '🏥', label: 'PubMed', credibilityScore: 95 };
  }
  if (domain.includes('scholar.google')) {
    return { category: 'academic', icon: '🎓', label: 'Scholar', credibilityScore: 90 };
  }
  if (domain.includes('arxiv.org')) {
    return { category: 'academic', icon: '📄', label: 'arXiv', credibilityScore: 85 };
  }
  if (domain.includes('nature.com') || domain.includes('sciencedirect') || domain.includes('springer')) {
    return { category: 'academic', icon: '📚', label: 'Journal', credibilityScore: 95 };
  }
  if (domain.includes('.edu')) {
    return { category: 'academic', icon: '🎓', label: 'University', credibilityScore: 85 };
  }
  if (domain.includes('researchgate.net')) {
    return { category: 'academic', icon: '🔬', label: 'ResearchGate', credibilityScore: 80 };
  }
  
  // Official/Government sources
  if (domain.includes('.gov') || domain.includes('.mil')) {
    return { category: 'official', icon: '🏛️', label: 'Government', credibilityScore: 90 };
  }
  if (domain.includes('who.int') || domain.includes('cdc.gov') || domain.includes('fda.gov')) {
    return { category: 'official', icon: '⚕️', label: 'Health Authority', credibilityScore: 95 };
  }
  if (domain.includes('.org') && !domain.includes('wikipedia')) {
    return { category: 'official', icon: '🏢', label: 'Organization', credibilityScore: 75 };
  }
  
  // Code/Technical documentation
  if (domain.includes('github.com')) {
    return { category: 'code', icon: '🔧', label: 'GitHub', credibilityScore: 80 };
  }
  if (domain.includes('docs.') || domain.includes('documentation') || domain.includes('developer.')) {
    return { category: 'code', icon: '📖', label: 'Documentation', credibilityScore: 85 };
  }
  if (domain.includes('stackoverflow.com')) {
    return { category: 'forum', icon: '💬', label: 'StackOverflow', credibilityScore: 70 };
  }
  if (domain.includes('mdn') || domain.includes('mozilla.org')) {
    return { category: 'code', icon: '📖', label: 'MDN', credibilityScore: 90 };
  }
  
  // News sources
  if (engine === 'google_news') {
    // Known reliable news sources
    if (domain.includes('reuters.com') || domain.includes('apnews.com')) {
      return { category: 'news', icon: '📰', label: 'Wire Service', credibilityScore: 90 };
    }
    if (domain.includes('nytimes.com') || domain.includes('washingtonpost.com') || domain.includes('bbc.')) {
      return { category: 'news', icon: '📰', label: 'Major News', credibilityScore: 85 };
    }
    return { category: 'news', icon: '📰', label: 'News', credibilityScore: 65 };
  }
  
  // Wiki sources (good for overview, not primary source)
  if (domain.includes('wikipedia.org')) {
    return { category: 'wiki', icon: '📖', label: 'Wikipedia', credibilityScore: 70 };
  }
  
  // Commercial/promotional (lower credibility for research)
  if (domain.includes('medium.com') || domain.includes('blog')) {
    return { category: 'commercial', icon: '✍️', label: 'Blog', credibilityScore: 50 };
  }
  
  // Default
  return { category: 'unknown', icon: '🌐', label: 'Web', credibilityScore: 50 };
}

// Parse Google Search results
function parseGoogleResults(data: any): WebSearchResult[] {
  const organicResults = data.organic_results || [];
  
  return organicResults.map((result: any) => ({
    title: result.title || '',
    link: result.link || '',
    snippet: result.snippet || result.snippet_highlighted_words?.join(' ') || '',
    source: categorizeSource(result.link || '', 'google'),
  }));
}

// Parse Google Scholar results
function parseScholarResults(data: any): WebSearchResult[] {
  const organicResults = data.organic_results || [];
  
  return organicResults.map((result: any) => {
    const sourceInfo = categorizeSource(result.link || '', 'google_scholar');
    // Scholar results are inherently academic
    sourceInfo.credibilityScore = Math.max(sourceInfo.credibilityScore, 80);
    
    return {
      title: result.title || '',
      link: result.link || '',
      snippet: result.snippet || '',
      source: sourceInfo,
      citationCount: result.inline_links?.cited_by?.total || 0,
      authors: result.publication_info?.authors?.map((a: any) => a.name).join(', ') || '',
      publicationInfo: result.publication_info?.summary || '',
      pdfLink: result.resources?.find((r: any) => r.file_format === 'PDF')?.link,
    };
  });
}

// Parse Google News results
function parseNewsResults(data: any): WebSearchResult[] {
  const newsResults = data.news_results || [];
  
  return newsResults.map((result: any) => ({
    title: result.title || '',
    link: result.link || '',
    snippet: result.snippet || '',
    source: categorizeSource(result.source?.name || result.link || '', 'google_news'),
    date: result.date || '',
    thumbnail: result.thumbnail || '',
  }));
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const startTime = Date.now();
  
  // Check authentication
  if (!await arInloggad(cookies)) {
    return new Response(JSON.stringify({ error: 'Ej inloggad' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // Check API key
  if (!SERPAPI_KEY) {
    return new Response(JSON.stringify({ 
      error: 'SerpAPI är inte konfigurerat. Lägg till SERPAPI_KEY i miljövariabler.',
      configured: false 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const body = await request.json();
    const { 
      query, 
      engine = 'google' as SearchEngine, 
      maxResults = 10,
      language = 'sv'
    } = body;
    
    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'Sökterm krävs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Validate engine
    const validEngines: SearchEngine[] = ['google', 'google_scholar', 'google_news'];
    if (!validEngines.includes(engine)) {
      return new Response(JSON.stringify({ 
        error: `Ogiltig sökmotor. Välj: ${validEngines.join(', ')}` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Build SerpAPI request
    const params = new URLSearchParams({
      api_key: SERPAPI_KEY,
      engine: engine,
      q: query,
      num: Math.min(maxResults, 20).toString(),
    });
    
    // Add language settings for non-Scholar engines
    if (engine !== 'google_scholar') {
      params.append('hl', language);
      params.append('gl', language === 'sv' ? 'se' : 'us');
    }
    
    // Execute search
    const response = await fetch(`${SERPAPI_BASE}?${params}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('SerpAPI error:', errorText);
      
      if (response.status === 401) {
        return new Response(JSON.stringify({ 
          error: 'Ogiltig SerpAPI-nyckel. Kontrollera SERPAPI_KEY.',
          configured: false
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`SerpAPI error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Parse results based on engine
    let results: WebSearchResult[];
    switch (engine) {
      case 'google_scholar':
        results = parseScholarResults(data);
        break;
      case 'google_news':
        results = parseNewsResults(data);
        break;
      default:
        results = parseGoogleResults(data);
    }
    
    // Sort by credibility score (highest first)
    results.sort((a, b) => b.source.credibilityScore - a.source.credibilityScore);
    
    const searchResponse: SearchResponse = {
      results,
      totalResults: results.length,
      query,
      engine,
      searchDuration: Date.now() - startTime,
      serpApiCreditsUsed: 1,
    };
    
    return new Response(JSON.stringify(searchResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error: any) {
    console.error('Web search error:', error);
    return new Response(JSON.stringify({ 
      error: 'Sökningen misslyckades: ' + error.message,
      results: [],
      totalResults: 0
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// GET endpoint for quick testing
export const GET: APIRoute = async ({ url, cookies }) => {
  const query = url.searchParams.get('q');
  const engine = (url.searchParams.get('engine') || 'google') as SearchEngine;
  
  if (!query) {
    return new Response(JSON.stringify({ 
      error: 'Ange sökterm med ?q=din+sökning',
      example: '/api/ai-council/web-search?q=react+server+components&engine=google',
      engines: ['google', 'google_scholar', 'google_news'],
      configured: !!SERPAPI_KEY
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // Forward to POST handler
  const fakeRequest = {
    json: async () => ({ query, engine, maxResults: 5 })
  } as Request;
  
  return POST({ request: fakeRequest, cookies, url } as any);
};

/**
 * Utility function for auto-search in profiles
 * Called from query.ts when auto-search is enabled
 */
export async function performAutoSearch(
  query: string, 
  engines: SearchEngine[] = ['google_scholar', 'google'],
  maxPerEngine: number = 3
): Promise<{ engine: SearchEngine; results: WebSearchResult[] }[]> {
  if (!SERPAPI_KEY) {
    console.warn('Auto-search skipped: SERPAPI_KEY not configured');
    return [];
  }
  
  const searchPromises = engines.map(async (engine) => {
    const params = new URLSearchParams({
      api_key: SERPAPI_KEY,
      engine,
      q: query,
      num: maxPerEngine.toString(),
    });
    
    try {
      const response = await fetch(`${SERPAPI_BASE}?${params}`);
      if (!response.ok) return { engine, results: [] };
      
      const data = await response.json();
      let results: WebSearchResult[];
      
      switch (engine) {
        case 'google_scholar':
          results = parseScholarResults(data);
          break;
        case 'google_news':
          results = parseNewsResults(data);
          break;
        default:
          results = parseGoogleResults(data);
      }
      
      return { engine, results: results.slice(0, maxPerEngine) };
    } catch (error) {
      console.error(`Auto-search error for ${engine}:`, error);
      return { engine, results: [] };
    }
  });
  
  return Promise.all(searchPromises);
}

/**
 * Format search results as context for AI models
 */
export function formatSearchResultsAsContext(
  searchResults: { engine: SearchEngine; results: WebSearchResult[] }[]
): string {
  if (searchResults.length === 0 || searchResults.every(r => r.results.length === 0)) {
    return '';
  }
  
  let context = '\n\n## 🔍 Verifierade källor (automatiskt hämtade)\n\n';
  
  for (const { engine, results } of searchResults) {
    if (results.length === 0) continue;
    
    const engineLabel = {
      'google': '🌐 Webb',
      'google_scholar': '🎓 Akademiska',
      'google_news': '📰 Nyheter'
    }[engine];
    
    context += `### ${engineLabel}\n\n`;
    
    results.forEach((result, i) => {
      context += `**[${i + 1}]** ${result.title}\n`;
      context += `   ${result.source.icon} ${result.source.label} (trovärdighet: ${result.source.credibilityScore}/100)\n`;
      context += `   ${result.link}\n`;
      if (result.snippet) {
        context += `   > ${result.snippet}\n`;
      }
      if (result.citationCount) {
        context += `   📊 Citeringar: ${result.citationCount}\n`;
      }
      if (result.authors) {
        context += `   ✍️ ${result.authors}\n`;
      }
      context += '\n';
    });
  }
  
  context += '---\n\n';
  context += '⚠️ *Använd dessa källor för att verifiera påståenden. Citera med [nummer] om du hänvisar.*\n\n';
  
  return context;
}
