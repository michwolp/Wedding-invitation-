// Localized link-preview (Open Graph) metadata.
// Link-preview crawlers (WhatsApp, Telegram, iMessage…) don't run JS, so the
// static OG tags in index.html are always Hebrew. For guest links (?g=CODE)
// the middleware serves crawlers a tiny HTML page with tags in the guest's
// language instead. Real visitors never see this — they get the normal page.

export const OG_META = {
  he: {
    title: 'מיכל ♥ דביר — 16.10.26',
    description: 'מתרגשים להזמין אתכם לחתונה שלנו · כרמי יוסף',
  },
  en: {
    title: 'Michal ♥ Dvir — 16.10.26',
    description: "We're excited to invite you to our wedding · Karmei Yosef",
  },
  ru: {
    title: 'Михаль ♥ Двир — 16.10.26',
    description: 'Мы рады пригласить вас на нашу свадьбу · Кармей Йосеф',
  },
};

export const BOT_PATTERN = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|pinterest|vkshare|applebot/i;

export function isPreviewBot(userAgent) {
  return BOT_PATTERN.test(userAgent || '');
}

export function buildOgHtml(lang, pageUrl, imageUrl) {
  const meta = OG_META[lang] || OG_META.he;
  const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<title>${esc(meta.title)}</title>
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:image" content="${esc(imageUrl)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${esc(pageUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(imageUrl)}">
</head>
<body>${esc(meta.title)}</body>
</html>`;
}
