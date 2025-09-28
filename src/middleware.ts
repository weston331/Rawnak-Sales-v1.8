import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'ar'],
 
  // Used when no locale matches
  defaultLocale: 'en'
});
 
export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  // - … Service Worker files (sw.js, workbox files)
  // - … PWA icons (icon-*.png, apple-icon.png)
  // - … Static assets (icons/, *.png, *.svg, *.js from root)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sw.js|workbox|swe-worker|fallback|icon-.*\\.png|icon\\.svg|apple-icon\\.png|manifest\\.json|icons/).*)']
};
