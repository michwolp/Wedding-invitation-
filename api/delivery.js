// /api/delivery — did each guest get the invite? Shows the furthest-along
// delivery status per recipient (sent → delivered → read, or failed + reason),
// captured by /api/whatsapp-webhook into `whatsapp_status`.
//
// GET /api/delivery?key=<SUMMARY_KEY>  → per-guest status, newest first.
// Gated by the same SUMMARY_KEY as /api/rsvp-summary.

import { GUESTS } from '../src/guests.js';

// Rank so we can collapse a message's many status events to the best one it
// reached. failed is terminal and most important to surface.
const RANK = { failed: 4, read: 3, delivered: 2, sent: 1 };

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'server not configured' });
  }
  const gate = process.env.SUMMARY_KEY;
  if (!gate || req.query.key !== gate) {
    return res.status(404).json({ error: 'not found' });
  }

  // Debug: raw per-message event timeline for specific phones, so a later
  // delivered/read isn't masked by an earlier failed on the same number.
  // GET /api/delivery?key=...&raw=1&phones=<comma-separated E.164 digits>
  const rawPhones = req.query.raw ? String(req.query.phones || '').split(',').map((s) => s.trim()).filter(Boolean) : null;

  const url = `${process.env.SUPABASE_URL}/rest/v1/whatsapp_status`
    + `?select=wa_message_id,recipient_phone,status,error_code,error_title,at`
    + `&order=at.desc&limit=2000`;
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

  if (rawPhones) {
    const want = new Set(rawPhones);
    const events = rows
      .filter((r) => want.has(r.recipient_phone))
      .map((r) => ({ phone: r.recipient_phone, wamid: r.wa_message_id, status: r.status, error: r.error_title ? `${r.error_code} ${r.error_title}` : null, at: r.at }));
    return res.status(200).json({ events });
  }

  return res.status(200).json(summarizeDelivery(rows));
}

// Convert a stored guest phone to E.164 digits (no +), matching what WhatsApp
// puts in `recipient_id`. Mirrors scripts/send.js toE164().
function toE164(phone) {
  const p = String(phone).trim();
  if (p.startsWith('+')) return p.slice(1).replace(/\D/g, '');
  const digits = p.replace(/\D/g, '');
  if (digits.startsWith('0')) return '972' + digits.slice(1);
  return digits;
}

// Pure aggregation — exported for unit testing without a DB. Collapses each
// recipient to their best-reached status and attaches the guest's name.
export function summarizeDelivery(rows) {
  const nameByPhone = {};
  for (const g of Object.values(GUESTS)) nameByPhone[toE164(g.phone)] = g.name;

  const best = {}; // phone → chosen status row
  for (const r of rows) {
    const cur = best[r.recipient_phone];
    if (!cur || (RANK[r.status] || 0) > (RANK[cur.status] || 0)) {
      best[r.recipient_phone] = r;
    }
  }

  const guests = Object.entries(best).map(([phone, r]) => ({
    phone,
    name: nameByPhone[phone] || '(unknown)',
    status: r.status,
    error: r.error_title ? `${r.error_code} ${r.error_title}` : null,
    at: r.at,
  })).sort((a, b) => (b.at || '').localeCompare(a.at || ''));

  const counts = { sent: 0, delivered: 0, read: 0, failed: 0 };
  for (const g of guests) if (g.status in counts) counts[g.status]++;

  return { total: guests.length, counts, guests };
}
