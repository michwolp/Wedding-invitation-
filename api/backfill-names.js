// /api/backfill-names — fill missing recipient_name / recipient_full_name in
// whatsapp_status from the CURRENT guest list (by phone).
//
// recipient_name / recipient_full_name are denormalized copies the webhook
// looks up from the guest list when an event arrives. If a guest's number
// changed (or the column was just added), older rows can be null. This fills
// them. Idempotent: only touches rows where the target column is null.
//
// Requires the whatsapp_status table to have a `recipient_full_name` text
// column (see the ALTER TABLE in the deploy notes).
//
// GET /api/backfill-names?key=<SUMMARY_KEY>            → dry-run (counts only)
// GET /api/backfill-names?key=<SUMMARY_KEY>&apply=1    → actually write

import { GUESTS } from '../src/guests.js';

function toE164(phone) {
  const p = String(phone).trim();
  if (p.startsWith('+')) return p.slice(1).replace(/\D/g, '');
  const digits = p.replace(/\D/g, '');
  if (digits.startsWith('0')) return '972' + digits.slice(1);
  return digits;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'server not configured' });
  }
  const gate = process.env.SUMMARY_KEY;
  if (!gate || req.query.key !== gate) return res.status(404).json({ error: 'not found' });

  const apply = !!req.query.apply;
  const base = process.env.SUPABASE_URL;
  const authHeaders = {
    apikey: process.env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
  };

  const nameByPhone = {};
  const fullNameByPhone = {};
  for (const g of Object.values(GUESTS)) {
    nameByPhone[toE164(g.phone)] = g.name;
    fullNameByPhone[toE164(g.phone)] = g.fullName || null;
  }

  // All distinct phones that have any status row (so we can fill both columns
  // wherever they're null — recipient_full_name is null on every legacy row).
  let rows;
  try {
    const resp = await fetch(
      `${base}/rest/v1/whatsapp_status?select=recipient_phone,recipient_name,recipient_full_name&limit=5000`,
      { headers: authHeaders });
    if (!resp.ok) return res.status(502).json({ error: 'db read failed', status: resp.status });
    rows = await resp.json();
  } catch (err) {
    return res.status(502).json({ error: 'db unreachable' });
  }

  // Per phone: how many rows still need name / full_name.
  const need = {}; // phone -> { name: n, full: n }
  for (const r of rows) {
    const p = r.recipient_phone;
    (need[p] ||= { name: 0, full: 0 });
    if (r.recipient_name == null) need[p].name++;
    if (r.recipient_full_name == null) need[p].full++;
  }

  const planned = [];
  const skipped = [];
  for (const [phone, n] of Object.entries(need)) {
    if (n.name === 0 && n.full === 0) continue;
    const name = nameByPhone[phone];
    const fullName = fullNameByPhone[phone];
    if (name == null && fullName == null) {
      skipped.push({ phone, reason: 'phone not in guest list', nullName: n.name, nullFull: n.full });
      continue;
    }
    planned.push({ phone, name: name || null, fullName: fullName || null, nullName: n.name, nullFull: n.full });
  }

  async function patch(phone, column, value) {
    const resp = await fetch(
      `${base}/rest/v1/whatsapp_status?recipient_phone=eq.${encodeURIComponent(phone)}&${column}=is.null`,
      {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ [column]: value }),
      });
    return resp.ok ? (await resp.json()).length : 0;
  }

  let applied = [];
  if (apply) {
    for (const p of planned) {
      const out = { phone: p.phone, updatedName: 0, updatedFull: 0 };
      if (p.nullName && p.name != null) out.updatedName = await patch(p.phone, 'recipient_name', p.name);
      if (p.nullFull && p.fullName != null) out.updatedFull = await patch(p.phone, 'recipient_full_name', p.fullName);
      applied.push(out);
    }
  }

  return res.status(200).json({
    mode: apply ? 'applied' : 'dry-run',
    totalRows: rows.length,
    plannedPhones: planned.length,
    planned,
    skipped,
    ...(apply ? {
      applied,
      updatedNameTotal: applied.reduce((n, a) => n + a.updatedName, 0),
      updatedFullTotal: applied.reduce((n, a) => n + a.updatedFull, 0),
    } : {}),
    note: apply ? 'done' : 'add &apply=1 to write these names',
  });
}
