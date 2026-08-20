// src/roster.js — pure roster-building logic for the read-only dashboard.
//
// No I/O here: buildRoster() takes plain data (RSVP rows, WhatsApp messages,
// and a code→category map) and returns the shape the dashboard renders. This
// keeps it fully unit-testable without a DB or filesystem. The HTTP handler in
// api/rsvp-list.js supplies the data and the category map.

import { GUESTS } from './guests.js';
import { parsePickup } from './pickup.js';

// Mirror scripts/send.js toE164(): local 05x → 9725x, keep + form as digits.
export function toE164(phone) {
  const p = String(phone).trim().replace(/[^0-9+]/g, '');
  if (p.startsWith('+')) return p.slice(1);
  if (p.startsWith('0')) return '972' + p.slice(1);
  return p;
}

// Manual per-guest overrides (keyed by guest code) for people whose section in
// guests.js doesn't reflect their real group/category. Each sets the top-level
// group and the category label used to derive the side (מיכל / דביר).
export const OVERRIDES = {
  // → Work (עבודה)
  VladimirKofman: { group: 'עבודה', category: "Michal's work friends" },
  MayAmazon:      { group: 'עבודה', category: "Michal's work friends" },
  NadavShoham:    { group: 'עבודה', category: "Michal's work friends" },
  MayaSharon:     { group: 'עבודה', category: "Michal's work friends" },
  OmriAmit:       { group: 'עבודה', category: "Michal's work friends" },
  Anton:          { group: 'עבודה', category: "Michal's work friends" },
  RotemAmazon:    { group: 'עבודה', category: "Michal's work friends" },
  YoavAmazon:     { group: 'עבודה', category: "Michal's work friends" },
  NoaAlmog:       { group: 'עבודה', category: "Michal's work friends" },
  TalSegal:       { group: 'עבודה', category: "Michal's work friends" },
  ItayAmazon:     { group: 'עבודה', category: "Michal's work friends" },
  MichaelYafe:    { group: 'עבודה', category: "Michal's work friends" },
  AmirZevin:      { group: 'עבודה', category: "Dvir's work" },
  TzviStrauss:    { group: 'עבודה', category: "Dvir's work" },
  RomMaltser:     { group: 'עבודה', category: "Dvir's work" },
  OhadKlein:      { group: 'עבודה', category: "Dvir's work" },
  ItsikLevi:      { group: 'עבודה', category: "Dvir's work" },
  GiladWasserman: { group: 'עבודה', category: "Dvir's work" },
  ChaimRand:      { group: 'עבודה', category: "Dvir's work" },
  YaelWolff:      { group: 'עבודה', category: "Dvir's work" },
  LironGrinstein: { group: 'עבודה', category: "Dvir's work" },
  // → Friends (חברים)
  DanielObo:      { group: 'חברים', category: 'Friends' },
  // → Family (משפחה)
  GalinaKasharovski: { group: 'משפחה', category: "Michal's family" },
  RonWolpert:        { group: 'משפחה', category: "Michal's family" },
  MayaZborovsky:     { group: 'משפחה', category: "Michal's family" },
  SigalSasson:       { group: 'משפחה', category: "Dvir's family" },
  SigalSassonAlt:    { group: 'משפחה', category: "Dvir's family" },
  ItaySasson:        { group: 'משפחה', category: "Dvir's family" },
};

// Roll a fine-grained category header up into a top-level group so the
// dashboard can show משפחה / חברים / עבודה / אחר. Keyword-based; unknown
// headers fall into 'אחר' (Other).
export function groupOf(cat) {
  const c = String(cat || '').toLowerCase();
  if (/work/.test(c)) return 'עבודה';           // Work — check before "friends"
  if (/family|parents/.test(c)) return 'משפחה'; // Family
  if (/friend|circle/.test(c)) return 'חברים';  // Friends
  return 'אחר';                                 // Other / uncategorised
}

// The category label shown under a group. Family and work are split by side
// (מיכל / דביר); friends collapse to a single "Friends" bucket.
export function displayCategory(group, category) {
  if (group === 'משפחה' || group === 'עבודה') return /dvir/i.test(category) ? 'דביר' : 'מיכל';
  if (group === 'חברים') return 'Friends';
  return category;
}

// Index RSVP rows by every key a guest could be found under: guest_id (code or
// phone:<digits>) plus phone digits in raw and E.164 form.
function indexRows(rows) {
  const byKey = new Map();
  for (const r of rows) {
    if (r.guest_id) byKey.set(r.guest_id, r);
    const digits = String(r.phone || '').replace(/\D/g, '');
    if (digits) {
      byKey.set('phone:' + digits, r);
      byKey.set('phone:' + toE164(digits), r);
    }
  }
  return byKey;
}

