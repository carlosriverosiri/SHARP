import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';

export const prerender = false;

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * GET /api/ai-council/kb-context?projectId=xxx
 * 
 * Hamtar Kunskapsbas-innehall for ett AI Council-projekt.
 * Returnerar all content fran kopplade kb_items formaterat som kontext.
 */
export const GET: APIRoute = async ({ request, cookies }) => {
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Supabase ej konfigurerat', context: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Check auth
  if (!arInloggad(cookies)) {
    return new Response(JSON.stringify({ error: 'Ej inloggad', context: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const anvandare = await hamtaAnvandare(cookies);
  if (!anvandare) {
    return new Response(JSON.stringify({ error: 'Kunde inte hamta anvandare', context: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');

  if (!projectId) {
    return new Response(JSON.stringify({ error: 'projectId saknas', context: null }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Hamta AI Council-projekt med KB-koppling
    const { data: project, error: projectError } = await supabase
      .from('ai_council_projects')
      .select('id, name, kb_project_id, auto_include_kb')
      .eq('id', projectId)
      .eq('user_id', anvandare.id)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: 'Projekt hittades inte', context: null }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Om ingen KB-koppling eller auto_include_kb ar false
    if (!project.kb_project_id || !project.auto_include_kb) {
      return new Response(JSON.stringify({ 
        context: null,
        kbProjectId: project.kb_project_id,
        autoInclude: project.auto_include_kb,
        message: 'Ingen aktiv KB-koppling'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Hamta KB-projekt info
    const { data: kbProject } = await supabase
      .from('kb_projects')
      .select('id, name, icon')
      .eq('id', project.kb_project_id)
      .single();

    // Hamta alla kb_items for projektet
    const { data: items, error: itemsError } = await supabase
      .from('kb_items')
      .select('id, title, content, summary, category, created_at')
      .eq('project_id', project.kb_project_id)
      .order('category')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (itemsError) throw itemsError;

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ 
        context: null,
        kbProject: kbProject,
        itemCount: 0,
        tokens: 0,
        message: 'KB-projektet har inga dokument'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Formatera som kontext - gruppera per kategori
    const categoryLabels: Record<string, string> = {
      'dokument': 'Dokument',
      'litteratur': 'Litteratur & Referenser',
      'ljud': 'Transkriptioner',
      'ai_fragor': 'Tidigare AI-sessioner',
      'prompter': 'Sparade prompter',
      'radata': 'Ovrigt material'
    };

    // Gruppera items per kategori
    const grouped: Record<string, typeof items> = {};
    for (const item of items) {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    }

    // Bygg kontext-strang
    let contextParts: string[] = [];
    contextParts.push('<!-- KUNSKAPSBAS KONTEXT -->');
    contextParts.push('Foljande material kommer fran din kunskapsbas:');
    contextParts.push('');

    for (const [category, categoryItems] of Object.entries(grouped)) {
      contextParts.push('## ' + (categoryLabels[category] || category));
      contextParts.push('');
      
      for (const item of categoryItems) {
        contextParts.push('### ' + item.title);
        if (item.summary) {
          contextParts.push('*Sammanfattning: ' + item.summary + '*');
          contextParts.push('');
        }
        if (item.content) {
          contextParts.push(item.content);
        }
        contextParts.push('');
        contextParts.push('---');
        contextParts.push('');
      }
    }

    contextParts.push('<!-- SLUT KUNSKAPSBAS KONTEXT -->');

    const context = contextParts.join('\n');
    
    // Uppskatta tokens (~4 tecken per token)
    const tokens = Math.ceil(context.length / 4);

    return new Response(JSON.stringify({ 
      context,
      kbProject: kbProject,
      itemCount: items.length,
      tokens,
      categories: Object.keys(grouped)
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error fetching KB context:', err);
    return new Response(JSON.stringify({ error: 'Kunde inte hamta KB-kontext', context: null }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * GET /api/ai-council/kb-context?listKbProjects=true
 * 
 * Listar alla KB-projekt for anvandaren (for dropdown-val)
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Supabase ej konfigurerat' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  if (!arInloggad(cookies)) {
    return new Response(JSON.stringify({ error: 'Ej inloggad' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const anvandare = await hamtaAnvandare(cookies);
  if (!anvandare) {
    return new Response(JSON.stringify({ error: 'Kunde inte hamta anvandare' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const body = await request.json();
  const { action, projectId, kbProjectId, autoInclude } = body;

  try {
    if (action === 'listKbProjects') {
      // Lista alla KB-projekt med item-count och token-uppskattning
      const { data: kbProjects, error } = await supabase
        .from('kb_projects')
        .select('id, name, icon, color, description')
        .eq('user_id', anvandare.id)
        .eq('is_archived', false)
        .order('is_pinned', { ascending: false })
        .order('name');

      if (error) throw error;

      // Hamta item-counts for varje projekt
      const projectsWithCounts = await Promise.all((kbProjects || []).map(async (proj) => {
        const { data: items } = await supabase
          .from('kb_items')
          .select('content')
          .eq('project_id', proj.id);
        
        const itemCount = items?.length || 0;
        const totalChars = items?.reduce((sum, item) => sum + (item.content?.length || 0), 0) || 0;
        const tokens = Math.ceil(totalChars / 4);

        return {
          ...proj,
          itemCount,
          tokens
        };
      }));

      return new Response(JSON.stringify({ kbProjects: projectsWithCounts }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'linkKbProject') {
      // Koppla/avkoppla KB-projekt
      const { error } = await supabase
        .from('ai_council_projects')
        .update({ 
          kb_project_id: kbProjectId || null,
          auto_include_kb: autoInclude ?? false
        })
        .eq('id', projectId)
        .eq('user_id', anvandare.id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Okand action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('KB context error:', err);
    return new Response(JSON.stringify({ error: 'Nagot gick fel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};