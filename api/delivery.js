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

// Pure aggregation — exported for unit testing without a DB.
//
// Two-level collapse so a later successful resend overrides an earlier failure:
//   1. Group events by message (wa_message_id) and reduce each message to its
//      furthest-along status (failed is terminal for THAT message).
//   2. For each phone, report its MOST RECENT message. So if a MARKETING invite
//      failed and a later UTILITY resend to the same number delivered, the phone
//      shows "delivered" — the stale failure no longer masks the success.
export function summarizeDelivery(rows) {
  const nameByPhone = {};
  for (const g of Object.values(GUESTS)) nameByPhone[toE164(g.phone)] = g.name;

  // phone → (wa_message_id → collapsed message {status,error,bestRank,lastAt})
  const perPhone = {};
  for (const r of rows) {
    const phone = r.recipient_phone;
    const mid = r.wa_message_id || '_'; // legacy rows without an id collapse to one
    const rank = RANK[r.status] || 0;
    const msgs = (perPhone[phone] ||= {});
    const msg = msgs[mid];
    if (!msg) {
      msgs[mid] = { status: r.status, error_code: r.error_code, error_title: r.error_title, bestRank: rank, lastAt: r.at };
    } else {
      if (rank > msg.bestRank) { msg.status = r.status; msg.error_code = r.error_code; msg.error_title = r.error_title; msg.bestRank = rank; }
      if ((r.at || '') > (msg.lastAt || '')) msg.lastAt = r.at;
    }
  }

  const guests = Object.entries(perPhone).map(([phone, msgs]) => {
    // The phone's latest message wins (newest activity), so a later resend overrides an older one.
    const chosen = Object.values(msgs).sort((a, b) => (b.lastAt || '').localeCompare(a.lastAt || ''))[0];
    return {
      phone,
      name: nameByPhone[phone] || '(unknown)',
      status: chosen.status,
      error: chosen.error_title ? `${chosen.error_code} ${chosen.error_title}` : null,
      at: chosen.lastAt,
    };
  }).sort((a, b) => (b.at || '').localeCompare(a.at || ''));

  const counts = { sent: 0, delivered: 0, read: 0, failed: 0 };
  for (const g of guests) if (g.status in counts) counts[g.status]++;

  return { total: guests.length, counts, guests };
}
