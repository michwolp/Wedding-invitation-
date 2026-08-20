// /api/rsvp-list — read-only RSVP roster for the private dashboard.
// GET /api/rsvp-list?key=<SUMMARY_KEY>
//   → { counts, accepted[], declined[], noResponse[], orphans[] }
//
// READ-ONLY: performs SELECT queries against the rsvps and whatsapp_messages
// tables. It never inserts, updates, upserts, or deletes. Gated by SUMMARY_KEY
// (same as /api/rsvp-summary); if SUMMARY_KEY is unset the endpoint returns 404.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GUESTS } from '../src/guests.js';
import { parsePickup } from '../src/pickup.js';

// Mirror scripts/send.js toE164(): local 05x → 9725x, keep + form as digits.
function toE164(phone) {
  const p = String(phone).trim().replace(/[^0-9+]/g, '');
  if (p.startsWith('+')) return p.slice(1);
  if (p.startsWith('0')) return '972' + p.slice(1);
  return p;
}

// Parse the "// --- Category ---" section headers out of the guests source so
// each guest can be grouped. Best-effort: if the source can't be read at
// runtime, everyone falls back to 'Other' and the dashboard still works.
// Manual per-guest overrides (keyed by guest code) for people whose section
// in guests.js doesn't reflect their real group/category. Each sets the
// top-level group and the category label shown under it.
const OVERRIDES = {
  // → Work (עבודה)
  VladimirKofman: { group: 'עבודה', category: "Michal's work friends" },
  MayAmazon:      { group: 'עבודה', category: "Michal's work friends" },
  NadavShoham:    { group: 'עבודה', category: "Michal's work friends" },
  MayaSharon:     { group: 'עבודה', category: "Michal's work friends" },
  OmriAmit:       { group: 'עבודה', category: "Michal's work friends" },
  Anton:          { group: 'עבודה', category: "Michal's work friends" },
  AmirZevin:      { group: 'עבודה', category: "Dvir's work" },
  TzviStrauss:    { group: 'עבודה', category: "Dvir's work" },
  RomMaltser:     { group: 'עבודה', category: "Dvir's work" },
  // → Friends (חברים)
  DanielObo:      { group: 'חברים', category: 'Friends' },
  // → Family (משפחה)
  GalinaKasharovski: { group: 'משפחה', category: "Michal's family" },
  RonWolpert:        { group: 'משפחה', category: "Michal's family" },
  SigalSasson:       { group: 'משפחה', category: "Dvir's family" },
  SigalSassonAlt:    { group: 'משפחה', category: "Dvir's family" },
  ItaySasson:        { group: 'משפחה', category: "Dvir's family" },
};

// Roll a fine-grained category header up into a top-level group so the
// dashboard can show משפחה / חברים / עבודה / אחר. Keyword-based; unknown
// headers fall into 'אחר' (Other).
function groupOf(cat) {
  const c = String(cat || '').toLowerCase();
  if (/work/.test(c)) return 'עבודה';                 // Work — check before "friends"
  if (/family|parents/.test(c)) return 'משפחה';       // Family
  if (/friend|circle/.test(c)) return 'חברים';        // Friends
  return 'אחר';                                       // Other / uncategorised
}

function categoryMap() {
  const map = {};
  try {
    const src = readFileSync(fileURLToPath(new URL('../src/guests.js', import.meta.url)), 'utf8');
    let cur = 'Other';
    for (const line of src.split('\n')) {
      const h = line.match(/^\s*\/\/\s*---\s*(.+?)\s*---/);
      if (h) {
        // Drop a trailing "(…)" qualifier so language / date variants merge
        // e.g. "Michal's family (Hebrew-speaking)" → "Michal's family".
        cur = h[1].replace(/\s*\([^)]*\)\s*$/, '').trim();
        continue;
      }
      const g = line.match(/^\s*([A-Za-z0-9]+):\s*\{/);
      if (g && GUESTS[g[1]]) map[g[1]] = cur;
    }
  } catch {
    // ignore — fall back to 'Other'
  }
  return map;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const envOk = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY;
  if (!envOk) return res.status(500).json({ error: 'server not configured' });

  const gate = process.env.SUMMARY_KEY;
  if (!gate || req.query.key !== gate) return res.status(404).json({ error: 'not found' });

  const headers = {
    apikey: process.env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
  };
  const base = process.env.SUPABASE_URL;

  let rows, messages;
  try {
    // Read-only SELECTs. RSVP rows + inbound WhatsApp replies.
    const [rRes, mRes] = await Promise.all([
      fetch(`${base}/rest/v1/rsvps`
        + `?select=guest_id,name,display_name,phone,attending,adults,children,pickup,notes,updated_at`, { headers }),
      fetch(`${base}/rest/v1/whatsapp_messages`
        + `?select=from_phone,from_name,text,received_at&order=received_at.desc&limit=500`, { headers }),
    ]);
    if (!rRes.ok) return res.status(502).json({ error: 'db error' });
    rows = await rRes.json();
    messages = mRes.ok ? await mRes.json() : [];
  } catch (err) {
    return res.status(502).json({ error: 'db unreachable' });
  }

  return res.status(200).json(buildRoster(rows, messages));
}

