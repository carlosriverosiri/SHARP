import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';

export const prerender = false;

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

const VALID_CATEGORIES = ['dokument', 'litteratur', 'ljud', 'ai_fragor', 'prompter', 'radata'];

// GET - Hämta items (med filter)
export const GET: APIRoute = async ({ request, cookies }) => {
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Supabase ej konfigurerat', items: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  if (!arInloggad(cookies)) {
    return new Response(JSON.stringify({ error: 'Ej inloggad', items: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const anvandare = await hamtaAnvandare(cookies);
  if (!anvandare) {
    return new Response(JSON.stringify({ error: 'Kunde inte hämta användare', items: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('project_id');
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    const itemId = url.searchParams.get('id');

    // Hämta enskilt item
    if (itemId) {
      const { data: item, error } = await supabase
        .from('kb_items')
        .select('*')
        .eq('id', itemId)
        .eq('user_id', anvandare.id)
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ item }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Bygg query
    let query = supabase
      .from('kb_items')
      .select('*')
      .eq('user_id', anvandare.id);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (category && VALID_CATEGORIES.includes(category)) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    query = query
      .order('is_pinned', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('updated_at', { ascending: false });

    const { data: items, error } = await query;

    if (error) throw error;

    return new Response(JSON.stringify({ items: items || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error fetching kb_items:', err);
    return new Response(JSON.stringify({ error: 'Kunde inte hämta items', items: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Skapa nytt item
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
    return new Response(JSON.stringify({ error: 'Kunde inte hämta användare' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { project_id, category, title, content, summary, metadata, tags } = body;

    if (!project_id) {
      return new Response(JSON.stringify({ error: 'Projekt-ID krävs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return new Response(JSON.stringify({ error: 'Ogiltig kategori' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!title) {
      return new Response(JSON.stringify({ error: 'Titel krävs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verifiera att projektet tillhör användaren
    const { data: project } = await supabase
      .from('kb_projects')
      .select('id')
      .eq('id', project_id)
      .eq('user_id', anvandare.id)
      .single();

    if (!project) {
      return new Response(JSON.stringify({ error: 'Projektet finns inte' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: item, error } = await supabase
      .from('kb_items')
      .insert({
        user_id: anvandare.id,
        project_id,
        category,
        title,
        content: content || null,
        summary: summary || null,
        metadata: metadata || {},
        tags: tags || []
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ item }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error creating kb_item:', err);
    return new Response(JSON.stringify({ error: 'Kunde inte skapa item' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Uppdatera item
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
    const { id, title, content, summary, metadata, tags, is_pinned, sort_order, project_id, category } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Item-ID krävs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (summary !== undefined) updateData.summary = summary;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (tags !== undefined) updateData.tags = tags;
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (project_id !== undefined) updateData.project_id = project_id;
    if (category !== undefined && VALID_CATEGORIES.includes(category)) {
      updateData.category = category;
    }

    const { data: item, error } = await supabase
      .from('kb_items')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', anvandare.id)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ item }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error updating kb_item:', err);
    return new Response(JSON.stringify({ error: 'Kunde inte uppdatera item' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Ta bort item
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
      return new Response(JSON.stringify({ error: 'Item-ID krävs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { error } = await supabase
      .from('kb_items')
      .delete()
      .eq('id', id)
      .eq('user_id', anvandare.id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error deleting kb_item:', err);
    return new Response(JSON.stringify({ error: 'Kunde inte ta bort item' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