// Index inbound WhatsApp replies by phone digits, keeping the most recent per
// phone (messages arrive newest-first, so the first seen wins).
function indexReplies(messages) {
  const byPhone = new Map();
  for (const m of messages) {
    const p = String(m.from_phone || '').replace(/\D/g, '');
    if (p && !byPhone.has(p)) {
      byPhone.set(p, { text: (m.text || '').trim(), at: m.received_at || null });
    }
  }
  return byPhone;
}

// All the keys a guest's phone could be stored under, for row lookup.
function phoneKeys(phone) {
  const digits = phone.replace(/\D/g, '');
  const e164 = toE164(phone);
  const local = phone.startsWith('+972') ? '0' + digits.slice(3)
              : phone.startsWith('0') ? digits
              : digits;
  return { e164, digits, keys: [`phone:${e164}`, `phone:${local}`, `phone:${digits}`] };
}

// Aggregate shuttle usage over accepted guests, counting heads (not entries),
// split by pickup city and return leg. `to` = wants a ride TO the wedding.
function computeShuttle(accepted) {
  const shuttle = { to: 0, retAfter: 0, retNoAfter: 0, byCity: {}, totalHeads: 0 };
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
  return shuttle;
}

// The most-recent RSVP submissions across accepted, declined, and orphan rows,
// newest first, capped at `limit`.
function pickRecent(accepted, declined, orphans, limit = 5) {
  return [...accepted, ...declined, ...orphans]
    .filter((e) => e.updatedAt)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, limit)
    .map((e) => ({
      name: e.name || e.display_name || '—',
      fullName: e.fullName || '',
      phone: e.phone || '',
      attending: e.attending,
      heads: e.heads != null ? e.heads : (Number(e.adults) || 0) + (Number(e.children) || 0),
      updatedAt: e.updatedAt,
    }));
}

// Build the full dashboard payload from RSVP rows + WhatsApp messages.
// `catMap` maps guest code → raw category header (from guests.js); absent
// entries fall back to 'Other'. Pure: no I/O, safe to unit-test.
export function buildRoster(rows, messages = [], catMap = {}) {
  const byKey = indexRows(rows);
  const replyByPhone = indexReplies(messages);

  const matchedRowKeys = new Set();
  const accepted = [], declined = [], noResponse = [];

  for (const [code, g] of Object.entries(GUESTS)) {
    if (/^test/i.test(code)) continue;

    const { e164, digits, keys } = phoneKeys(g.phone);
    let row = null;
    for (const k of [code, ...keys]) { if (byKey.has(k)) { row = byKey.get(k); break; } }

    const reply = replyByPhone.get(e164) || replyByPhone.get(digits) || null;
    const ov = OVERRIDES[code];
    const rawCategory = ov ? ov.category : (catMap[code] || 'Other');
    const group = ov ? ov.group : groupOf(rawCategory);
    const category = displayCategory(group, rawCategory);

    const base = {
      code, name: g.name, fullName: g.fullName || g.name, phone: g.phone,
      category, group,
      reply, // WhatsApp reply text (or null) — "who replied and what"
    };

    if (!row) { noResponse.push(base); continue; }
    matchedRowKeys.add(row.guest_id);
    const { city, to, ret } = parsePickup(row.pickup);
    const adults = Number(row.adults) || 0;
    const children = Number(row.children) || 0;
    const entry = {
      ...base,
      adults,
      children,
      heads: adults + children,
      shuttle: city ? { city, to: !!to, ret } : null,
      notes: (row.notes || '').trim(),
      updatedAt: row.updated_at || null,
      attending: row.attending === 'yes' ? 'yes' : 'no',
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
      updatedAt: r.updated_at || null,
    }));

  const recent = pickRecent(accepted, declined, orphans);

  // Every guest note left on an RSVP (accepted, declined, or orphan row).
  const notes = [...accepted, ...declined, ...orphans]
    .filter((e) => (e.notes || '').trim())
    .map((e) => ({
      name: e.name || e.display_name || '—',
      phone: e.phone || '',
      note: (e.notes || '').trim(),
      attending: e.attending,
    }));

  // Every inbound WhatsApp message with text, newest first (as queried).
  const inbox = messages
    .map((m) => ({
      name: (m.from_name || '').trim(),
      phone: String(m.from_phone || ''),
      text: (m.text || '').trim(),
      at: m.received_at || null,
    }))
    .filter((m) => m.text);

  const heads = accepted.reduce((n, e) => n + e.heads, 0);
  const adults = accepted.reduce((n, e) => n + e.adults, 0);
  const children = accepted.reduce((n, e) => n + e.children, 0);

  const totalGuests = accepted.length + declined.length + noResponse.length;
  const pct = (n) => (totalGuests ? Math.round((n / totalGuests) * 1000) / 10 : 0);

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
      shuttle: computeShuttle(accepted),
    },
    recent,
    notes,
    inbox,
    accepted,
    declined,
    noResponse,
    orphans,
  };
}
