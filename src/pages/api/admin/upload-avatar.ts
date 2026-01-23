/**
 * API: Ladda upp profilbild
 * POST /api/admin/upload-avatar
 * 
 * Laddar upp en bild till Supabase Storage och uppdaterar profiles.avatar_url
 */

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import { hamtaAnvandare } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Kontrollera inloggning
    const anvandare = await hamtaAnvandare(cookies);
    if (!anvandare) {
      return new Response(JSON.stringify({ error: 'Ej inloggad' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formData = await request.formData();
    const userId = formData.get('userId')?.toString();
    const file = formData.get('avatar') as File;

    if (!userId || !file) {
      return new Response(JSON.stringify({ error: 'userId och avatar krävs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validera filtyp
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'Endast JPG, PNG, WebP och GIF tillåtna' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validera storlek (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Bilden får vara max 2 MB' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Skapa filnamn
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${userId}.${ext}`;

    // Konvertera File till ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Ladda upp till Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true // Ersätt om filen redan finns
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: `Uppladdning misslyckades: ${uploadError.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Hämta publik URL
    const { data: urlData } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;

    // Uppdatera eller skapa profil
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      // Uppdatera befintlig profil
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId);

      if (updateError) {
        console.error('Update error:', updateError);
        return new Response(JSON.stringify({ error: 'Kunde inte uppdatera profil' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      // Skapa ny profil
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({ id: userId, avatar_url: avatarUrl });

      if (insertError) {
        console.error('Insert error:', insertError);
        return new Response(JSON.stringify({ error: 'Kunde inte skapa profil' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      avatarUrl,
      message: 'Profilbild uppladdad!'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    return new Response(JSON.stringify({ error: 'Ett oväntat fel uppstod' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
