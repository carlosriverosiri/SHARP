import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';

export const prerender = false;

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

// GET - List all projects for user
export const GET: APIRoute = async ({ cookies }) => {
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Supabase ej konfigurerat', projects: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Check auth
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
    const { data: projects, error } = await supabase
      .from('ai_council_projects')
      .select('*')
      .eq('user_id', anvandare.id)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return new Response(JSON.stringify({ projects: projects || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error fetching projects:', err);
    return new Response(JSON.stringify({ error: 'Kunde inte hämta projekt', projects: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Create new project
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Supabase ej konfigurerat' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Check auth
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
    const { name, description, context, color, icon } = body;

    if (!name) {
      return new Response(JSON.stringify({ error: 'Projektnamn krävs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: project, error } = await supabase
      .from('ai_council_projects')
      .insert({
        user_id: anvandare.id,
        name,
        description: description || null,
        context: context || null,
        color: color || '#2563eb',
        icon: icon || '📁'
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ project }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error creating project:', err);
    return new Response(JSON.stringify({ error: 'Kunde inte skapa projekt' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Update project
export const PUT: APIRoute = async ({ request, cookies }) => {
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Supabase ej konfigurerat' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Check auth
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
    const { id, name, description, context, color, icon, is_pinned } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Projekt-ID krävs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (context !== undefined) updateData.context = context;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned;

    const { data: project, error } = await supabase
      .from('ai_council_projects')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', anvandare.id) // Security: only update own projects
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ project }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error updating project:', err);
    return new Response(JSON.stringify({ error: 'Kunde inte uppdatera projekt' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Delete project
export const DELETE: APIRoute = async ({ request, cookies }) => {
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Supabase ej konfigurerat' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Check auth
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

    const { error } = await supabase
      .from('ai_council_projects')
      .delete()
      .eq('id', id)
      .eq('user_id', anvandare.id); // Security: only delete own projects

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error deleting project:', err);
    return new Response(JSON.stringify({ error: 'Kunde inte ta bort projekt' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
