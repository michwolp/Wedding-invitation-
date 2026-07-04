// /api/rsvp — Vercel serverless function
// Receives the RSVP form JSON and inserts a row into Supabase.

export default async function handler(req, res) {
  // guard: fail loudly if env vars didn't reach this deployment
  const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'].filter(k => !process.env[k]);
  if (missing.length) {
    console.error('Missing environment variables:', missing.join(', '));
    return res.status(500).json({ error: 'server not configured', missing });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { guest_id, name, phone, attending, adults, children, pickup, notes } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'missing name' });
  }
  if (!phone || typeof phone !== 'string' || phone.replace(/\D/g, '').length < 9) {
    return res.status(400).json({ error: 'missing phone' });
  }
  if (attending !== 'yes' && attending !== 'no') {
    return res.status(400).json({ error: 'bad attending value' });
  }

  const row = {
    guest_id: guest_id || null,
    name: name.trim().slice(0, 100),
    phone: phone.trim().slice(0, 20),
    attending,
    adults: clampInt(adults, 0, 15),
    children: clampInt(children, 0, 15),
    pickup: ['tlv_after', 'tlv_noafter', ''].includes(pickup) ? pickup : '',
    notes: (notes || '').toString().slice(0, 500),
  };

  const resp = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rsvps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: process.env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    console.error('supabase insert failed:', resp.status, detail);
    return res.status(502).json({ error: 'db insert failed' });
  }

  return res.status(200).json({ ok: true });
}

function clampInt(v, min, max) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}
