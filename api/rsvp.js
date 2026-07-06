// /api/rsvp — Vercel serverless function with verbose logging.
// Every request logs its journey; read them in Vercel → your project → Logs.

export default async function handler(req, res) {
  const t0 = Date.now();
  console.log('[rsvp] --- request start ---');
  console.log('[rsvp] method:', req.method);

  // 1) environment check
  const envStatus = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
  };
  console.log('[rsvp] env vars present:', JSON.stringify(envStatus));
  const missing = Object.keys(envStatus).filter(k => !envStatus[k]);
  if (missing.length) {
    console.error('[rsvp] FAIL: missing env vars:', missing.join(', '), '→ add them in Vercel Settings → Environment Variables, then REDEPLOY');
    return res.status(500).json({ error: 'server not configured', missing });
  }
  console.log('[rsvp] supabase url host:', new URL(process.env.SUPABASE_URL).host);

  if (req.method !== 'POST') {
    console.warn('[rsvp] FAIL: wrong method (expected POST)');
    return res.status(405).json({ error: 'method not allowed' });
  }

  // 2) payload check
  const body = req.body || {};
  console.log('[rsvp] payload:', JSON.stringify({
    name: body.name ? `"${String(body.name).slice(0, 30)}"` : '(empty)',
    phone: body.phone ? `${String(body.phone).replace(/\d(?=\d{3})/g, '*')}` : '(empty)',
    attending: body.attending,
    adults: body.adults,
    children: body.children,
    pickup: body.pickup,
    notes_len: (body.notes || '').length,
    guest_id: body.guest_id || null,
  }));

  const { guest_id, name, display_name, phone, attending, adults, children, pickup, notes } = body;
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    console.warn('[rsvp] FAIL validation: name');
    return res.status(400).json({ error: 'missing name' });
  }
  if (!phone || typeof phone !== 'string' || phone.replace(/\D/g, '').length < 9) {
    console.warn('[rsvp] FAIL validation: phone');
    return res.status(400).json({ error: 'missing phone' });
  }
  if (attending !== 'yes' && attending !== 'no') {
    console.warn('[rsvp] FAIL validation: attending =', attending);
    return res.status(400).json({ error: 'bad attending value' });
  }
  console.log('[rsvp] validation passed');

  // one record per guest: use the guest code as the conflict key. Guests without
  // a personal link fall back to a stable id derived from their phone number.
  const conflictKey = (guest_id && String(guest_id).trim())
    || 'phone:' + phone.replace(/\D/g, '');

  const row = {
    guest_id: conflictKey,
    name: name.trim().slice(0, 100),                 // full name (to DB)
    display_name: (display_name || name).trim().slice(0, 100), // display / nickname
    phone: phone.trim().slice(0, 20),
    attending,
    adults: clampInt(adults, 0, 15),
    children: clampInt(children, 0, 15),
    pickup: ['tlv_after', 'tlv_noafter', ''].includes(pickup) ? pickup : '',
    notes: (notes || '').toString().slice(0, 500),
    updated_at: new Date().toISOString(),
  };

  // 3) upsert into Supabase — one row per guest_id; a re-submit REPLACES the row.
  // (requires a UNIQUE constraint on rsvps.guest_id — see schema note below.)
  const url = `${process.env.SUPABASE_URL}/rest/v1/rsvps?on_conflict=guest_id`;
  console.log('[rsvp] upserting into:', url, 'key:', conflictKey);
  let resp;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        // merge-duplicates => INSERT or UPDATE on guest_id conflict (replace)
        Prefer: 'return=minimal,resolution=merge-duplicates',
      },
      body: JSON.stringify(row),
    });
  } catch (err) {
    console.error('[rsvp] FAIL: network error reaching Supabase:', err.message);
    return res.status(502).json({ error: 'db unreachable' });
  }

  console.log('[rsvp] supabase responded:', resp.status, resp.statusText);
  if (!resp.ok) {
    const detail = await resp.text();
    console.error('[rsvp] FAIL: supabase rejected the insert. Full response:', detail);
    console.error('[rsvp] common causes: 401/403 = wrong key (must be service_role/secret, not anon/publishable); 404 = table "rsvps" does not exist (run schema.sql in SQL Editor); 42501 in body = RLS blocking (key is anon)');
    return res.status(502).json({ error: 'db insert failed' });
  }

  console.log(`[rsvp] SUCCESS: row saved (${Date.now() - t0}ms) ---`);
  return res.status(200).json({ ok: true });
}

function clampInt(v, min, max) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}
