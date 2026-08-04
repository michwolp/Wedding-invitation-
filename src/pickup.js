// Pickup / shuttle selection model.
//
// Stored as a comma-joined set of tokens so it stays backward-compatible with
// the original single-value scheme. The historical values map 1:1:
//   ''            → no shuttle
//   'tlv_after'   → Tel Aviv, return AFTER the after-party  (was "staying")
//   'tlv_noafter' → Tel Aviv, return BEFORE the after-party (was "leaving early")
// New combos simply add a '<city>_to' token when the guest also wants a ride
// TO the wedding, e.g. 'tlv_to,tlv_after'.

export const CITIES = ['tlv', 'rhv'];
export const RETURNS = ['after', 'noafter']; // after = stay to end, noafter = leave before after-party

// every token the API / form may legitimately store
export const PICKUP_TOKENS = [
  ...CITIES.map(c => `${c}_to`),
  ...CITIES.flatMap(c => RETURNS.map(r => `${c}_${r}`)),
];

// decode a stored string into { city, to, ret }
//   city: '' | 'tlv' | 'rhv'
//   to:   boolean (needs a ride to the wedding)
//   ret:  '' | 'after' | 'noafter'
export function parsePickup(value) {
  const out = { city: '', to: false, ret: '' };
  if (!value || typeof value !== 'string') return out;
  for (const raw of value.split(',')) {
    const token = raw.trim();
    if (!token) continue;
    const idx = token.indexOf('_');
    if (idx < 0) continue;
    const city = token.slice(0, idx);
    const leg = token.slice(idx + 1);
    if (!CITIES.includes(city)) continue;
    // first city wins; ignore tokens from a different city (shouldn't happen)
    if (!out.city) out.city = city;
    if (city !== out.city) continue;
    if (leg === 'to') out.to = true;
    else if (RETURNS.includes(leg)) out.ret = leg;
  }
  return out;
}

// encode { city, to, ret } back into the stored string. Returns '' when no city.
export function encodePickup({ city, to, ret }) {
  if (!CITIES.includes(city)) return '';
  const tokens = [];
  if (to) tokens.push(`${city}_to`);
  if (RETURNS.includes(ret)) tokens.push(`${city}_${ret}`);
  return tokens.join(',');
}

// server-side sanitizer: keep only valid, single-city, deduped tokens.
// Anything malformed collapses to ''.
export function sanitizePickup(value) {
  return encodePickup(parsePickup(value));
}
