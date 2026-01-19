/**
 * Middleware för att skydda personalportalen
 * 
 * Skyddar alla /personal/-sidor utom inloggningssidan
 * Gemini: "Detta garanterar att ingen sida under /personal kan nås utan 
 * giltig session, oavsett om man glömt lägga till scriptet på en ny sida."
 */

import { defineMiddleware } from 'astro:middleware';
import { arInloggad, hamtaAnvandare } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Skydda alla /personal/-sidor utom inloggningssidan
  if (pathname.startsWith('/personal') && pathname !== '/personal/' && pathname !== '/personal') {
    
    // Kontrollera om användaren är inloggad
    const inloggad = await arInloggad(context.cookies);
    
    if (!inloggad) {
      // Inte inloggad - omdirigera till inloggning
      return context.redirect('/personal/');
    }
    
    // Hämta användarinfo och lägg till i context.locals
    const anvandare = await hamtaAnvandare(context.cookies);
    if (anvandare) {
      context.locals.user = anvandare;
    }
  }

  return next();
});