// Pure builder — exported for unit testing without a DB.
export function buildRoster(rows, messages = []) {
  const cat = categoryMap();

  // Index the RSVP rows by every key they could be found under.
  const byKey = new Map();
  for (const r of rows) {
    if (r.guest_id) byKey.set(r.guest_id, r);
    const digits = String(r.phone || '').replace(/\D/g, '');
    if (digits) {
      byKey.set('phone:' + digits, r);
      byKey.set('phone:' + toE164(digits), r);
    }
  }

  // Index inbound WhatsApp replies by E.164 phone (most recent first already).
  const replyByPhone = new Map();
  for (const m of messages) {
    const p = String(m.from_phone || '').replace(/\D/g, '');
    if (p && !replyByPhone.has(p)) {
      replyByPhone.set(p, { text: (m.text || '').trim(), at: m.received_at || null });
    }
  }

  const matchedRowKeys = new Set();
  const accepted = [], declined = [], noResponse = [];

  for (const [code, g] of Object.entries(GUESTS)) {
    if (/^test/i.test(code)) continue;
    const e164 = toE164(g.phone);
    const local = g.phone.startsWith('+972') ? '0' + g.phone.replace(/\D/g, '').slice(3)
                : g.phone.startsWith('0') ? g.phone.replace(/\D/g, '')
                : g.phone.replace(/\D/g, '');
    const candidates = [code, 'phone:' + e164, 'phone:' + local, 'phone:' + g.phone.replace(/\D/g, '')];

    let row = null;
    for (const k of candidates) { if (byKey.has(k)) { row = byKey.get(k); break; } }

    const reply = replyByPhone.get(e164) || replyByPhone.get(g.phone.replace(/\D/g, '')) || null;
    const ov = OVERRIDES[code];
    let category = ov ? ov.category : (cat[code] || 'Other');
    const group = ov ? ov.group : groupOf(category); // top-level bucket: משפחה / חברים / עבודה / אחר
    // Inside the family group, label each guest by side: Michal / Dvir.
    if (group === 'משפחה') category = /dvir/i.test(category) ? 'Dvir' : 'Michal';
    // Friends is one bucket — merge "Michal's wider circle" into "Friends".
    else if (group === 'חברים') category = 'Friends';
    const base = {
      code, name: g.name, fullName: g.fullName || g.name, phone: g.phone,
      category, group,
      reply, // WhatsApp reply text (or null) — "who replied and what"
    };

    if (!row) { noResponse.push(base); continue; }
    matchedRowKeys.add(row.guest_id);
    const { city, to, ret } = parsePickup(row.pickup);
    const entry = {
      ...base,
      adults: Number(row.adults) || 0,
      children: Number(row.children) || 0,
      heads: (Number(row.adults) || 0) + (Number(row.children) || 0),
      shuttle: city ? { city, to: !!to, ret } : null,
      notes: (row.notes || '').trim(),
      updatedAt: row.updated_at || null,
    };
    if (row.attending === 'yes') accepted.push(entry);
    else declined.push(entry);
  }

  // Rows that matched no guest in the current list (e.g. submitted under a
  // number/name we don't have) — surfaced so nothing is silently dropped.
  const orphans = rows
    .filter((r) => !matchedRowKeys.has(r.guest_id))
    .map((r) => ({
      guest_id: r.guest_id,
      display_name: (r.display_name || r.name || '').trim(),
      phone: r.phone || '',
      attending: r.attending,
      adults: Number(r.adults) || 0,
      children: Number(r.children) || 0,
      notes: (r.notes || '').trim(),
    }));

  const heads = accepted.reduce((n, e) => n + e.heads, 0);
  const adults = accepted.reduce((n, e) => n + e.adults, 0);
  const children = accepted.reduce((n, e) => n + e.children, 0);

  const totalGuests = accepted.length + declined.length + noResponse.length;
  const pct = (n) => (totalGuests ? Math.round((n / totalGuests) * 1000) / 10 : 0);

  // Shuttle totals — aggregate over accepted guests (heads, not entries), split
  // by pickup city and by return leg. `to` = wants a ride TO the wedding.
  const shuttle = {
    to: 0,                                   // heads needing a ride to the wedding
    retAfter: 0,                             // heads returning after the after-party
    retNoAfter: 0,                           // heads returning before the after-party
    byCity: {},                              // { tlv: {to,retAfter,retNoAfter,heads}, ... }
    totalHeads: 0,                           // heads using the shuttle in any leg
  };
  for (const e of accepted) {
    if (!e.shuttle) continue;
    const { city, to, ret } = e.shuttle;
    const h = e.heads;
    shuttle.totalHeads += h;
    if (to) shuttle.to += h;
    if (ret === 'after') shuttle.retAfter += h;
    else if (ret === 'noafter') shuttle.retNoAfter += h;
    if (city) {
      const c = shuttle.byCity[city] || (shuttle.byCity[city] = { to: 0, retAfter: 0, retNoAfter: 0, heads: 0 });
      c.heads += h;
      if (to) c.to += h;
      if (ret === 'after') c.retAfter += h;
      else if (ret === 'noafter') c.retNoAfter += h;
    }
  }

  return {
    counts: {
      totalGuests,
      responded: accepted.length + declined.length,
      yes: accepted.length,
      no: declined.length,
      noResponse: noResponse.length,
      heads, adults, children,
      orphans: orphans.length,
      pct: {
        yes: pct(accepted.length),
        no: pct(declined.length),
        noResponse: pct(noResponse.length),
        responded: pct(accepted.length + declined.length),
      },
      shuttle,
    },
    accepted,
    declined,
    noResponse,
    orphans,
  };
}
