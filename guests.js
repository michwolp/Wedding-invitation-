// ---------- guest registry ----------
// Each guest gets a short code used in the invite link:  ?g=CODE
// e.g.  https://wedding-michwolp.vercel.app/?g=a1
//
// Fields:
//   name  – how the guest is greeted and what pre-fills the RSVP name field
//   phone – pre-fills the RSVP phone field (any format; digits are what matter)
//   lang  – default language the site opens in: 'he' | 'en' | 'ru'
//   form  – who the invite is addressed to, controls Hebrew grammar:
//             'm'      → one man    (מגיע?  נשמח לראותך)
//             'f'      → one woman  (מגיעה? נשמח לראותך)
//             'plural' → a group / couple / family (מגיעים? נשמח לראותכם)
//           Defaults to 'plural' if omitted. Only affects Hebrew wording.
//
// To add a guest, copy a line and give it a unique code. Keep codes short and
// hard to guess-by-counting (mix letters + digits) so links don't overlap.

window.GUESTS = {
  // code:            { name,               phone,          lang,  form }
  OfirLevin:        { name: 'אופיר',           phone: '0546644905', lang: 'he', form: 'f' },
  ViktoriaSharay:   { name: 'Viktoria Sharay', phone: '0504247004', lang: 'ru', form: 'f' },
  DvirSasson:       { name: 'דביר',            phone: '0502566643', lang: 'he', form: 'm' },
  DanKedmi:         { name: 'דןדן',            phone: '0509878804', lang: 'he', form: 'm' },
  LiorMandelboim:   { name: 'ליאורי',          phone: '0546213030', lang: 'he', form: 'f' },

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
    form: undefined,
  };
};
