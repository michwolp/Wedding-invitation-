// /api/messages — read-only view of the WhatsApp replies guests sent to the
// business number (captured by /api/whatsapp-webhook into `whatsapp_messages`).
//
// GET /api/messages?key=<SUMMARY_KEY>  → newest-first list of replies, each
// tagged with the guest's name from our own list (not WhatsApp's profile name).
// Gated by the same SUMMARY_KEY as /api/rsvp-summary so it isn't world-readable.

import { GUESTS } from '../src/guests.js';

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

  const url = `${process.env.SUPABASE_URL}/rest/v1/whatsapp_messages`
    + `?select=from_name,from_phone,type,text,sent_at,received_at`
    + `&order=received_at.desc&limit=200`;
  try {
    const resp = await fetch(url, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    });
    if (!resp.ok) return res.status(502).json({ error: 'db error' });
    const rows = await resp.json();
    const messages = withNames(rows);
    return res.status(200).json({ count: messages.length, messages });
  } catch (err) {
    return res.status(502).json({ error: 'db unreachable' });
  }
}

// Convert a stored guest phone to E.164 digits (no +), matching what WhatsApp
// puts in a message's `from`. Mirrors scripts/send.js toE164().
function toE164(phone) {
  const p = String(phone).trim();
  if (p.startsWith('+')) return p.slice(1).replace(/\D/g, '');
  const digits = p.replace(/\D/g, '');
  if (digits.startsWith('0')) return '972' + digits.slice(1);
  return digits;
}

// Attach the guest name from our own list (falling back to WhatsApp's profile
// name), and drop internal debug/RAW rows. Exported for testing without a DB.
export function withNames(rows) {
  const nameByPhone = {};
  for (const g of Object.values(GUESTS)) nameByPhone[toE164(g.phone)] = g.name;

  return rows
    .filter((r) => r.type !== 'debug')
    .map((r) => ({
      name: nameByPhone[r.from_phone] || r.from_name || '(unknown)',
      ...r,
    }));
}
