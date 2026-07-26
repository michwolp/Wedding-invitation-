// Vercel Edge Middleware — serves language-matched link previews to bots.
// Real visitors fall through to the static site untouched.
import { GUESTS } from './src/guests.js';
import { isPreviewBot, buildOgHtml } from './src/og.js';

export const config = { matcher: '/' };

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  if (!isPreviewBot(ua)) return; // humans → static page

  const url = new URL(request.url);
  const code = url.searchParams.get('g');
  const lang = (code && GUESTS[code]?.lang) || 'he';

  const imageUrl = `${url.origin}/assets/og-preview.jpg`;
  return new Response(buildOgHtml(lang, url.href, imageUrl), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
