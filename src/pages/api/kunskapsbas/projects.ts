import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';

export const prerender = false;

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

// Kategorier med metadata
const CATEGORIES = {
  dokument: { icon: '📄', label: 'Dokument' },
  litteratur: { icon: '📚', label: 'Litteratur' },
  ljud: { icon: '🎙️', label: 'Ljudsammanfattningar' },
  ai_fragor: { icon: '🤖', label: 'AI-frågor' },
  prompter: { icon: '💡', label: 'Prompter' },
  radata: { icon: '📦', label: 'Rådata' }
};

// GET - Hämta alla projekt med antal items per kategori
export const GET: APIRoute = async ({ cookies }) => {
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Supabase ej konfigurerat', projects: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  if (!arInloggad(cookies)) {
    return new Response(JSON.stringify({ error: 'Ej inloggad', projects: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const anvandare = await hamtaAnvandare(cookies);
  if (!anvandare) {
    return new Response(JSON.stringify({ error: 'Kunde inte hämta användare', projects: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Hämta projekt
    const { data: projects, error: projectsError } = await supabase
      .from('kb_projects')
      .select('*')
      .eq('user_id', anvandare.id)
      .eq('is_archived', false)
      .order('is_pinned', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (projectsError) throw projectsError;

    // Hämta antal items per projekt och kategori
    const { data: itemCounts, error: countsError } = await supabase
      .from('kb_items')
      .select('project_id, category')
      .eq('user_id', anvandare.id);

    if (countsError) throw countsError;

    // Räkna items per projekt och kategori
    const countMap: Record<string, Record<string, number>> = {};
    (itemCounts || []).forEach((item: { project_id: string; category: string }) => {
      if (!countMap[item.project_id]) {
        countMap[item.project_id] = {};
      }
      countMap[item.project_id][item.category] = (countMap[item.project_id][item.category] || 0) + 1;
    });

    // Lägg till kategorier med antal på varje projekt
    const projectsWithCategories = (projects || []).map(project => ({
      ...project,
      categories: Object.entries(CATEGORIES).map(([key, meta]) => ({
        key,
        ...meta,
        count: countMap[project.id]?.[key] || 0
      }))
    }));

    return new Response(JSON.stringify({ 
      projects: projectsWithCategories,
      categoryMeta: CATEGORIES 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error fetching kb_projects:', err);
    return new Response(JSON.stringify({ error: 'Kunde inte hämta projekt', projects: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Skapa nytt projekt
export const POST: APIRoute = async ({ request, cookies }) => {
  console.log('POST /api/kunskapsbas/projects called');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase not configured');
    return new Response(JSON.stringify({ error: 'Supabase ej konfigurerat' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  if (!arInloggad(cookies)) {
    console.error('User not logged in');
    return new Response(JSON.stringify({ error: 'Ej inloggad' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const anvandare = await hamtaAnvandare(cookies);
  if (!anvandare) {
    console.error('Could not get user');
    return new Response(JSON.stringify({ error: 'Kunde inte hämta användare' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  console.log('User:', anvandare.id);

  try {
    const body = await request.json();
    const { name, description, icon, color } = body;
    console.log('Request body:', { name, description, icon, color });

    if (!name) {
      return new Response(JSON.stringify({ error: 'Projektnamn krävs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Inserting into kb_projects...');
    const { data: project, error } = await supabase
      .from('kb_projects')
      .insert({
        user_id: anvandare.id,
        name,
        description: description || null,
        icon: icon || '📁',
        color: color || '#2563eb'
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    console.log('Project created:', project);

    // Lägg till tomma kategorier
    const projectWithCategories = {
      ...project,
      categories: Object.entries(CATEGORIES).map(([key, meta]) => ({
        key,
        ...meta,
        count: 0
      }))
    };

    return new Response(JSON.stringify({ project: projectWithCategories }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error creating kb_project:', err);
    return new Response(JSON.stringify({ error: 'Kunde inte skapa projekt' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Uppdatera projekt
export const PUT: APIRoute = async ({ request, cookies }) => {
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
    return new Response(JSON.stringify({ error: 'Kunde inte hämta användare' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { id, name, description, icon, color, is_pinned, is_archived, sort_order } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Projekt-ID krävs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned;
    if (is_archived !== undefined) updateData.is_archived = is_archived;
    if (sort_order !== undefined) updateData.sort_order = sort_order;

    const { data: project, error } = await supabase
      .from('kb_projects')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', anvandare.id)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ project }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error updating kb_project:', err);
    return new Response(JSON.stringify({ error: 'Kunde inte uppdatera projekt' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Ta bort projekt
export const DELETE: APIRoute = async ({ request, cookies }) => {
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
    return new Response(JSON.stringify({ error: 'Kunde inte hämta användare' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Projekt-ID krävs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Items tas bort automatiskt via CASCADE
    const { error } = await supabase
      .from('kb_projects')
      .delete()
      .eq('id', id)
      .eq('user_id', anvandare.id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error deleting kb_project:', err);
    return new Response(JSON.stringify({ error: 'Kunde inte ta bort projekt' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
