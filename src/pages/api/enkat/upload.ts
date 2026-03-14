import type { APIRoute } from 'astro';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';
import { parseEnkatCsv } from '../../../lib/enkat-csv-parser';

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!await arInloggad(cookies)) {
    return json({ success: false, error: 'Ej inloggad' }, 401);
  }

  const anvandare = await hamtaAnvandare(cookies);
  if (!anvandare) {
    return json({ success: false, error: 'Kunde inte hämta användare' }, 401);
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const globalBookingType = String(formData.get('globalBookingType') || '').trim();

    if (!(file instanceof File)) {
      return json({ success: false, error: 'Ingen fil uppladdad' }, 400);
    }

    if (file.size === 0) {
      return json({ success: false, error: 'Filen är tom' }, 400);
    }

    if (file.size > 5 * 1024 * 1024) {
      return json({ success: false, error: 'Filen är för stor. Max 5 MB tillåts i V1.' }, 400);
    }

    const rawBytes = await file.arrayBuffer();
    let text = new TextDecoder('utf-8').decode(rawBytes);

    if (text.includes('\uFFFD')) {
      text = new TextDecoder('latin1').decode(rawBytes);
    }

    const result = parseEnkatCsv(text, globalBookingType);

    if (result.totalRows > 500) {
      return json({
        success: false,
        error: 'Filen innehåller för många rader. Max 500 rader tillåts i V1.',
        details: { totalRows: result.totalRows }
      }, 400);
    }

    return json({
      success: true,
      data: {
        fileName: file.name,
        uploadedBy: anvandare.email,
        ...result
      }
    });
  } catch (error: any) {
    console.error('Enkät-upload misslyckades:', error);
    return json({
      success: false,
      error: 'Kunde inte läsa eller validera filen.',
      details: { message: error?.message || 'Okänt fel' }
    }, 500);
  }
};
