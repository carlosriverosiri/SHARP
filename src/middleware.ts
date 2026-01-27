/**
 * Middleware för att skydda personalportalen
 * 
 * Skyddar alla /personal/-sidor utom inloggningssidan
 */

import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Skydda alla /personal/-sidor utom inloggningssidan
  if (pathname.startsWith('/personal') && pathname !== '/personal/' && pathname !== '/personal') {
    
    try {
      // Dynamisk import för att undvika fel vid uppstart
      const { arInloggad, hamtaAnvandare } = await import('./lib/auth');
      
      // Kontrollera om användaren är inloggad
      const inloggad = await arInloggad(context.cookies);
      
      if (!inloggad) {
        // Inte inloggad - omdirigera till inloggning
        return context.redirect('/personal');
      }
      
      // Hämta användarinfo och lägg till i context.locals
      const anvandare = await hamtaAnvandare(context.cookies);
      if (anvandare) {
        context.locals.user = anvandare;
      }
    } catch (error) {
      console.error('Middleware error:', error);
      // Vid fel, omdirigera till inloggning
      return context.redirect('/personal');
    }
  }

  return next();
});
