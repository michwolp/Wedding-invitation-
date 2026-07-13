// /api/rsvp-status — check if a guest already submitted an RSVP.
// GET /api/rsvp-status?guest_id=CODE → { exists: true/false, attending?: 'yes'|'no' }

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const guestId = req.query.guest_id;
  if (!guestId) {
    return res.status(400).json({ error: 'missing guest_id' });
  }

  const envOk = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY;
  if (!envOk) {
    return res.status(500).json({ error: 'server not configured' });
  }

  const url = `${process.env.SUPABASE_URL}/rest/v1/rsvps?guest_id=eq.${encodeURIComponent(guestId)}&select=attending`;

  try {
    const resp = await fetch(url, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    });
    if (!resp.ok) {
      return res.status(502).json({ error: 'db error' });
    }
    const rows = await resp.json();
    if (rows.length > 0) {
      return res.status(200).json({ exists: true, attending: rows[0].attending });
    }
    return res.status(200).json({ exists: false });
  } catch (err) {
    return res.status(502).json({ error: 'db unreachable' });
  }
}
