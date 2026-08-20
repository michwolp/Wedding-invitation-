// /api/rsvp-list — read-only RSVP roster for the private dashboard.
// GET /api/rsvp-list?key=<SUMMARY_KEY>
//   → { counts, recent[], accepted[], declined[], noResponse[], orphans[] }
//
// READ-ONLY: performs SELECT queries against the rsvps and whatsapp_messages
// tables. It never inserts, updates, upserts, or deletes. Gated by SUMMARY_KEY
// (same as /api/rsvp-summary); if SUMMARY_KEY is unset the endpoint returns 404.
//
// The roster-building logic lives in src/roster.js (pure, unit-tested); this
// file only fetches data and supplies the code→category map from guests.js.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GUESTS } from '../src/guests.js';
import { buildRoster } from '../src/roster.js';

// Parse the "// --- Category ---" section headers out of the guests source so
// each guest can be grouped. Best-effort: if the source can't be read at
// runtime, everyone falls back to 'Other' and the dashboard still works.
export function categoryMap() {
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

  return res.status(200).json(buildRoster(rows, messages, categoryMap()));
}
