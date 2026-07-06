// ---------- guest registry ----------
// Each guest gets a short code used in the invite link:  ?g=CODE
// e.g.  https://wedding-michwolp.vercel.app/?g=a1
//
// Fields:
//   name  – how the guest is greeted and what pre-fills the RSVP name field
//   phone – pre-fills the RSVP phone field (any format; digits are what matter)
//   lang  – default language the site opens in: 'he' | 'en' | 'ru'
//
// To add a guest, copy a line and give it a unique code. Keep codes short and
// hard to guess-by-counting (mix letters + digits) so links don't overlap.

window.GUESTS = {
  // code:   { name,                phone,           lang }
  a1:   { name: 'ישראל ישראלי',   phone: '0501234567', lang: 'he' },
  a2:   { name: 'Anna Ivanova',    phone: '0521111111', lang: 'ru' },
  a3:   { name: 'John Smith',      phone: '0539876543', lang: 'en' },
};

// Look up a guest from the current URL.
// Priority:
//   1) ?g=CODE            → full guest record from the registry above
//   2) ?to=NAME&lang=..   → legacy links (name/lang straight from the URL)
// Returns { code, name, phone, lang } with any field possibly undefined.
window.getGuest = function getGuest(search) {
  const params = new URLSearchParams(search != null ? search : location.search);

  const code = params.get('g');
  if (code && window.GUESTS[code]) {
    return { code, ...window.GUESTS[code] };
  }

  // legacy / manual links
  const legacyLang = params.get('lang');
  return {
    code: params.get('id') || null,
    name: params.get('to') || undefined,
    phone: undefined,
    lang: ['he', 'en', 'ru'].includes(legacyLang) ? legacyLang : undefined,
  };
};
