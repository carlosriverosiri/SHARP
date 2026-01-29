import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';

export const prerender = false;

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * GET /api/kunskapsbas/context?project_id=xxx
 * 
 * Hämtar all kontext från ett Kunskapsbas-projekt för användning i AI Council.
 * Returnerar en formaterad textsträng med projektets innehåll.
 */
export const GET: APIRoute = async ({ request, cookies }) => {
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Supabase ej konfigurerat', context: '' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  if (!arInloggad(cookies)) {
    return new Response(JSON.stringify({ error: 'Ej inloggad', context: '' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const anvandare = await hamtaAnvandare(cookies);
  if (!anvandare) {
    return new Response(JSON.stringify({ error: 'Kunde inte hämta användare', context: '' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('project_id');

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'project_id krävs', context: '' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Hämta projektet
    const { data: project, error: projectError } = await supabase
      .from('kb_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', anvandare.id)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: 'Projektet finns inte', context: '' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Hämta alla items
    const { data: items, error: itemsError } = await supabase
      .from('kb_items')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', anvandare.id)
      .order('category')
      .order('created_at', { ascending: false });

    if (itemsError) {
      throw itemsError;
    }

    // Formatera kontext
    const categoryLabels: Record<string, string> = {
      dokument: 'Dokument',
      litteratur: 'Litteratur',
      ljud: 'Ljudsammanfattningar',
      ai_fragor: 'AI-frågor',
      prompter: 'Prompter',
      radata: 'Rådata'
    };

    let contextParts: string[] = [];
    
    contextParts.push(`# Projekt: ${project.name}`);
    if (project.description) {
      contextParts.push(`\n${project.description}`);
    }
    contextParts.push('');

    // Gruppera items per kategori
    const itemsByCategory: Record<string, typeof items> = {};
    (items || []).forEach(item => {
      if (!itemsByCategory[item.category]) {
        itemsByCategory[item.category] = [];
      }
      itemsByCategory[item.category].push(item);
    });

    // Bygg kontext per kategori
    for (const [category, categoryItems] of Object.entries(itemsByCategory)) {
      if (categoryItems.length === 0) continue;
      
      contextParts.push(`## ${categoryLabels[category] || category}`);
      contextParts.push('');
      
      categoryItems.forEach(item => {
        contextParts.push(`### ${item.title}`);
        if (item.content) {
          contextParts.push(item.content);
        }
        if (item.summary) {
          contextParts.push(`\n*Sammanfattning: ${item.summary}*`);
        }
        contextParts.push('');
      });
    }

    const context = contextParts.join('\n').trim();
    
    // Beräkna ungefärligt antal tokens (1 token ≈ 4 tecken)
    const estimatedTokens = Math.round(context.length / 4);
    
    // Varning om kontexten är mycket stor (>100k tokens)
    const isLarge = estimatedTokens > 100000;

    return new Response(JSON.stringify({ 
      project: {
        id: project.id,
        name: project.name,
        description: project.description
      },
      itemCount: (items || []).length,
      contextLength: context.length,
      estimatedTokens,
      isLarge,
      context 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error fetching kb context:', err);
    return new Response(JSON.stringify({ error: 'Kunde inte hämta kontext', context: '' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
