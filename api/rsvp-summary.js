// /api/rsvp-summary — read-only RSVP dashboard in JSON.
// GET /api/rsvp-summary  → aggregate counts for the whole guest list.
//
// Protected by a token so it isn't world-readable: pass ?key=<SUMMARY_KEY>
// (set SUMMARY_KEY in Vercel env). If SUMMARY_KEY is unset, the endpoint is
// disabled (returns 404) rather than leaking data.

import { parsePickup } from '../src/pickup.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const envOk = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY;
  if (!envOk) {
    return res.status(500).json({ error: 'server not configured' });
  }

  // gate: require a matching key. No key configured → endpoint off.
  const gate = process.env.SUMMARY_KEY;
  if (!gate || req.query.key !== gate) {
    return res.status(404).json({ error: 'not found' });
  }

  const url = `${process.env.SUPABASE_URL}/rest/v1/rsvps?select=attending,adults,children,pickup,display_name,notes`;

  let rows;
  try {
    const resp = await fetch(url, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    });
    if (!resp.ok) return res.status(502).json({ error: 'db error' });
    rows = await resp.json();
  } catch (err) {
    return res.status(502).json({ error: 'db unreachable' });
  }

  return res.status(200).json(summarize(rows));
}

// Pure aggregation — exported so it can be unit-tested without a DB.
export function summarize(rows) {
  const s = {
    responded: rows.length,
    yes: 0,
    no: 0,
    guestsAttending: 0, // total heads (adults + children) among "yes"
    adults: 0,
    children: 0,
    withNotes: 0,
    shuttle: {
      // per city: how many parties need a ride TO, and returns split by leg
      tlv: { to: 0, retBefore: 0, retAfter: 0 },
      rhv: { to: 0, retBefore: 0, retAfter: 0 },
      none: 0, // attending but no shuttle
    },
  };

  for (const r of rows) {
    if (r.attending === 'yes') {
      s.yes++;
      const a = Number(r.adults) || 0;
      const c = Number(r.children) || 0;
      s.adults += a;
      s.children += c;
      s.guestsAttending += a + c;

      const { city, to, ret } = parsePickup(r.pickup);
      if (!city) {
        s.shuttle.none++;
      } else {
        if (to) s.shuttle[city].to++;
        if (ret === 'noafter') s.shuttle[city].retBefore++;
        if (ret === 'after') s.shuttle[city].retAfter++;
      }
    } else {
      s.no++;
    }
    if (r.notes && String(r.notes).trim()) s.withNotes++;
  }

  return s;
}
