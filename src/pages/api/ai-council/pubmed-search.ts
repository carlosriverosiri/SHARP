/**
 * API: PubMed Search - Search for scientific articles via NCBI E-utilities
 * 
 * POST /api/ai-council/pubmed-search
 * Body: { query: string, maxResults?: number }
 * 
 * Returns verified PubMed articles with real PMIDs, DOIs, and links
 */

export const prerender = false;

import type { APIRoute } from 'astro';

const NCBI_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  doi?: string;
  abstract?: string;
  pubmedUrl: string;
}

interface SearchResult {
  articles: PubMedArticle[];
  totalCount: number;
  query: string;
  searchDuration: number;
}

// Search PubMed and return PMIDs
async function searchPubMed(query: string, maxResults: number = 10): Promise<string[]> {
  const params = new URLSearchParams({
    db: 'pubmed',
    term: query,
    retmax: maxResults.toString(),
    retmode: 'json',
    sort: 'relevance'
  });
  
  const response = await fetch(`${NCBI_BASE}/esearch.fcgi?${params}`);
  const data = await response.json();
  
  return data.esearchresult?.idlist || [];
}

// Fetch article details by PMIDs
async function fetchArticleDetails(pmids: string[]): Promise<PubMedArticle[]> {
  if (pmids.length === 0) return [];
  
  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'xml',
    rettype: 'abstract'
  });
  
  const response = await fetch(`${NCBI_BASE}/efetch.fcgi?${params}`);
  const xml = await response.text();
  
  // Parse XML response
  const articles: PubMedArticle[] = [];
  
  // Simple XML parsing for PubMed articles
  const articleMatches = xml.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) || [];
  
  for (const articleXml of articleMatches) {
    try {
      // Extract PMID
      const pmidMatch = articleXml.match(/<PMID[^>]*>(\d+)<\/PMID>/);
      const pmid = pmidMatch ? pmidMatch[1] : '';
      
      // Extract title
      const titleMatch = articleXml.match(/<ArticleTitle>([^<]+)<\/ArticleTitle>/);
      const title = titleMatch ? decodeXmlEntities(titleMatch[1]) : 'No title';
      
      // Extract authors (first 3 + et al)
      const authorMatches = articleXml.match(/<LastName>([^<]+)<\/LastName>/g) || [];
      const authorNames = authorMatches.slice(0, 3).map(m => m.replace(/<\/?LastName>/g, ''));
      const authors = authorNames.length > 0 
        ? authorNames.join(', ') + (authorMatches.length > 3 ? ' et al.' : '')
        : 'Unknown authors';
      
      // Extract journal
      const journalMatch = articleXml.match(/<Title>([^<]+)<\/Title>/);
      const journal = journalMatch ? decodeXmlEntities(journalMatch[1]) : '';
      
      // Extract year
      const yearMatch = articleXml.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/);
      const year = yearMatch ? yearMatch[1] : '';
      
      // Extract DOI
      const doiMatch = articleXml.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/);
      const doi = doiMatch ? doiMatch[1] : undefined;
      
      // Extract abstract (truncated)
      const abstractMatch = articleXml.match(/<AbstractText[^>]*>([^<]+)<\/AbstractText>/);
      const abstract = abstractMatch 
        ? decodeXmlEntities(abstractMatch[1]).substring(0, 500) + (abstractMatch[1].length > 500 ? '...' : '')
        : undefined;
      
      if (pmid) {
        articles.push({
          pmid,
          title,
          authors,
          journal,
          year,
          doi,
          abstract,
          pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
        });
      }
    } catch (e) {
      console.error('Error parsing article:', e);
    }
  }
  
  return articles;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { query, maxResults = 10 } = body;
    
    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'Query krävs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Search for PMIDs
    const pmids = await searchPubMed(query, Math.min(maxResults, 20));
    
    // Fetch article details
    const articles = await fetchArticleDetails(pmids);
    
    const result: SearchResult = {
      articles,
      totalCount: articles.length,
      query,
      searchDuration: Date.now() - startTime
    };
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error: any) {
    console.error('PubMed search error:', error);
    return new Response(JSON.stringify({ 
      error: 'Sökningen misslyckades: ' + error.message,
      articles: [],
      totalCount: 0
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Also support GET for simple testing
export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q');
  
  if (!query) {
    return new Response(JSON.stringify({ 
      error: 'Ange sökterm med ?q=din+sökning',
      example: '/api/ai-council/pubmed-search?q=rotator+cuff+repair+return+to+sport'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  const startTime = Date.now();
  const pmids = await searchPubMed(query, 5);
  const articles = await fetchArticleDetails(pmids);
  
  return new Response(JSON.stringify({
    articles,
    totalCount: articles.length,
    query,
    searchDuration: Date.now() - startTime
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
